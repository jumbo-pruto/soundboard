import { ReactNode } from 'react'
import { create } from 'zustand'
import { AppConfig, DEFAULT_CONFIG, SortMode } from '@shared/types'

export interface MenuItem {
  label?: string
  icon?: ReactNode
  onClick?: () => void
  danger?: boolean
  disabled?: boolean
  separator?: boolean
}
export interface ContextMenuState {
  x: number
  y: number
  items: MenuItem[]
}

export type Selection =
  | { kind: 'button'; folder: string; key: string }
  | { kind: 'text'; folder: string; id: string }
  | null

interface UIState {
  config: AppConfig
  configLoaded: boolean
  query: string
  sortMode: SortMode
  favoritesOnly: boolean
  settingsOpen: boolean
  /** true while a hotkey-capture field is listening, so global hotkeys must not fire */
  keyCaptureActive: boolean
  selection: Selection
  launchpadPage: number
  toast: string | null
  /** per-folder canvas zoom (transient; 1 = 100%) */
  canvasZoom: Record<string, number>
  /** tabs Ctrl-selected for a split action */
  tabMultiSelect: string[]
  contextMenu: ContextMenuState | null

  loadConfig: () => Promise<void>
  setConfig: (patch: Partial<AppConfig>) => void
  setQuery: (q: string) => void
  setSortMode: (m: SortMode) => void
  setFavoritesOnly: (v: boolean) => void
  setSettingsOpen: (v: boolean) => void
  setKeyCapture: (v: boolean) => void
  select: (s: Selection) => void
  setLaunchpadPage: (n: number) => void
  showToast: (msg: string) => void
  setZoom: (folder: string, zoom: number) => void
  toggleTabSelect: (folder: string) => void
  clearTabSelect: () => void
  openContextMenu: (x: number, y: number, items: MenuItem[]) => void
  closeContextMenu: () => void
}

export const MIN_ZOOM = 0.25
export const MAX_ZOOM = 3
export const clampZoom = (z: number): number => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z))

let saveTimer: ReturnType<typeof setTimeout> | undefined
let toastTimer: ReturnType<typeof setTimeout> | undefined

function persist(config: AppConfig): void {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    // Edit mode is deliberately never persisted: the app always launches in safe User mode.
    void window.api.writeConfig({ ...config, editMode: false })
  }, 300)
}

export const useUIStore = create<UIState>((set, get) => ({
  config: DEFAULT_CONFIG,
  configLoaded: false,
  query: '',
  sortMode: 'custom',
  favoritesOnly: false,
  settingsOpen: false,
  keyCaptureActive: false,
  selection: null,
  launchpadPage: 0,
  toast: null,
  canvasZoom: {},
  tabMultiSelect: [],
  contextMenu: null,

  loadConfig: async () => {
    const saved = await window.api.readConfig()
    set({ config: { ...saved, editMode: false }, configLoaded: true })
  },

  setConfig: (patch) => {
    const config = { ...get().config, ...patch }
    set({ config })
    persist(config)
  },

  setQuery: (query) => set({ query, launchpadPage: 0 }),
  setSortMode: (sortMode) => set({ sortMode, launchpadPage: 0 }),
  setFavoritesOnly: (favoritesOnly) => set({ favoritesOnly, launchpadPage: 0 }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setKeyCapture: (keyCaptureActive) => set({ keyCaptureActive }),
  select: (selection) => set({ selection }),
  setLaunchpadPage: (launchpadPage) => set({ launchpadPage }),

  showToast: (toast) => {
    set({ toast })
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => set({ toast: null }), 2800)
  },

  setZoom: (folder, zoom) => set({ canvasZoom: { ...get().canvasZoom, [folder]: clampZoom(zoom) } }),

  toggleTabSelect: (folder) => {
    const cur = get().tabMultiSelect
    set({ tabMultiSelect: cur.includes(folder) ? cur.filter((f) => f !== folder) : [...cur, folder] })
  },
  clearTabSelect: () => set({ tabMultiSelect: [] }),
  openContextMenu: (x, y, items) => set({ contextMenu: { x, y, items } }),
  closeContextMenu: () => set({ contextMenu: null })
}))
