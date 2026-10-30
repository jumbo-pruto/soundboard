import { FolderOpen, FolderX, Loader2, RefreshCw, Trash2 } from 'lucide-react'
import { addFolderFlow, closeTab } from '../store/tabActions'
import { useBoardStore } from '../store/useBoardStore'
import { useUIStore } from '../store/useUIStore'
import CanvasView from './views/CanvasView'
import GridView from './views/GridView'
import LaunchpadView from './views/LaunchpadView'
import ListView from './views/ListView'

function Welcome(): JSX.Element {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-accent/15 text-accent">
        <FolderOpen size={40} />
      </div>
      <h1 className="text-2xl font-bold">Add your first sound folder</h1>
      <p className="max-w-md text-sm text-muted">
        Pick any folder with <b>.mp3</b> or <b>.wav</b> files. Each folder becomes a tab and every file
        becomes a button. You can also drag a folder onto this window.
      </p>
      <button className="btn-accent !px-5 !py-2.5 !text-base" onClick={() => void addFolderFlow()} data-testid="welcome-add">
        <FolderOpen size={18} /> Choose folder…
      </button>
    </div>
  )
}

export default function TabContent(): JSX.Element {
  const activeTab = useUIStore((s) => s.config.activeTab)
  const viewMode = useUIStore((s) => s.config.viewMode)
  const tab = useBoardStore((s) => (activeTab ? s.tabs[activeTab] : undefined))
  const loadTab = useBoardStore((s) => s.loadTab)

  if (!activeTab || !tab) return <Welcome />

  if (tab.status === 'loading') {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-muted">
        <Loader2 size={18} className="animate-spin" /> Loading…
      </div>
    )
  }

  if (tab.status === 'missing' || tab.status === 'error') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <FolderX size={40} className="text-amber-400" />
        <p className="text-base font-semibold">
          {tab.status === 'missing' ? 'This folder can’t be found' : 'This folder couldn’t be read'}
        </p>
        <p className="max-w-lg break-all text-sm text-muted">{tab.folder}</p>
        <p className="max-w-lg text-sm text-muted">
          It may have been moved or live on a drive that isn&apos;t connected. Your saved layout is untouched.
        </p>
        <div className="mt-1 flex gap-2">
          <button className="btn" onClick={() => void loadTab(tab.folder)}>
            <RefreshCw size={14} /> Try again
          </button>
          <button className="btn !text-danger" onClick={() => closeTab(tab.folder)}>
            <Trash2 size={14} /> Remove tab
          </button>
        </div>
      </div>
    )
  }

  switch (viewMode) {
    case 'list':
      return <ListView tab={tab} />
    case 'launchpad':
      return <LaunchpadView tab={tab} />
    case 'canvas':
      return <CanvasView tab={tab} />
    default:
      return <GridView tab={tab} />
  }
}
