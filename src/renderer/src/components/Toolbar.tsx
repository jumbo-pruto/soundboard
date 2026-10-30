import {
  Grid3x3,
  Heart,
  Layers,
  LayoutGrid,
  List,
  Move,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  StickyNote,
  Trash2,
  Wand2,
  X
} from 'lucide-react'
import { Board, ViewMode } from '@shared/types'
import { reloadAll, setPaneViewMode } from '../store/tabActions'
import { useBoardStore } from '../store/useBoardStore'
import { useUIStore } from '../store/useUIStore'

const VIEWS: { mode: ViewMode; label: string; icon: JSX.Element }[] = [
  { mode: 'list', label: 'List', icon: <List size={15} /> },
  { mode: 'grid', label: 'Grid', icon: <LayoutGrid size={15} /> },
  { mode: 'launchpad', label: 'Launchpad', icon: <Grid3x3 size={15} /> },
  { mode: 'canvas', label: 'Canvas', icon: <Move size={15} /> }
]

/** Saved canvas-layout switcher (shown in Canvas view). Switching applies a layout; edit mode adds new/rename/delete. */
function LayoutPicker({ folder, board, editMode }: { folder: string; board: Board; editMode: boolean }): JSX.Element {
  const applyLayout = useBoardStore((s) => s.applyLayout)
  const createLayout = useBoardStore((s) => s.createLayout)
  const renameLayout = useBoardStore((s) => s.renameLayout)
  const deleteLayout = useBoardStore((s) => s.deleteLayout)
  const active = board.layouts.find((l) => l.id === board.activeLayoutId)

  return (
    <div className="flex items-center gap-1" title="Saved canvas layouts" data-testid="layout-picker">
      <Layers size={15} className="text-muted" />
      <select
        className="field !w-auto max-w-[160px] cursor-pointer"
        value={board.activeLayoutId ?? ''}
        onChange={(e) => applyLayout(folder, e.target.value)}
        aria-label="Canvas layout"
      >
        {board.layouts.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </select>
      {editMode && (
        <>
          <button
            className="btn-ghost !p-1.5"
            title="New layout (snapshots current arrangement)"
            data-testid="layout-new"
            onClick={() =>
              useUIStore.getState().openPrompt('New layout name', `Layout ${board.layouts.length + 1}`, (name) => {
                if (name.trim()) createLayout(folder, name.trim())
              })
            }
          >
            <Plus size={15} />
          </button>
          <button
            className="btn-ghost !p-1.5"
            title="Rename current layout"
            onClick={() => {
              if (!active) return
              useUIStore.getState().openPrompt('Rename layout', active.name, (name) => {
                if (name.trim()) renameLayout(folder, active.id, name.trim())
              })
            }}
          >
            <Pencil size={14} />
          </button>
          <button
            className="btn-ghost !p-1.5 disabled:opacity-30"
            title="Delete current layout (undo with Ctrl+Z)"
            disabled={board.layouts.length <= 1}
            onClick={() => active && deleteLayout(folder, active.id)}
          >
            <Trash2 size={14} />
          </button>
        </>
      )}
    </div>
  )
}

export default function Toolbar(): JSX.Element {
  const query = useUIStore((s) => s.query)
  const setQuery = useUIStore((s) => s.setQuery)
  const sortMode = useUIStore((s) => s.sortMode)
  const setSortMode = useUIStore((s) => s.setSortMode)
  const favoritesOnly = useUIStore((s) => s.favoritesOnly)
  const setFavoritesOnly = useUIStore((s) => s.setFavoritesOnly)
  const viewMode = useUIStore((s) => s.config.viewMode)
  const editMode = useUIStore((s) => s.config.editMode)
  const activeTab = useUIStore((s) => s.config.activeTab)
  const focusedPane = useUIStore((s) => s.config.focusedPane)
  const setConfig = useUIStore((s) => s.setConfig)
  const activeBoard = useBoardStore((s) =>
    activeTab && s.tabs[activeTab]?.status === 'ready' ? s.tabs[activeTab].board : undefined
  )

  const onCanvas = viewMode === 'canvas' && !!activeTab && !!activeBoard
  const canvasTools = editMode && onCanvas

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-line bg-bg px-4 py-2">
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
        <input
          className="field !w-56 !pl-8 !pr-7"
          placeholder="Search sounds…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation()
            if (e.key === 'Escape') {
              setQuery('')
              ;(e.target as HTMLInputElement).blur()
            }
          }}
          data-testid="search"
        />
        {query && (
          <button
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted hover:text-fg"
            onClick={() => setQuery('')}
            title="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <button
        className={`btn ${favoritesOnly ? '!border-accent !bg-accent/15 !text-accent' : ''}`}
        onClick={() => setFavoritesOnly(!favoritesOnly)}
        title="Show favorites only"
      >
        <Heart size={14} fill={favoritesOnly ? 'currentColor' : 'none'} /> Favorites
      </button>

      <select
        className="field !w-auto cursor-pointer"
        value={sortMode}
        onChange={(e) => setSortMode(e.target.value as typeof sortMode)}
        title="Sort"
        aria-label="Sort"
      >
        <option value="custom">Custom order</option>
        <option value="name">Name (A–Z)</option>
        <option value="favorites">Favorites first</option>
      </select>

      <button className="btn" onClick={() => void reloadAll()} title="Re-scan folders" data-testid="reload">
        <RefreshCw size={14} /> Reload
      </button>

      {onCanvas && activeBoard && (
        <>
          <span className="mx-1 h-5 w-px bg-line" />
          <LayoutPicker folder={activeTab!} board={activeBoard} editMode={editMode} />
        </>
      )}

      {canvasTools && (
        <>
          <span className="mx-1 h-5 w-px bg-line" />
          <button
            className="btn"
            onClick={() => {
              const id = useBoardStore.getState().addTextBox(activeTab!)
              useUIStore.getState().select({ kind: 'text', folder: activeTab!, id })
            }}
            data-testid="add-textbox"
          >
            <StickyNote size={14} /> Add text box
          </button>
          <button
            className="btn"
            onClick={() => useBoardStore.getState().autoArrangeCanvas(activeTab!)}
            title="Reset all buttons to a tidy grid"
          >
            <Wand2 size={14} /> Auto-arrange
          </button>
        </>
      )}

      <div className="flex-1" />

      <div className="flex rounded-xl border border-line bg-surface p-0.5" role="group" aria-label="View mode">
        {VIEWS.map((v) => (
          <button
            key={v.mode}
            data-testid={`view-${v.mode}`}
            onClick={() => setPaneViewMode(focusedPane, v.mode)}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
              viewMode === v.mode ? 'bg-accent text-bg' : 'text-muted hover:text-fg'
            }`}
          >
            {v.icon} {v.label}
          </button>
        ))}
      </div>
    </div>
  )
}
