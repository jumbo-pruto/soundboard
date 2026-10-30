import { useMemo, useState } from 'react'
import { Rnd } from 'react-rnd'
import { TextBoxState } from '@shared/types'
import { useBoardStore, TabData } from '../../store/useBoardStore'
import { useUIStore } from '../../store/useUIStore'
import EmptyHint from '../EmptyHint'
import SoundCard from '../SoundCard'
import { useItems } from './useItems'

const GRID = 10

function CanvasText({
  folder,
  box,
  editMode,
  snap
}: {
  folder: string
  box: TextBoxState
  editMode: boolean
  snap: boolean
}): JSX.Element {
  const patch = useBoardStore((s) => s.patchTextBox)
  const selected = useUIStore(
    (s) => s.selection?.kind === 'text' && s.selection.folder === folder && s.selection.id === box.id
  )
  const [editing, setEditing] = useState(false)

  return (
    <Rnd
      size={{ width: box.w, height: box.h }}
      position={{ x: box.x, y: box.y }}
      bounds="parent"
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
        className={`flex h-full w-full items-center rounded-md px-2 ${
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
          <span className="w-full whitespace-pre-wrap break-words font-semibold leading-tight">
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

  if (items.length === 0 && tab.board.textBoxes.length === 0) return <EmptyHint tab={tab} />

  return (
    <div
      className="h-full overflow-auto"
      onClick={(e) => {
        if (editMode && e.target === e.currentTarget) useUIStore.getState().select(null)
      }}
    >
      <div
        className={`relative ${editMode ? 'canvas-grid' : ''}`}
        style={{ minWidth: '100%', minHeight: '100%', width: extent.w, height: extent.h }}
        onClick={(e) => {
          if (editMode && e.target === e.currentTarget) useUIStore.getState().select(null)
        }}
      >
        {tab.board.textBoxes.map((box) => (
          <CanvasText key={box.id} folder={tab.folder} box={box} editMode={editMode} snap={snap} />
        ))}

        {items.map((item) => {
          const c = item.state.canvas
          return (
            <Rnd
              key={item.file.key}
              size={{ width: c.w, height: c.h }}
              position={{ x: c.x, y: c.y }}
              bounds="parent"
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
              />
            </Rnd>
          )
        })}
      </div>
    </div>
  )
}
