import { PaneConfig, ViewMode } from '@shared/types'
import { stopFolder } from '../audio/player'
import { useBoardStore } from './useBoardStore'
import { useUIStore } from './useUIStore'

const norm = (p: string): string => p.replace(/[\\/]+$/, '').replace(/\//g, '\\').toLowerCase()

/** Write panes + keep activeTab/viewMode mirroring the focused pane. */
function commitPanes(panes: PaneConfig[], focusedPane: number, paneSizes: number[]): void {
  const ui = useUIStore.getState()
  const safe = panes.length ? panes : [{ folder: null, viewMode: 'grid' as ViewMode }]
  const fp = Math.max(0, Math.min(focusedPane, safe.length - 1))
  const sizes = safe.map((_, i) => paneSizes[i] ?? 1)
  ui.setConfig({
    panes: safe,
    focusedPane: fp,
    paneSizes: sizes,
    activeTab: safe[fp]?.folder ?? null,
    viewMode: safe[fp]?.viewMode ?? 'grid'
  })
}

async function ensureLoaded(folder: string): Promise<void> {
  const ui = useUIStore.getState()
  if (!ui.config.openTabs.some((t) => norm(t) === norm(folder))) {
    ui.setConfig({ openTabs: [...ui.config.openTabs, folder] })
  }
  if (!useBoardStore.getState().tabs[folder]) await useBoardStore.getState().loadTab(folder)
}

/** Open a folder as a tab and show it in the focused pane (or just focus it if already open). */
export async function openFolder(folder: string): Promise<void> {
  const existing = useUIStore.getState().config.openTabs.find((t) => norm(t) === norm(folder))
  await ensureLoaded(existing ?? folder)
  setPaneFolder(useUIStore.getState().config.focusedPane, existing ?? folder)
}

export async function addFolderFlow(): Promise<void> {
  const folder = await window.api.pickFolder()
  if (folder) await openFolder(folder)
}

/** Put a tab into the focused pane (what clicking a tab does). */
export function activateTab(folder: string): void {
  setPaneFolder(useUIStore.getState().config.focusedPane, folder)
}

export function setFocusedPane(index: number): void {
  const { panes, paneSizes } = useUIStore.getState().config
  commitPanes(panes, index, paneSizes)
  useUIStore.getState().select(null)
  useUIStore.getState().setLaunchpadPage(0)
}

export function setPaneFolder(index: number, folder: string | null): void {
  const { panes, focusedPane, paneSizes } = useUIStore.getState().config
  const next = panes.map((p, i) => (i === index ? { ...p, folder } : p))
  // focus the pane we just targeted so the toolbar/inspector follow it
  commitPanes(next, index === focusedPane ? focusedPane : index, paneSizes)
  useUIStore.getState().select(null)
  useUIStore.getState().setLaunchpadPage(0)
}

export function setPaneViewMode(index: number, viewMode: ViewMode): void {
  const { panes, focusedPane, paneSizes } = useUIStore.getState().config
  const next = panes.map((p, i) => (i === index ? { ...p, viewMode } : p))
  commitPanes(next, index === focusedPane ? focusedPane : index, paneSizes)
}

export function setPaneSizes(sizes: number[]): void {
  const { panes, focusedPane } = useUIStore.getState().config
  commitPanes(panes, focusedPane, sizes)
}

/** Replace the whole pane layout with one pane per folder (max 3). Used by "split". */
export async function openInSplit(folders: string[]): Promise<void> {
  const uniq = folders.filter((f, i) => folders.findIndex((g) => norm(g) === norm(f)) === i).slice(0, 3)
  if (uniq.length === 0) return
  for (const f of uniq) await ensureLoaded(f)
  const vm = useUIStore.getState().config.viewMode
  const panes: PaneConfig[] = uniq.map((folder) => ({ folder, viewMode: vm }))
  commitPanes(panes, 0, panes.map(() => 1))
}

/** Add the folder as a new pane beside the current ones (max 3). */
export async function addPane(folder: string): Promise<void> {
  const { panes, paneSizes } = useUIStore.getState().config
  if (panes.length >= 3) {
    useUIStore.getState().showToast('Up to 3 panes. Close one first.')
    return
  }
  await ensureLoaded(folder)
  const next = [...panes, { folder, viewMode: useUIStore.getState().config.viewMode }]
  commitPanes(next, next.length - 1, [...paneSizes, 1])
}

export function closePane(index: number): void {
  const { panes, focusedPane, paneSizes } = useUIStore.getState().config
  if (panes.length <= 1) return
  const next = panes.filter((_, i) => i !== index)
  const sizes = paneSizes.filter((_, i) => i !== index)
  const fp = focusedPane > index ? focusedPane - 1 : Math.min(focusedPane, next.length - 1)
  commitPanes(next, fp, sizes)
}

export function reorderTabs(folder: string, toIndex: number): void {
  const ui = useUIStore.getState()
  const tabs = [...ui.config.openTabs]
  const from = tabs.indexOf(folder)
  if (from < 0) return
  tabs.splice(from, 1)
  tabs.splice(Math.max(0, Math.min(toIndex, tabs.length)), 0, folder)
  ui.setConfig({ openTabs: tabs })
}

export function closeTab(folder: string): void {
  const ui = useUIStore.getState()
  const { openTabs, panes, focusedPane, paneSizes } = ui.config
  const next = openTabs.filter((t) => t !== folder)
  const fallback = next[0] ?? null
  stopFolder(folder)
  useBoardStore.getState().removeTab(folder)
  ui.setConfig({ openTabs: next })
  // any pane showing the closed folder falls back to another open tab (or empty)
  const nextPanes = panes.map((p) => (p.folder === folder ? { ...p, folder: fallback } : p))
  commitPanes(nextPanes, focusedPane, paneSizes)
  ui.select(null)
}

export async function reloadAll(): Promise<void> {
  const { openTabs } = useUIStore.getState().config
  await Promise.all(openTabs.map((f) => useBoardStore.getState().rescan(f)))
}
