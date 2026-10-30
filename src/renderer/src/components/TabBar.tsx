import { AlertTriangle, FolderPlus, X } from 'lucide-react'
import { activateTab, addFolderFlow, closeTab } from '../store/tabActions'
import { useBoardStore } from '../store/useBoardStore'
import { useUIStore } from '../store/useUIStore'
import { baseName } from '../utils/path'

export default function TabBar(): JSX.Element {
  const openTabs = useUIStore((s) => s.config.openTabs)
  const activeTab = useUIStore((s) => s.config.activeTab)
  const tabs = useBoardStore((s) => s.tabs)

  return (
    <nav className="flex items-center gap-1 overflow-x-auto border-b border-line bg-surface px-3" data-testid="tabbar">
      {openTabs.map((folder) => {
        const tab = tabs[folder]
        const name = tab?.board.tab.name?.trim() || baseName(folder)
        const accent = tab?.board.tab.accent
        const active = folder === activeTab
        return (
          <div
            key={folder}
            data-testid="tab"
            title={folder}
            onClick={() => activateTab(folder)}
            onAuxClick={(e) => e.button === 1 && closeTab(folder)}
            className={`group relative flex min-w-0 max-w-[220px] cursor-pointer items-center gap-2 px-3.5 py-2.5 text-sm font-semibold uppercase tracking-wide transition ${
              active ? 'text-fg' : 'text-muted hover:text-fg'
            }`}
          >
            {tab?.status === 'missing' && <AlertTriangle size={14} className="shrink-0 text-amber-400" />}
            <span className="truncate">{name}</span>
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
            {active && (
              <span
                className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-accent"
                style={accent ? { backgroundColor: accent } : undefined}
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
    </nav>
  )
}
