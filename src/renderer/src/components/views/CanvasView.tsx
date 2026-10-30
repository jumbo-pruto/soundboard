import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Rnd } from 'react-rnd'
import { TextBoxState } from '@shared/types'
import { useBoardStore, TabData } from '../../store/useBoardStore'
import { clampZoom, useUIStore } from '../../store/useUIStore'
import AlignToolbar from '../canvas/AlignToolbar'
import ZoomControls from '../canvas/ZoomControls'
import EmptyHint from '../EmptyHint'
import SoundCard from '../SoundCard'
import { useItems } from './useItems'

const GRID = 10

interface Marquee {
  x: number
  y: number
  w: number
  h: number
}

function CanvasText({
  folder,
  box,
  editMode,
  snap,
  scale,
  multiSelected
}: {
  folder: string
  box: TextBoxState
  editMode: boolean
  snap: boolean
  scale: number
  multiSelected: boolean
}): JSX.Element {
  const patch = useBoardStore((s) => s.patchTextBox)
  const nudgeCanvas = useBoardStore((s) => s.nudgeCanvas)
  const selected = useUIStore(
    (s) => s.selection?.kind === 'text' && s.selection.folder === folder && s.selection.id === box.id
  )
  const [editing, setEditing] = useState(false)

  const vAlignClass = box.valign === 'top' ? 'items-start' : box.valign === 'bottom' ? 'items-end' : 'items-center'
  const textAlignClass = box.align === 'center' ? 'text-center' : box.align === 'right' ? 'text-right' : 'text-left'

  const selectThis = (additive: boolean): void => {
    if (additive) useUIStore.getState().toggleCanvasItem(folder, 'text', box.id)
    else useUIStore.getState().setCanvasSel(folder, [], [box.id])
    useUIStore.getState().select({ kind: 'text', folder, id: box.id })
  }

  return (
    <Rnd
      size={{ width: box.w, height: box.h }}
      position={{ x: box.x, y: box.y }}
      bounds="parent"
      scale={scale}
      minWidth={60}
      minHeight={24}
      dragGrid={snap ? [GRID, GRID] : undefined}
      resizeGrid={snap ? [GRID, GRID] : undefined}
      disableDragging={!editMode || editing}
      enableResizing={editMode && !editing}
      cancel="textarea"
      onDragStart={() => {
        const s = useUIStore.getState().canvasSel
        if (!(s.folder === folder && s.textIds.includes(box.id))) selectThis(false)
      }}
      onDragStop={(_e, d) => {
        const dx = d.x - box.x
        const dy = d.y - box.y
        const s = useUIStore.getState().canvasSel
        const grouped = s.folder === folder && s.textIds.includes(box.id) && s.keys.length + s.textIds.length > 1
        if (grouped) nudgeCanvas(folder, s.keys, s.textIds, dx, dy)
        else patch(folder, box.id, { x: d.x, y: d.y })
      }}
      onResizeStop={(_e, _dir, ref, _delta, pos) =>
        patch(folder, box.id, { w: ref.offsetWidth, h: ref.offsetHeight, x: pos.x, y: pos.y })
      }
      style={{ zIndex: 1 }}
    >
      <div
        className={`flex h-full w-full ${vAlignClass} rounded-md px-2 ${
          editMode ? 'outline-dashed outline-1 outline-line' : ''
        } ${selected && editMode ? '!outline-solid !outline-2 !outline-fg' : ''} ${
          multiSelected && editMode ? '!outline-solid !outline-2 !outline-accent' : ''
        }`}
        style={{ background: box.bg, color: box.color, fontSize: box.fontSize }}
        onClick={(e) => editMode && selectThis(e.shiftKey)}
        onDoubleClick={() => editMode && setEditing(true)}
      >
        {editing ? (
          <textarea
            autoFocus
            defaultValue={box.text}
            className="h-full w-full resize-none bg-transparent leading-tight outline-none"
            style={{ color: 'inherit', fontSize: 'inherit' }}
            onBlur={(e) => {
              patch(folder, box.id, { text: e.target.value })
              setEditing(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') (e.target as HTMLTextAreaElement).blur()
              e.stopPropagation()
            }}
          />
        ) : (
          <span className={`w-full whitespace-pre-wrap break-words font-semibold leading-tight ${textAlignClass}`}>
            {box.text}
          </span>
        )}
      </div>
    </Rnd>
  )
}

export default function CanvasView({ tab }: { tab: TabData }): JSX.Element {
  const { items, editMode } = useItems(tab)
  const snap = useUIStore((s) => s.config.snapToGrid)
  const patchButton = useBoardStore((s) => s.patchButton)
  const nudgeCanvas = useBoardStore((s) => s.nudgeCanvas)
  const zoom = useUIStore((s) => s.canvasZoom[tab.folder] ?? 1)
  const setZoom = useUIStore((s) => s.setZoom)
  const canvasSel = useUIStore((s) => s.canvasSel)
  const sel = canvasSel.folder === tab.folder ? canvasSel : { folder: tab.folder, keys: [], textIds: [] }
  const selCount = sel.keys.length + sel.textIds.length
  const scrollRef = useRef<HTMLDivElement>(null)
  const surfaceRef = useRef<HTMLDivElement>(null)
  const [marquee, setMarquee] = useState<Marquee | null>(null)

  const extent = useMemo(() => {
    let w = 0
    let h = 0
    for (const { state } of items) {
      w = Math.max(w, state.canvas.x + state.canvas.w)
      h = Math.max(h, state.canvas.y + state.canvas.h)
    }
    for (const t of tab.board.textBoxes) {
      w = Math.max(w, t.x + t.w)
      h = Math.max(h, t.y + t.h)
    }
    return { w: w + 240, h: h + 240 }
  }, [items, tab.board.textBoxes])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onWheel = (e: WheelEvent): void => {
      if (!e.ctrlKey) return
      e.preventDefault()
      const cur = useUIStore.getState().canvasZoom[tab.folder] ?? 1
      const next = clampZoom(cur * (e.deltaY < 0 ? 1.15 : 1 / 1.15))
      if (next === cur) return
      const rect = el.getBoundingClientRect()
      const px = e.clientX - rect.left
      const py = e.clientY - rect.top
      const ratio = next / cur
      useUIStore.getState().setZoom(tab.folder, next)
      requestAnimationFrame(() => {
        el.scrollLeft = (el.scrollLeft + px) * ratio - px
        el.scrollTop = (el.scrollTop + py) * ratio - py
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [tab.folder])

  const fit = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const z = clampZoom(Math.min(el.clientWidth / extent.w, el.clientHeight / extent.h, 1))
    setZoom(tab.folder, z)
    el.scrollTo({ left: 0, top: 0 })
  }, [extent.w, extent.h, setZoom, tab.folder])

  // marquee drag on empty canvas → select intersecting items
  const onSurfaceMouseDown = (e: React.MouseEvent): void => {
    if (!editMode || e.target !== e.currentTarget || e.button !== 0) return
    const surface = surfaceRef.current
    if (!surface) return
    const rect = surface.getBoundingClientRect()
    const toCanvas = (cx: number, cy: number): { x: number; y: number } => ({
      x: (cx - rect.left) / zoom,
      y: (cy - rect.top) / zoom
    })
    const start = toCanvas(e.clientX, e.clientY)
    useUIStore.getState().select(null)
    const move = (ev: MouseEvent): void => {
      const p = toCanvas(ev.clientX, ev.clientY)
      setMarquee({
        x: Math.min(start.x, p.x),
        y: Math.min(start.y, p.y),
        w: Math.abs(p.x - start.x),
        h: Math.abs(p.y - start.y)
      })
    }
    const up = (ev: MouseEvent): void => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
      const p = toCanvas(ev.clientX, ev.clientY)
      const m = { x: Math.min(start.x, p.x), y: Math.min(start.y, p.y), w: Math.abs(p.x - start.x), h: Math.abs(p.y - start.y) }
      setMarquee(null)
      if (m.w < 5 && m.h < 5) {
        useUIStore.getState().clearCanvasSel()
        return
      }
      const hit = (x: number, y: number, w: number, h: number): boolean =>
        x < m.x + m.w && x + w > m.x && y < m.y + m.h && y + h > m.y
      const keys = items.filter((it) => hit(it.state.canvas.x, it.state.canvas.y, it.state.canvas.w, it.state.canvas.h)).map((it) => it.file.key)
      const textIds = tab.board.textBoxes.filter((t) => hit(t.x, t.y, t.w, t.h)).map((t) => t.id)
      useUIStore.getState().setCanvasSel(tab.folder, keys, textIds)
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  }

  if (items.length === 0 && tab.board.textBoxes.length === 0) return <EmptyHint tab={tab} />

  return (
    <div className="relative h-full">
      <div ref={scrollRef} className="h-full overflow-auto">
        <div
          className="relative"
          style={{ width: extent.w * zoom, height: extent.h * zoom, minWidth: '100%', minHeight: '100%' }}
        >
          <div
            ref={surfaceRef}
            className={`absolute left-0 top-0 ${editMode ? 'canvas-grid' : ''}`}
            style={{ width: extent.w, height: extent.h, transform: `scale(${zoom})`, transformOrigin: 'top left' }}
            onMouseDown={onSurfaceMouseDown}
          >
            {tab.board.textBoxes.map((box) => (
              <CanvasText
                key={box.id}
                folder={tab.folder}
                box={box}
                editMode={editMode}
                snap={snap}
                scale={zoom}
                multiSelected={sel.textIds.includes(box.id)}
              />
            ))}

            {items.map((item) => {
              const c = item.state.canvas
              const key = item.file.key
              return (
                <Rnd
                  key={key}
                  size={{ width: c.w, height: c.h }}
                  position={{ x: c.x, y: c.y }}
                  bounds="parent"
                  scale={zoom}
                  minWidth={80}
                  minHeight={44}
                  dragGrid={snap ? [GRID, GRID] : undefined}
                  resizeGrid={snap ? [GRID, GRID] : undefined}
                  disableDragging={!editMode}
                  enableResizing={editMode}
                  onDragStart={() => {
                    const s = useUIStore.getState().canvasSel
                    if (!(s.folder === tab.folder && s.keys.includes(key))) {
                      useUIStore.getState().setCanvasSel(tab.folder, [key], [])
                      useUIStore.getState().select({ kind: 'button', folder: tab.folder, key })
                    }
                  }}
                  onDragStop={(_e, d) => {
                    const dx = d.x - c.x
                    const dy = d.y - c.y
                    const s = useUIStore.getState().canvasSel
                    const grouped = s.folder === tab.folder && s.keys.includes(key) && s.keys.length + s.textIds.length > 1
                    if (grouped) nudgeCanvas(tab.folder, s.keys, s.textIds, dx, dy)
                    else patchButton(tab.folder, key, { canvas: { ...c, x: d.x, y: d.y } })
                  }}
                  onResizeStop={(_e, _dir, ref, _delta, pos) =>
                    patchButton(tab.folder, key, {
                      canvas: { x: pos.x, y: pos.y, w: ref.offsetWidth, h: ref.offsetHeight }
                    })
                  }
                  style={{ zIndex: 2 }}
                >
                  <SoundCard
                    folder={tab.folder}
                    item={item}
                    variant="card"
                    hotkeyLabel={item.state.hotkey}
                    fontSize={item.state.canvasFontSize ?? undefined}
                    multiSelected={sel.keys.includes(key)}
                    onEditSelect={(additive) => {
                      if (additive) {
                        useUIStore.getState().toggleCanvasItem(tab.folder, 'button', key)
                      } else {
                        useUIStore.getState().setCanvasSel(tab.folder, [key], [])
                      }
                      useUIStore.getState().select({ kind: 'button', folder: tab.folder, key })
                    }}
                  />
                </Rnd>
              )
            })}

            {marquee && (
              <div
                className="pointer-events-none absolute border border-accent bg-accent/15"
                style={{ left: marquee.x, top: marquee.y, width: marquee.w, height: marquee.h }}
              />
            )}
          </div>
        </div>
      </div>
      {editMode && selCount >= 2 && <AlignToolbar folder={tab.folder} keys={sel.keys} textIds={sel.textIds} />}
      <ZoomControls folder={tab.folder} zoom={zoom} onFit={fit} />
    </div>
  )
}
