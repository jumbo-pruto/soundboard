import { DragEvent, useEffect, useState } from 'react'
import { FolderInput } from 'lucide-react'
import { preload } from './audio/player'
import Inspector from './components/Inspector'
import SettingsModal from './components/SettingsModal'
import TabBar from './components/TabBar'
import TabContent from './components/TabContent'
import Toolbar from './components/Toolbar'
import TopBar from './components/TopBar'
import TransportBar from './components/TransportBar'
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
      const { openTabs, activeTab } = useUIStore.getState().config
      await Promise.all(openTabs.map((f) => useBoardStore.getState().loadTab(f)))
      if (!activeTab || !openTabs.includes(activeTab)) {
        useUIStore.getState().setConfig({ activeTab: openTabs[0] ?? null })
      }
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

/** Pre-buffer the active tab's sounds so the first click is instant. */
function usePreload(): void {
  const activeTab = useUIStore((s) => s.config.activeTab)
  const files = useBoardStore((s) => (activeTab ? s.tabs[activeTab]?.files : undefined))
  useEffect(() => {
    if (files) preload(files.map((f) => f.file))
  }, [files])
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
          <TabContent />
        </main>
        {editMode && <Inspector />}
      </div>
      <TransportBar />
      <SettingsModal />

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
