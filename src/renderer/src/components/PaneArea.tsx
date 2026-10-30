import { useRef } from 'react'
import { FolderOpen, Grid3x3, LayoutGrid, List, Move, SplitSquareHorizontal, X } from 'lucide-react'
import { PaneConfig, ViewMode } from '@shared/types'
import { addFolderFlow, closePane, setFocusedPane, setPaneFolder, setPaneSizes, setPaneViewMode } from '../store/tabActions'
import { useBoardStore } from '../store/useBoardStore'
import { useUIStore } from '../store/useUIStore'
import { baseName } from '../utils/path'
import TabPane from './TabPane'

const VIEW_ICONS: Record<ViewMode, JSX.Element> = {
  list: <List size={13} />,
  grid: <LayoutGrid size={13} />,
  launchpad: <Grid3x3 size={13} />,
  canvas: <Move size={13} />
}

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

function PaneHeader({ pane, index }: { pane: PaneConfig; index: number }): JSX.Element {
  const openTabs = useUIStore((s) => s.config.openTabs)
  const tabs = useBoardStore((s) => s.tabs)
  const name = (folder: string): string => tabs[folder]?.board.tab.name?.trim() || baseName(folder)

  return (
    <div
      className="flex items-center gap-1.5 border-b border-line bg-surface/70 px-2 py-1"
      data-testid="pane-header"
    >
      <select
        className="field !w-auto max-w-[150px] cursor-pointer !py-1 text-xs"
        value={pane.folder ?? ''}
        onChange={(e) => setPaneFolder(index, e.target.value || null)}
        aria-label="Pane tab"
      >
        <option value="">— choose tab —</option>
        {openTabs.map((f) => (
          <option key={f} value={f}>
            {name(f)}
          </option>
        ))}
      </select>
      <div className="flex rounded-lg border border-line p-0.5">
        {(Object.keys(VIEW_ICONS) as ViewMode[]).map((v) => (
          <button
            key={v}
            title={v}
            onClick={() => setPaneViewMode(index, v)}
            className={`rounded px-1.5 py-1 transition ${pane.viewMode === v ? 'bg-accent text-bg' : 'text-muted hover:text-fg'}`}
          >
            {VIEW_ICONS[v]}
          </button>
        ))}
      </div>
      <div className="flex-1" />
      <button
        className="btn-ghost !p-1 text-muted"
        title="Close this pane"
        onClick={() => closePane(index)}
        data-testid="pane-close"
      >
        <X size={14} />
      </button>
    </div>
  )
}

function Pane({
  pane,
  index,
  focused,
  showHeader,
  size
}: {
  pane: PaneConfig
  index: number
  focused: boolean
  showHeader: boolean
  size: number
}): JSX.Element {
  return (
    <section
      className={`relative flex min-w-0 flex-col ${
        showHeader && focused ? 'ring-1 ring-inset ring-accent/70' : ''
      }`}
      style={{ flexGrow: size, flexBasis: 0 }}
      onMouseDownCapture={() => !focused && setFocusedPane(index)}
      data-testid="pane"
      data-focused={focused}
    >
      {showHeader && <PaneHeader pane={pane} index={index} />}
      <div className="min-h-0 flex-1 bg-bg">
        {pane.folder ? (
          <TabPane folder={pane.folder} viewMode={pane.viewMode} />
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted">
            <span>
              <SplitSquareHorizontal size={28} className="mx-auto mb-2 opacity-60" />
              Choose a tab for this pane from the selector above.
            </span>
          </div>
        )}
      </div>
    </section>
  )
}

/** A draggable divider that reweights the panes on its left and right. */
function Divider({ index }: { index: number }): JSX.Element {
  const containerW = useRef(0)
  const onDown = (e: React.MouseEvent): void => {
    e.preventDefault()
    const row = (e.currentTarget as HTMLElement).parentElement
    if (!row) return
    containerW.current = row.getBoundingClientRect().width
    const startX = e.clientX
    const sizes = [...useUIStore.getState().config.paneSizes]
    const total = sizes[index - 1] + sizes[index]
    const move = (ev: MouseEvent): void => {
      const deltaFrac = ((ev.clientX - startX) / containerW.current) * sizes.reduce((a, b) => a + b, 0)
      const left = Math.max(0.2, Math.min(total - 0.2, sizes[index - 1] + deltaFrac))
      const next = [...sizes]
      next[index - 1] = left
      next[index] = total - left
      setPaneSizes(next)
    }
    const up = (): void => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  }
  return (
    <div
      className="relative w-1.5 shrink-0 cursor-col-resize bg-line transition-colors hover:bg-accent"
      onMouseDown={onDown}
      data-testid="pane-divider"
    />
  )
}

export default function PaneArea(): JSX.Element {
  const panes = useUIStore((s) => s.config.panes)
  const focusedPane = useUIStore((s) => s.config.focusedPane)
  const paneSizes = useUIStore((s) => s.config.paneSizes)
  const hasTabs = useUIStore((s) => s.config.openTabs.length > 0)

  if (!hasTabs) return <Welcome />

  const multi = panes.length > 1
  return (
    <div className="flex h-full w-full" data-testid="pane-area">
      {panes.map((pane, i) => (
        <PaneWithDivider key={i} first={i === 0}>
          <Pane
            pane={pane}
            index={i}
            focused={i === focusedPane}
            showHeader={multi}
            size={paneSizes[i] ?? 1}
          />
        </PaneWithDivider>
      ))}
    </div>
  )
}

/** Renders a divider before every pane except the first (kept separate so keys stay stable). */
function PaneWithDivider({ first, children }: { first: boolean; children: JSX.Element }): JSX.Element {
  // index of the divider = index of this pane; derive from children prop is awkward, so read it:
  const index = (children.props as { index: number }).index
  return (
    <>
      {!first && <Divider index={index} />}
      {children}
    </>
  )
}
