export type ViewMode = 'list' | 'grid' | 'launchpad' | 'canvas'
export type ThemeMode = 'dark' | 'light' | 'system'
export type ButtonSize = 'sm' | 'md' | 'lg'
export type SortMode = 'custom' | 'name' | 'favorites'

export interface CanvasRect {
  x: number
  y: number
  w: number
  h: number
}

export interface ButtonState {
  id: string
  label: string | null
  color: string | null
  order: number
  hotkey: string | null
  favorite: boolean
  hidden: boolean
  volume: number
  rate: number
  canvas: CanvasRect
}

export interface TextBoxState {
  id: string
  text: string
  x: number
  y: number
  w: number
  h: number
  fontSize: number
  color: string
  bg: string
}

export interface Board {
  version: 1
  tab: { name: string | null; accent: string | null }
  buttons: Record<string, ButtonState>
  textBoxes: TextBoxState[]
}

export interface AppConfig {
  version: 1
  theme: ThemeMode
  viewMode: ViewMode
  editMode: boolean
  openTabs: string[]
  activeTab: string | null
  outputDeviceId: string
  masterVolume: number
  allowOverlap: boolean
  audioExts: string[]
  watchFolders: boolean
  buttonSize: ButtonSize
  snapToGrid: boolean
  hotkeysOnlyCurrentTab: boolean
  retriggerRestarts: boolean
  window: { w: number; h: number; x: number | null; y: number | null }
}

export interface ScannedFile {
  /** filename without extension */
  name: string
  /** filename including extension — the stable key used in board.json */
  key: string
  /** absolute path */
  file: string
  ext: string
}

export const DEFAULT_CONFIG: AppConfig = {
  version: 1,
  theme: 'dark',
  viewMode: 'grid',
  editMode: false,
  openTabs: [],
  activeTab: null,
  outputDeviceId: 'default',
  masterVolume: 1,
  allowOverlap: true,
  audioExts: ['.mp3', '.wav'],
  watchFolders: true,
  buttonSize: 'md',
  snapToGrid: true,
  hotkeysOnlyCurrentTab: false,
  retriggerRestarts: true,
  window: { w: 1280, h: 800, x: null, y: null }
}

export const EMPTY_BOARD: Board = {
  version: 1,
  tab: { name: null, accent: null },
  buttons: {},
  textBoxes: []
}
