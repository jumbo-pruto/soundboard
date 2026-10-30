import { DragEvent, useEffect, useState } from 'react'
import { FolderInput } from 'lucide-react'
import { preload } from './audio/player'
import ContextMenu from './components/ContextMenu'
import Inspector from './components/Inspector'
import PaneArea from './components/PaneArea'
import SettingsModal from './components/SettingsModal'
import TabBar from './components/TabBar'
import Toolbar from './components/Toolbar'
import TopBar from './components/TopBar'
import TransportBar from './components/TransportBar'
import { useCanvasKeys } from './hooks/useCanvasKeys'
import { useHotkeys } from './hooks/useHotkeys'
import { openFolder } from './store/tabActions'
import { useBoardStore } from './store/useBoardStore'
import { useUIStore } from './store/useUIStore'
import { hexToTriple } from './utils/color'

function useBoot(): boolean {
  const configLoaded = useUIStore((s) => s.configLoaded)

  useEffect(() => {
    void (async () => {
      await useUIStore.getState().loadConfig()
      const cfg = useUIStore.getState().config
      await Promise.all(cfg.openTabs.map((f) => useBoardStore.getState().loadTab(f)))

      // sanitize panes: drop pane folders that are no longer open; make sure one pane shows something
      const inOpen = (f: string | null): boolean => !!f && cfg.openTabs.includes(f)
      let panes = cfg.panes.map((p) => ({ ...p, folder: inOpen(p.folder) ? p.folder : null }))
      if (panes.length === 0) panes = [{ folder: null, viewMode: cfg.viewMode }]
      const focusedPane = Math.max(0, Math.min(cfg.focusedPane, panes.length - 1))
      if (!panes.some((p) => p.folder) && cfg.openTabs.length) {
        panes[focusedPane] = { ...panes[focusedPane], folder: cfg.openTabs[0] }
      }
      const paneSizes = panes.map((_, i) => cfg.paneSizes[i] ?? 1)
      useUIStore.getState().setConfig({
        panes,
        focusedPane,
        paneSizes,
        activeTab: panes[focusedPane]?.folder ?? null,
        viewMode: panes[focusedPane]?.viewMode ?? cfg.viewMode
      })
    })()

    const off = window.api.onFolderChanged((folder) => void useBoardStore.getState().rescan(folder))
    const flush = (): void => void useBoardStore.getState().flushAll()
    window.addEventListener('beforeunload', flush)
    document.addEventListener('visibilitychange', () => document.hidden && flush())
    return () => {
      off()
      window.removeEventListener('beforeunload', flush)
    }
  }, [])

  return configLoaded
}

/** Applies theme + the active tab's accent color to the document. */
function useAppearance(): void {
  const theme = useUIStore((s) => s.config.theme)
  const activeTab = useUIStore((s) => s.config.activeTab)
  const accent = useBoardStore((s) => (activeTab ? s.tabs[activeTab]?.board.tab.accent : null))

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = (): void => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches)
      document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])

  useEffect(() => {
    const triple = accent ? hexToTriple(accent) : null
    if (triple) document.documentElement.style.setProperty('--accent', triple)
    else document.documentElement.style.removeProperty('--accent')
  }, [accent])
}

/** Pre-buffer the sounds of every visible pane's tab so the first click is instant. */
function usePreload(): void {
  const panes = useUIStore((s) => s.config.panes)
  const tabs = useBoardStore((s) => s.tabs)
  const paths = panes
    .map((p) => p.folder)
    .filter((f): f is string => !!f)
    .flatMap((f) => tabs[f]?.files.map((file) => file.file) ?? [])
  const key = paths.join('|')
  useEffect(() => {
    if (paths.length) preload(paths)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
}

function useFolderDrop(): { dragging: boolean; handlers: Record<string, (e: DragEvent) => void> } {
  const [dragging, setDragging] = useState(false)
  const handlers = {
    onDragOver: (e: DragEvent) => {
      if (e.dataTransfer.types.includes('Files')) {
        e.preventDefault()
        setDragging(true)
      }
    },
    onDragLeave: (e: DragEvent) => {
      if (e.currentTarget === e.target) setDragging(false)
    },
    onDrop: (e: DragEvent) => {
      e.preventDefault()
      setDragging(false)
      void (async () => {
        let added = 0
        for (const file of Array.from(e.dataTransfer.files)) {
          const path = window.api.pathForFile(file)
          if (path && (await window.api.folderExists(path))) {
            await openFolder(path)
            added++
          }
        }
        if (added === 0) useUIStore.getState().showToast('Drop a folder (not a file) to add it as a tab')
      })()
    }
  }
  return { dragging, handlers }
}

export default function App(): JSX.Element {
  const ready = useBoot()
  useAppearance()
  usePreload()
  useHotkeys()
  useCanvasKeys()
  const editMode = useUIStore((s) => s.config.editMode)
  const toast = useUIStore((s) => s.toast)
  const { dragging, handlers } = useFolderDrop()

  if (!ready) return <div className="h-full bg-bg" />

  return (
    <div className="flex h-full flex-col" {...handlers}>
      {editMode && (
        <div
          className="flex items-center justify-center gap-2 bg-amber-400 py-0.5 text-[11px] font-bold uppercase tracking-widest text-black"
          data-testid="edit-banner"
        >
          Edit mode — layout unlocked. Switch to User mode before going live.
        </div>
      )}
      <TopBar />
      <TabBar />
      <Toolbar />
      <div className="flex min-h-0 flex-1">
        <main className="min-w-0 flex-1 bg-bg">
          <PaneArea />
        </main>
        {editMode && <Inspector />}
      </div>
      <TransportBar />
      <SettingsModal />
      <ContextMenu />

      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-accent/20 backdrop-blur-sm">
          <div className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-accent bg-surface px-8 py-6 text-lg font-bold">
            <FolderInput size={28} /> Drop a folder to add it as a tab
          </div>
        </div>
      )}

      {toast && (
        <div className="pop fixed bottom-16 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-line bg-elevated px-4 py-2.5 text-sm shadow-xl">
          {toast}
        </div>
      )}
    </div>
  )
}
