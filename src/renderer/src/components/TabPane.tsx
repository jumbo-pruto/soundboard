import { FolderX, Loader2, RefreshCw, Trash2 } from 'lucide-react'
import { ViewMode } from '@shared/types'
import { closeTab } from '../store/tabActions'
import { useBoardStore } from '../store/useBoardStore'
import CanvasView from './views/CanvasView'
import GridView from './views/GridView'
import LaunchpadView from './views/LaunchpadView'
import ListView from './views/ListView'

/** Renders one tab's content in a given view mode. Used by every pane. */
export default function TabPane({ folder, viewMode }: { folder: string; viewMode: ViewMode }): JSX.Element {
  const tab = useBoardStore((s) => s.tabs[folder])
  const loadTab = useBoardStore((s) => s.loadTab)

  if (!tab || tab.status === 'loading') {
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
