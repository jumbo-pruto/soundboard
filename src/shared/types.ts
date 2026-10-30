export type ViewMode = 'list' | 'grid' | 'launchpad' | 'canvas'
export type ThemeMode = 'dark' | 'light' | 'system'
export type ButtonSize = 'sm' | 'md' | 'lg'
export type SortMode = 'custom' | 'name' | 'favorites'
export type RetriggerMode = 'restart' | 'stop' | 'stack'
/** per-button override; 'default' follows the global RetriggerMode */
export type RetriggerPref = 'default' | RetriggerMode
export type HAlign = 'left' | 'center' | 'right'
export type VAlign = 'top' | 'middle' | 'bottom'

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
  /** canvas label font size in px; null = auto (default 14px) */
  canvasFontSize: number | null
  /** re-click behavior override; 'default' uses the global setting */
  retrigger: RetriggerPref
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
  align: HAlign
  valign: VAlign
}

/** one button's geometry inside a saved layout */
export type LayoutButton = CanvasRect & { fontSize: number | null }

/** a named canvas arrangement (positions + sizes + text boxes) for one tab */
export interface CanvasLayout {
  id: string
  name: string
  buttons: Record<string, LayoutButton>
  textBoxes: TextBoxState[]
}

export interface Board {
  version: 2
  tab: { name: string | null; accent: string | null }
  buttons: Record<string, ButtonState>
  textBoxes: TextBoxState[]
  layouts: CanvasLayout[]
  activeLayoutId: string | null
}

/** one pane in the (possibly split) main area */
export interface PaneConfig {
  folder: string | null
  viewMode: ViewMode
}

export interface AppConfig {
  version: 2
  theme: ThemeMode
  /** mirror of the focused pane's viewMode (kept in sync for v1-era readers) */
  viewMode: ViewMode
  editMode: boolean
  openTabs: string[]
  /** mirror of the focused pane's folder */
  activeTab: string | null
  /** 1–3 panes shown side by side; panes[focusedPane] mirrors activeTab/viewMode */
  panes: PaneConfig[]
  focusedPane: number
  /** flex weights per pane (same length as panes) */
  paneSizes: number[]
  outputDeviceId: string
  masterVolume: number
  allowOverlap: boolean
  audioExts: string[]
  watchFolders: boolean
  buttonSize: ButtonSize
  snapToGrid: boolean
  hotkeysOnlyCurrentTab: boolean
  retriggerMode: RetriggerMode
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
  version: 2,
  theme: 'dark',
  viewMode: 'grid',
  editMode: false,
  openTabs: [],
  activeTab: null,
  panes: [{ folder: null, viewMode: 'grid' }],
  focusedPane: 0,
  paneSizes: [1],
  outputDeviceId: 'default',
  masterVolume: 1,
  allowOverlap: true,
  audioExts: ['.mp3', '.wav'],
  watchFolders: true,
  buttonSize: 'md',
  snapToGrid: true,
  hotkeysOnlyCurrentTab: false,
  retriggerMode: 'restart',
  window: { w: 1280, h: 800, x: null, y: null }
}

export const EMPTY_BOARD: Board = {
  version: 2,
  tab: { name: null, accent: null },
  buttons: {},
  textBoxes: [],
  layouts: [],
  activeLayoutId: null
}

export const DEFAULT_TEXTBOX_ALIGN: Pick<TextBoxState, 'align' | 'valign'> = {
  align: 'left',
  valign: 'middle'
}

/** Normalize a config read from disk (any prior version) into a current AppConfig. Caller still merges over DEFAULT_CONFIG. */
export function migrateConfig(raw: Record<string, unknown> | null): Record<string, unknown> {
  if (!raw) return {}
  const out = { ...raw }
  // v1 -> v2: retriggerRestarts(boolean) -> retriggerMode
  if (out.retriggerMode === undefined && 'retriggerRestarts' in out) {
    out.retriggerMode = out.retriggerRestarts === false ? 'stop' : 'restart'
  }
  delete out.retriggerRestarts
  // v1 -> v2: build a single pane from the old activeTab/viewMode
  if (!Array.isArray(out.panes) || out.panes.length === 0) {
    out.panes = [{ folder: (out.activeTab as string) ?? null, viewMode: (out.viewMode as ViewMode) ?? 'grid' }]
    out.focusedPane = 0
    out.paneSizes = [1]
  }
  out.version = 2
  return out
}
