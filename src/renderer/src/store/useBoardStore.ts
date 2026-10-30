import { create } from 'zustand'
import { nanoid } from 'nanoid'
import {
  Board,
  ButtonState,
  CanvasLayout,
  CanvasRect,
  DEFAULT_TEXTBOX_ALIGN,
  EMPTY_BOARD,
  LayoutButton,
  ScannedFile,
  TextBoxState
} from '@shared/types'
import { AlignRect, CanvasOp, computeAlign } from '../utils/align'
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
    canvas: defaultCanvasRect(index),
    canvasFontSize: null,
    retrigger: 'default'
  }
}

// ---------- saved-layout helpers ----------

function layoutButtonsFromLive(board: Board): Record<string, LayoutButton> {
  const out: Record<string, LayoutButton> = {}
  for (const [key, b] of Object.entries(board.buttons)) {
    out[key] = { x: b.canvas.x, y: b.canvas.y, w: b.canvas.w, h: b.canvas.h, fontSize: b.canvasFontSize }
  }
  return out
}

function snapshotLayout(board: Board, id: string, name: string): CanvasLayout {
  return { id, name, buttons: layoutButtonsFromLive(board), textBoxes: board.textBoxes.map((t) => ({ ...t })) }
}

/** Board with the active layout entry updated to match the current live canvas. */
function syncActiveLayout(board: Board): Board {
  if (!board.activeLayoutId) return board
  const idx = board.layouts.findIndex((l) => l.id === board.activeLayoutId)
  if (idx < 0) return board
  const layouts = [...board.layouts]
  layouts[idx] = {
    ...layouts[idx],
    buttons: layoutButtonsFromLive(board),
    textBoxes: board.textBoxes.map((t) => ({ ...t }))
  }
  return { ...board, layouts }
}

/** Board with the live canvas set from a layout (keys missing from the layout keep their current geometry). */
function applyLayoutToLive(board: Board, layout: CanvasLayout): Board {
  const buttons = { ...board.buttons }
  for (const [key, b] of Object.entries(buttons)) {
    const lb = layout.buttons[key]
    if (lb) buttons[key] = { ...b, canvas: { x: lb.x, y: lb.y, w: lb.w, h: lb.h }, canvasFontSize: lb.fontSize }
  }
  return {
    ...board,
    buttons,
    textBoxes: layout.textBoxes.map((t) => ({ ...DEFAULT_TEXTBOX_ALIGN, ...t })),
    activeLayoutId: layout.id
  }
}

/** Merge what's on disk (files) with what's saved (board). New files get defaults; saved-but-missing files are kept untouched. */
function reconcile(files: ScannedFile[], saved: Board | null): { board: Board; changed: boolean } {
  const board: Board = saved
    ? {
        ...EMPTY_BOARD,
        ...saved,
        version: 2,
        tab: { ...EMPTY_BOARD.tab, ...(saved.tab ?? {}) },
        buttons: { ...(saved.buttons ?? {}) },
        textBoxes: [...(saved.textBoxes ?? [])],
        layouts: [...(saved.layouts ?? [])],
        activeLayoutId: saved.activeLayoutId ?? null
      }
    : { ...EMPTY_BOARD, tab: { ...EMPTY_BOARD.tab }, buttons: {}, textBoxes: [], layouts: [], activeLayoutId: null }

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

  // v1 -> v2: text boxes gain align/valign
  const normBoxes = board.textBoxes.map((t) => ({ ...DEFAULT_TEXTBOX_ALIGN, ...t }))
  if (normBoxes.some((t, i) => Object.keys(t).length !== Object.keys(board.textBoxes[i]).length)) {
    board.textBoxes = normBoxes
    changed = true
  }

  // ensure a selectable "Default" layout always exists
  if (board.layouts.length === 0) {
    const layout = snapshotLayout(board, nanoid(8), 'Default')
    board.layouts = [layout]
    board.activeLayoutId = layout.id
    changed = true
  } else if (!board.activeLayoutId || !board.layouts.some((l) => l.id === board.activeLayoutId)) {
    board.activeLayoutId = board.layouts[0].id
    changed = true
  }

  return { board, changed }
}

interface BoardState {
  tabs: Record<string, TabData>

  loadTab: (folder: string) => Promise<void>
  rescan: (folder: string) => Promise<void>
  removeTab: (folder: string) => void

  patchButton: (folder: string, key: string, patch: Partial<ButtonState>) => void
  patchButtons: (folder: string, keys: string[], patch: Partial<ButtonState>) => void
  patchTab: (folder: string, patch: Partial<Board['tab']>) => void
  setOrder: (folder: string, orderedKeys: string[]) => void
  autoArrangeCanvas: (folder: string) => void

  addTextBox: (folder: string, partial?: Partial<TextBoxState>) => string
  patchTextBox: (folder: string, id: string, patch: Partial<TextBoxState>) => void
  removeTextBox: (folder: string, id: string) => void

  // saved canvas layouts
  applyLayout: (folder: string, id: string) => void
  createLayout: (folder: string, name: string) => string
  renameLayout: (folder: string, id: string, name: string) => void
  deleteLayout: (folder: string, id: string) => void

  // canvas multi-item ops
  nudgeCanvas: (folder: string, keys: string[], textIds: string[], dx: number, dy: number) => void
  applyCanvasOp: (folder: string, keys: string[], textIds: string[], op: CanvasOp) => void

  // undo / redo (per folder; not persisted)
  undo: (folder: string) => void
  redo: (folder: string) => void

  flushAll: () => Promise<void>
}

// ---------- undo/redo history (module-level so it doesn't trigger re-renders) ----------
const history = new Map<string, { past: Board[]; future: Board[] }>()
const lastCoalesce = new Map<string, { key: string; t: number }>()
const HISTORY_LIMIT = 60

function pushHistory(folder: string, board: Board, coalesceKey?: string): void {
  const now = Date.now()
  if (coalesceKey) {
    const prev = lastCoalesce.get(folder)
    lastCoalesce.set(folder, { key: coalesceKey, t: now })
    // repeated edits of the same control within 700ms collapse into one undo step
    if (prev && prev.key === coalesceKey && now - prev.t < 700) return
  } else {
    lastCoalesce.delete(folder)
  }
  const h = history.get(folder) ?? { past: [], future: [] }
  h.past.push(board)
  if (h.past.length > HISTORY_LIMIT) h.past.shift()
  h.future = []
  history.set(folder, h)
}

export function clearHistory(folder: string): void {
  history.delete(folder)
  lastCoalesce.delete(folder)
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

  const updateBoard = (
    folder: string,
    fn: (b: Board) => Board,
    sync = false,
    coalesceKey?: string
  ): void => {
    const tab = get().tabs[folder]
    if (!tab || tab.status !== 'ready') return
    // snapshot the pre-edit board for undo (rapid same-control edits coalesce)
    pushHistory(folder, tab.board, coalesceKey)
    let board = fn(tab.board)
    // mirror live canvas edits into the currently selected layout
    if (sync) board = syncActiveLayout(board)
    set({ tabs: { ...get().tabs, [folder]: { ...tab, board } } })
    scheduleSave(folder)
  }

  /** Replace the board without recording history (used by undo/redo themselves). */
  const setBoard = (folder: string, board: Board): void => {
    const tab = get().tabs[folder]
    if (!tab) return
    set({ tabs: { ...get().tabs, [folder]: { ...tab, board } } })
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
      clearHistory(folder)
      const tabs = { ...get().tabs }
      delete tabs[folder]
      set({ tabs })
    },

    patchButton: (folder, key, patch) =>
      updateBoard(
        folder,
        (b) =>
          b.buttons[key] ? { ...b, buttons: { ...b.buttons, [key]: { ...b.buttons[key], ...patch } } } : b,
        'canvas' in patch || 'canvasFontSize' in patch,
        `${key}:${Object.keys(patch).sort().join(',')}`
      ),

    patchButtons: (folder, keys, patch) =>
      updateBoard(
        folder,
        (b) => {
          const buttons = { ...b.buttons }
          for (const key of keys) if (buttons[key]) buttons[key] = { ...buttons[key], ...patch }
          return { ...b, buttons }
        },
        'canvas' in patch || 'canvasFontSize' in patch
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
      }, true)
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
        ...DEFAULT_TEXTBOX_ALIGN,
        ...partial
      }
      updateBoard(folder, (b) => ({ ...b, textBoxes: [...b.textBoxes, box] }), true)
      return id
    },

    patchTextBox: (folder, id, patch) =>
      updateBoard(
        folder,
        (b) => ({ ...b, textBoxes: b.textBoxes.map((t) => (t.id === id ? { ...t, ...patch } : t)) }),
        true,
        `${id}:${Object.keys(patch).sort().join(',')}`
      ),

    removeTextBox: (folder, id) =>
      updateBoard(folder, (b) => ({ ...b, textBoxes: b.textBoxes.filter((t) => t.id !== id) }), true),

    applyLayout: (folder, id) =>
      updateBoard(folder, (b) => {
        const layout = b.layouts.find((l) => l.id === id)
        return layout ? applyLayoutToLive(b, layout) : b
      }),

    createLayout: (folder, name) => {
      const id = nanoid(8)
      updateBoard(folder, (b) => ({
        ...b,
        layouts: [...b.layouts, snapshotLayout(b, id, name)],
        activeLayoutId: id
      }))
      return id
    },

    renameLayout: (folder, id, name) =>
      updateBoard(folder, (b) => ({
        ...b,
        layouts: b.layouts.map((l) => (l.id === id ? { ...l, name } : l))
      })),

    deleteLayout: (folder, id) =>
      updateBoard(folder, (b) => {
        if (b.layouts.length <= 1) return b
        const remaining = b.layouts.filter((l) => l.id !== id)
        if (b.activeLayoutId !== id) return { ...b, layouts: remaining }
        return applyLayoutToLive({ ...b, layouts: remaining }, remaining[0])
      }),

    nudgeCanvas: (folder, keys, textIds, dx, dy) => {
      if (keys.length === 0 && textIds.length === 0) return
      const keySet = new Set(keys)
      const idSet = new Set(textIds)
      updateBoard(
        folder,
        (b) => {
          const buttons = { ...b.buttons }
          for (const key of keySet) {
            const bs = buttons[key]
            if (bs) buttons[key] = { ...bs, canvas: { ...bs.canvas, x: Math.max(0, bs.canvas.x + dx), y: Math.max(0, bs.canvas.y + dy) } }
          }
          const textBoxes = b.textBoxes.map((t) =>
            idSet.has(t.id) ? { ...t, x: Math.max(0, t.x + dx), y: Math.max(0, t.y + dy) } : t
          )
          return { ...b, buttons, textBoxes }
        },
        true,
        `nudge:${[...keySet, ...idSet].join(',')}`
      )
    },

    applyCanvasOp: (folder, keys, textIds, op) => {
      const tab = get().tabs[folder]
      if (!tab) return
      const rects: AlignRect[] = []
      for (const key of keys) {
        const c = tab.board.buttons[key]?.canvas
        if (c) rects.push({ id: `b:${key}`, x: c.x, y: c.y, w: c.w, h: c.h })
      }
      for (const t of tab.board.textBoxes) {
        if (textIds.includes(t.id)) rects.push({ id: `t:${t.id}`, x: t.x, y: t.y, w: t.w, h: t.h })
      }
      const moves = computeAlign(rects, op)
      if (moves.size === 0) return
      updateBoard(
        folder,
        (b) => {
          const buttons = { ...b.buttons }
          const textBoxes = b.textBoxes.map((t) => {
            const m = moves.get(`t:${t.id}`)
            return m ? { ...t, x: m.x, y: m.y } : t
          })
          for (const key of keys) {
            const m = moves.get(`b:${key}`)
            if (m && buttons[key]) buttons[key] = { ...buttons[key], canvas: { ...buttons[key].canvas, x: m.x, y: m.y } }
          }
          return { ...b, buttons, textBoxes }
        },
        true
      )
    },

    undo: (folder) => {
      const h = history.get(folder)
      const tab = get().tabs[folder]
      if (!h || h.past.length === 0 || !tab || tab.status !== 'ready') return
      const prev = h.past.pop() as Board
      h.future.push(tab.board)
      lastCoalesce.delete(folder)
      setBoard(folder, prev)
    },

    redo: (folder) => {
      const h = history.get(folder)
      const tab = get().tabs[folder]
      if (!h || h.future.length === 0 || !tab || tab.status !== 'ready') return
      const next = h.future.pop() as Board
      h.past.push(tab.board)
      lastCoalesce.delete(folder)
      setBoard(folder, next)
    },

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
