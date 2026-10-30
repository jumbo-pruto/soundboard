import { Maximize2, Minus, Plus } from 'lucide-react'
import { clampZoom, useUIStore } from '../../store/useUIStore'

interface Props {
  folder: string
  zoom: number
  onFit: () => void
}

/** Floating zoom controls shown on the canvas (bottom-right). */
export default function ZoomControls({ folder, zoom, onFit }: Props): JSX.Element {
  const setZoom = useUIStore((s) => s.setZoom)
  const pct = Math.round(zoom * 100)
  return (
    <div
      className="pointer-events-auto absolute bottom-3 right-3 z-30 flex items-center gap-0.5 rounded-xl border border-line bg-surface/95 p-1 shadow-lg backdrop-blur"
      data-testid="zoom-controls"
    >
      <button className="btn-ghost !p-1.5" title="Zoom out" onClick={() => setZoom(folder, clampZoom(zoom / 1.2))}>
        <Minus size={15} />
      </button>
      <button
        className="min-w-[48px] rounded-md px-1 py-1 text-center text-xs font-semibold tabular-nums text-fg hover:bg-elevated"
        title="Reset to 100%"
        onClick={() => setZoom(folder, 1)}
        data-testid="zoom-reset"
      >
        {pct}%
      </button>
      <button className="btn-ghost !p-1.5" title="Zoom in" onClick={() => setZoom(folder, clampZoom(zoom * 1.2))}>
        <Plus size={15} />
      </button>
      <span className="mx-0.5 h-5 w-px bg-line" />
      <button className="btn-ghost !p-1.5" title="Fit to screen" onClick={onFit} data-testid="zoom-fit">
        <Maximize2 size={15} />
      </button>
    </div>
  )
}
