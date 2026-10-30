import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Rnd } from 'react-rnd'
import { TextBoxState } from '@shared/types'
import { useBoardStore, TabData } from '../../store/useBoardStore'
import { clampZoom, useUIStore } from '../../store/useUIStore'
import ZoomControls from '../canvas/ZoomControls'
import EmptyHint from '../EmptyHint'
import SoundCard from '../SoundCard'
import { useItems } from './useItems'

const GRID = 10

function CanvasText({
  folder,
  box,
  editMode,
  snap,
  scale
}: {
  folder: string
  box: TextBoxState
  editMode: boolean
  snap: boolean
  scale: number
}): JSX.Element {
  const patch = useBoardStore((s) => s.patchTextBox)
  const selected = useUIStore(
    (s) => s.selection?.kind === 'text' && s.selection.folder === folder && s.selection.id === box.id
  )
  const [editing, setEditing] = useState(false)

  const vAlignClass =
    box.valign === 'top' ? 'items-start' : box.valign === 'bottom' ? 'items-end' : 'items-center'
  const textAlignClass =
    box.align === 'center' ? 'text-center' : box.align === 'right' ? 'text-right' : 'text-left'

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
      onDragStart={() => useUIStore.getState().select({ kind: 'text', folder, id: box.id })}
      onDragStop={(_e, d) => patch(folder, box.id, { x: d.x, y: d.y })}
      onResizeStop={(_e, _dir, ref, _delta, pos) =>
        patch(folder, box.id, { w: ref.offsetWidth, h: ref.offsetHeight, x: pos.x, y: pos.y })
      }
      style={{ zIndex: 1 }}
    >
      <div
        className={`flex h-full w-full ${vAlignClass} rounded-md px-2 ${
          editMode ? 'outline-dashed outline-1 outline-line' : ''
        } ${selected && editMode ? '!outline-solid !outline-2 !outline-fg' : ''}`}
        style={{ background: box.bg, color: box.color, fontSize: box.fontSize }}
        onClick={() => editMode && useUIStore.getState().select({ kind: 'text', folder, id: box.id })}
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
          <span
            className={`w-full whitespace-pre-wrap break-words font-semibold leading-tight ${textAlignClass}`}
          >
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
  const zoom = useUIStore((s) => s.canvasZoom[tab.folder] ?? 1)
  const setZoom = useUIStore((s) => s.setZoom)
  const scrollRef = useRef<HTMLDivElement>(null)

  // let the scrollable surface grow with the content so nothing is ever out of reach
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

  // Ctrl/pinch wheel zoom toward the cursor (native non-passive listener so preventDefault works)
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

  const deselect = (e: React.MouseEvent): void => {
    if (editMode && e.target === e.currentTarget) useUIStore.getState().select(null)
  }

  if (items.length === 0 && tab.board.textBoxes.length === 0) return <EmptyHint tab={tab} />

  return (
    <div className="relative h-full">
      <div ref={scrollRef} className="h-full overflow-auto" onClick={deselect}>
        <div
          className="relative"
          style={{ width: extent.w * zoom, height: extent.h * zoom, minWidth: '100%', minHeight: '100%' }}
          onClick={deselect}
        >
          <div
            className={`absolute left-0 top-0 ${editMode ? 'canvas-grid' : ''}`}
            style={{ width: extent.w, height: extent.h, transform: `scale(${zoom})`, transformOrigin: 'top left' }}
            onClick={deselect}
          >
            {tab.board.textBoxes.map((box) => (
              <CanvasText key={box.id} folder={tab.folder} box={box} editMode={editMode} snap={snap} scale={zoom} />
            ))}

            {items.map((item) => {
              const c = item.state.canvas
              return (
                <Rnd
                  key={item.file.key}
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
              onDragStart={() =>
                useUIStore.getState().select({ kind: 'button', folder: tab.folder, key: item.file.key })
              }
              onDragStop={(_e, d) =>
                patchButton(tab.folder, item.file.key, { canvas: { ...c, x: d.x, y: d.y } })
              }
              onResizeStop={(_e, _dir, ref, _delta, pos) =>
                patchButton(tab.folder, item.file.key, {
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
              />
            </Rnd>
              )
            })}
          </div>
        </div>
      </div>
      <ZoomControls folder={tab.folder} zoom={zoom} onFit={fit} />
    </div>
  )
}
