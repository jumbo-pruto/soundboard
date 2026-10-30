import { useState } from 'react'
import { AlertTriangle, Columns2, FolderPlus, Pencil, RotateCcw, SplitSquareHorizontal, X } from 'lucide-react'
import {
  activateTab,
  addFolderFlow,
  addPane,
  closeTab,
  openInSplit,
  reloadAll,
  reorderTabs
} from '../store/tabActions'
import { useBoardStore } from '../store/useBoardStore'
import { useUIStore } from '../store/useUIStore'
import { baseName } from '../utils/path'

export default function TabBar(): JSX.Element {
  const openTabs = useUIStore((s) => s.config.openTabs)
  const activeTab = useUIStore((s) => s.config.activeTab)
  const paneFolders = useUIStore((s) => s.config.panes.map((p) => p.folder))
  const multiSel = useUIStore((s) => s.tabMultiSelect)
  const tabs = useBoardStore((s) => s.tabs)
  const [dragOver, setDragOver] = useState<string | null>(null)

  const name = (folder: string): string => tabs[folder]?.board.tab.name?.trim() || baseName(folder)

  const openMenu = (e: React.MouseEvent, folder: string): void => {
    e.preventDefault()
    const sel = multiSel.includes(folder) ? multiSel : [folder]
    useUIStore.getState().openContextMenu(e.clientX, e.clientY, [
      {
        label: sel.length > 1 ? `Split these ${sel.length} tabs` : 'Open in new pane',
        icon: sel.length > 1 ? <SplitSquareHorizontal size={14} /> : <Columns2 size={14} />,
        onClick: () => {
          if (sel.length > 1) void openInSplit(sel)
          else void addPane(folder)
          useUIStore.getState().clearTabSelect()
        }
      },
      {
        label: 'Rename tab',
        icon: <Pencil size={14} />,
        onClick: () => {
          const n = window.prompt('Tab name:', name(folder))
          if (n !== null) useBoardStore.getState().patchTab(folder, { name: n.trim() || null })
        }
      },
      { label: 'Reload', icon: <RotateCcw size={14} />, onClick: () => void reloadAll() },
      { separator: true },
      {
        label: 'Close other tabs',
        disabled: openTabs.length <= 1,
        onClick: () => openTabs.filter((f) => f !== folder).forEach(closeTab)
      },
      { label: 'Close tab', icon: <X size={14} />, danger: true, onClick: () => closeTab(folder) }
    ])
  }

  const onClick = (e: React.MouseEvent, folder: string): void => {
    if (e.ctrlKey || e.metaKey) {
      useUIStore.getState().toggleTabSelect(folder)
      return
    }
    useUIStore.getState().clearTabSelect()
    activateTab(folder)
  }

  return (
    <nav className="flex items-center gap-1 overflow-x-auto border-b border-line bg-surface px-3" data-testid="tabbar">
      {openTabs.map((folder) => {
        const tab = tabs[folder]
        const active = folder === activeTab
        const inPane = paneFolders.includes(folder)
        const selected = multiSel.includes(folder)
        return (
          <div
            key={folder}
            data-testid="tab"
            title={folder}
            draggable
            onDragStart={(e) => e.dataTransfer.setData('text/tab', folder)}
            onDragOver={(e) => {
              if (e.dataTransfer.types.includes('text/tab')) {
                e.preventDefault()
                setDragOver(folder)
              }
            }}
            onDragLeave={() => setDragOver((d) => (d === folder ? null : d))}
            onDrop={(e) => {
              const dragged = e.dataTransfer.getData('text/tab')
              setDragOver(null)
              if (dragged && dragged !== folder) reorderTabs(dragged, openTabs.indexOf(folder))
            }}
            onClick={(e) => onClick(e, folder)}
            onContextMenu={(e) => openMenu(e, folder)}
            onAuxClick={(e) => e.button === 1 && closeTab(folder)}
            className={`group relative flex min-w-0 max-w-[220px] cursor-pointer items-center gap-2 px-3.5 py-2.5 text-sm font-semibold uppercase tracking-wide transition ${
              active || inPane ? 'text-fg' : 'text-muted hover:text-fg'
            } ${selected ? 'bg-accent/15' : ''} ${dragOver === folder ? 'border-l-2 border-accent' : ''}`}
          >
            {tab?.status === 'missing' && <AlertTriangle size={14} className="shrink-0 text-amber-400" />}
            <span className="truncate">{name(folder)}</span>
            <button
              title="Close tab"
              onClick={(e) => {
                e.stopPropagation()
                closeTab(folder)
              }}
              className="rounded-full p-0.5 opacity-0 transition hover:bg-elevated group-hover:opacity-100"
            >
              <X size={13} />
            </button>
            {(active || inPane) && (
              <span
                className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-accent"
                style={tab?.board.tab.accent ? { backgroundColor: tab.board.tab.accent } : undefined}
              />
            )}
          </div>
        )
      })}
      <button
        onClick={() => void addFolderFlow()}
        className="btn-ghost ml-1 shrink-0"
        title="Add a folder as a new tab"
        data-testid="add-tab"
      >
        <FolderPlus size={16} /> Add folder
      </button>
      {multiSel.length >= 2 && (
        <button
          className="btn-accent ml-1 shrink-0 !py-1"
          title="Split the selected tabs into panes"
          data-testid="split-selected"
          onClick={() => {
            void openInSplit(multiSel)
            useUIStore.getState().clearTabSelect()
          }}
        >
          <SplitSquareHorizontal size={14} /> Split {multiSel.length}
        </button>
      )}
    </nav>
  )
}
