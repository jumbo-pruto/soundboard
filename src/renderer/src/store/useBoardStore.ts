import { create } from 'zustand'
import { nanoid } from 'nanoid'
import {
  Board,
  ButtonState,
  CanvasRect,
  EMPTY_BOARD,
  ScannedFile,
  TextBoxState
} from '@shared/types'
import { useUIStore } from './useUIStore'

export type TabStatus = 'loading' | 'ready' | 'missing' | 'error'

export interface TabData {
  folder: string
  files: ScannedFile[]
  board: Board
  status: TabStatus
}

const CANVAS_COLS = 6
const BTN_W = 170
const BTN_H = 76
const GAP = 16
const MARGIN = 24

export function defaultCanvasRect(index: number): CanvasRect {
  const col = index % CANVAS_COLS
  const row = Math.floor(index / CANVAS_COLS)
  return { x: MARGIN + col * (BTN_W + GAP), y: MARGIN + row * (BTN_H + GAP), w: BTN_W, h: BTN_H }
}

function defaultButton(index: number): ButtonState {
  return {
    id: nanoid(8),
    label: null,
    color: null,
    order: index,
    hotkey: null,
    favorite: false,
    hidden: false,
    volume: 1,
    rate: 1,
    canvas: defaultCanvasRect(index)
  }
}

/** Merge what's on disk (files) with what's saved (board). New files get defaults; saved-but-missing files are kept untouched. */
function reconcile(files: ScannedFile[], saved: Board | null): { board: Board; changed: boolean } {
  const board: Board = saved
    ? {
        ...EMPTY_BOARD,
        ...saved,
        tab: { ...EMPTY_BOARD.tab, ...(saved.tab ?? {}) },
        buttons: { ...(saved.buttons ?? {}) },
        textBoxes: [...(saved.textBoxes ?? [])]
      }
    : { ...EMPTY_BOARD, tab: { ...EMPTY_BOARD.tab }, buttons: {}, textBoxes: [] }

  let changed = !saved
  let known = Object.keys(board.buttons).length
  let maxOrder = Object.values(board.buttons).reduce((m, b) => Math.max(m, b.order), -1)

  for (const f of files) {
    const existing = board.buttons[f.key]
    if (!existing) {
      const fresh = defaultButton(known)
      fresh.order = ++maxOrder
      board.buttons[f.key] = fresh
      known++
      changed = true
    } else {
      // forward-compat: fill any fields added in later versions
      const merged = { ...defaultButton(existing.order), ...existing }
      if (Object.keys(merged).length !== Object.keys(existing).length) {
        board.buttons[f.key] = merged
        changed = true
      }
    }
  }
  return { board, changed }
}

interface BoardState {
  tabs: Record<string, TabData>

  loadTab: (folder: string) => Promise<void>
  rescan: (folder: string) => Promise<void>
  removeTab: (folder: string) => void

  patchButton: (folder: string, key: string, patch: Partial<ButtonState>) => void
  patchTab: (folder: string, patch: Partial<Board['tab']>) => void
  setOrder: (folder: string, orderedKeys: string[]) => void
  autoArrangeCanvas: (folder: string) => void

  addTextBox: (folder: string, partial?: Partial<TextBoxState>) => string
  patchTextBox: (folder: string, id: string, patch: Partial<TextBoxState>) => void
  removeTextBox: (folder: string, id: string) => void

  flushAll: () => Promise<void>
}

const saveTimers = new Map<string, ReturnType<typeof setTimeout>>()

export const useBoardStore = create<BoardState>((set, get) => {
  const writeNow = async (folder: string): Promise<void> => {
    const tab = get().tabs[folder]
    // never persist a placeholder board: only tabs that were really loaded from disk are saved
    if (!tab || tab.status !== 'ready') return
    try {
      await window.api.writeBoard(folder, tab.board)
    } catch (err) {
      console.error('writeBoard failed', folder, err)
      useUIStore.getState().showToast('Could not save layout to .soundboard/ (is the folder read-only?)')
    }
  }

  const scheduleSave = (folder: string): void => {
    clearTimeout(saveTimers.get(folder))
    saveTimers.set(
      folder,
      setTimeout(() => {
        saveTimers.delete(folder)
        void writeNow(folder)
      }, 500)
    )
  }

  const updateBoard = (folder: string, fn: (b: Board) => Board): void => {
    const tab = get().tabs[folder]
    if (!tab) return
    set({ tabs: { ...get().tabs, [folder]: { ...tab, board: fn(tab.board) } } })
    scheduleSave(folder)
  }

  return {
    tabs: {},

    loadTab: async (folder) => {
      set({
        tabs: {
          ...get().tabs,
          [folder]: get().tabs[folder] ?? {
            folder,
            files: [],
            board: { ...EMPTY_BOARD, buttons: {}, textBoxes: [] },
            status: 'loading'
          }
        }
      })
      if (!(await window.api.folderExists(folder))) {
        const cur = get().tabs[folder]
        set({ tabs: { ...get().tabs, [folder]: { ...cur, status: 'missing' } } })
        return
      }
      try {
        const exts = useUIStore.getState().config.audioExts
        const [files, saved] = await Promise.all([
          window.api.scanFolder(folder, exts),
          window.api.readBoard(folder)
        ])
        const { board, changed } = reconcile(files, saved)
        set({ tabs: { ...get().tabs, [folder]: { folder, files, board, status: 'ready' } } })
        if (changed) scheduleSave(folder)
        if (useUIStore.getState().config.watchFolders) void window.api.watchFolder(folder)
      } catch (err) {
        console.error('loadTab failed', folder, err)
        const cur = get().tabs[folder]
        set({ tabs: { ...get().tabs, [folder]: { ...cur, status: 'error' } } })
      }
    },

    rescan: async (folder) => {
      const tab = get().tabs[folder]
      if (!tab) return
      // A tab that never finished loading has no trustworthy in-memory board; go back to disk
      // instead of reconciling against an empty one (which would overwrite the saved layout).
      if (tab.status !== 'ready') return get().loadTab(folder)
      if (!(await window.api.folderExists(folder))) {
        set({ tabs: { ...get().tabs, [folder]: { ...tab, status: 'missing' } } })
        return
      }
      try {
        const exts = useUIStore.getState().config.audioExts
        const files = await window.api.scanFolder(folder, exts)
        // reconcile against the in-memory board (already has unsaved edits) rather than re-reading disk
        const { board, changed } = reconcile(files, tab.board)
        set({ tabs: { ...get().tabs, [folder]: { folder, files, board, status: 'ready' } } })
        if (changed) scheduleSave(folder)
      } catch (err) {
        console.error('rescan failed', folder, err)
      }
    },

    removeTab: (folder) => {
      // make sure pending edits land on disk before we forget the tab
      if (saveTimers.has(folder)) {
        clearTimeout(saveTimers.get(folder))
        saveTimers.delete(folder)
        void writeNow(folder)
      }
      void window.api.unwatchFolder(folder)
      const tabs = { ...get().tabs }
      delete tabs[folder]
      set({ tabs })
    },

    patchButton: (folder, key, patch) =>
      updateBoard(folder, (b) =>
        b.buttons[key] ? { ...b, buttons: { ...b.buttons, [key]: { ...b.buttons[key], ...patch } } } : b
      ),

    patchTab: (folder, patch) => updateBoard(folder, (b) => ({ ...b, tab: { ...b.tab, ...patch } })),

    setOrder: (folder, orderedKeys) =>
      updateBoard(folder, (b) => {
        const buttons = { ...b.buttons }
        orderedKeys.forEach((key, i) => {
          if (buttons[key]) buttons[key] = { ...buttons[key], order: i }
        })
        return { ...b, buttons }
      }),

    autoArrangeCanvas: (folder) => {
      const tab = get().tabs[folder]
      if (!tab) return
      const keys = tab.files
        .map((f) => f.key)
        .sort((a, b) => (tab.board.buttons[a]?.order ?? 0) - (tab.board.buttons[b]?.order ?? 0))
      updateBoard(folder, (b) => {
        const buttons = { ...b.buttons }
        keys.forEach((key, i) => {
          if (buttons[key]) buttons[key] = { ...buttons[key], canvas: defaultCanvasRect(i) }
        })
        return { ...b, buttons }
      })
    },

    addTextBox: (folder, partial) => {
      const id = nanoid(8)
      // drop the new box in free space below everything else, so it never spawns hidden under a button
      const tab = get().tabs[folder]
      let bottom = 0
      if (tab) {
        for (const b of Object.values(tab.board.buttons)) bottom = Math.max(bottom, b.canvas.y + b.canvas.h)
        for (const t of tab.board.textBoxes) bottom = Math.max(bottom, t.y + t.h)
      }
      const box: TextBoxState = {
        id,
        text: 'New note',
        x: MARGIN,
        y: bottom + MARGIN,
        w: 220,
        h: 44,
        fontSize: 18,
        color: '#ffffff',
        bg: 'transparent',
        ...partial
      }
      updateBoard(folder, (b) => ({ ...b, textBoxes: [...b.textBoxes, box] }))
      return id
    },

    patchTextBox: (folder, id, patch) =>
      updateBoard(folder, (b) => ({
        ...b,
        textBoxes: b.textBoxes.map((t) => (t.id === id ? { ...t, ...patch } : t))
      })),

    removeTextBox: (folder, id) =>
      updateBoard(folder, (b) => ({ ...b, textBoxes: b.textBoxes.filter((t) => t.id !== id) })),

    flushAll: async () => {
      const pending = [...saveTimers.keys()]
      for (const folder of pending) {
        clearTimeout(saveTimers.get(folder))
        saveTimers.delete(folder)
      }
      await Promise.all(pending.map((f) => writeNow(f)))
    }
  }
})
