import { create } from 'zustand'
import { AppConfig, DEFAULT_CONFIG, SortMode } from '@shared/types'

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
}

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
  }
}))
