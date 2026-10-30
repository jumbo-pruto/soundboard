import { stopFolder } from '../audio/player'
import { useBoardStore } from './useBoardStore'
import { useUIStore } from './useUIStore'

const norm = (p: string): string => p.replace(/[\\/]+$/, '').replace(/\//g, '\\').toLowerCase()

/** Open a folder as a tab (or just focus it if it's already open). */
export async function openFolder(folder: string): Promise<void> {
  const ui = useUIStore.getState()
  const existing = ui.config.openTabs.find((t) => norm(t) === norm(folder))
  if (existing) {
    activateTab(existing)
    return
  }
  ui.setConfig({ openTabs: [...ui.config.openTabs, folder] })
  await useBoardStore.getState().loadTab(folder)
  activateTab(folder)
}

export async function addFolderFlow(): Promise<void> {
  const folder = await window.api.pickFolder()
  if (folder) await openFolder(folder)
}

export function activateTab(folder: string): void {
  const ui = useUIStore.getState()
  ui.setConfig({ activeTab: folder })
  ui.select(null)
  ui.setLaunchpadPage(0)
}

export function closeTab(folder: string): void {
  const ui = useUIStore.getState()
  const { openTabs, activeTab } = ui.config
  const idx = openTabs.indexOf(folder)
  const next = openTabs.filter((t) => t !== folder)
  let nextActive = activeTab
  if (activeTab === folder) nextActive = next[Math.min(idx, next.length - 1)] ?? null
  // sounds from a closed tab shouldn't keep playing unseen
  stopFolder(folder)
  useBoardStore.getState().removeTab(folder)
  ui.setConfig({ openTabs: next, activeTab: nextActive })
  ui.select(null)
}

export async function reloadAll(): Promise<void> {
  const { openTabs } = useUIStore.getState().config
  await Promise.all(openTabs.map((f) => useBoardStore.getState().rescan(f)))
}
