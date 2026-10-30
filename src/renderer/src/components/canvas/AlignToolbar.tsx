import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalSpaceAround,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalSpaceAround
} from 'lucide-react'
import { useBoardStore } from '../../store/useBoardStore'
import { useUIStore } from '../../store/useUIStore'
import { CanvasOp } from '../../utils/align'

/** Floating align/distribute toolbar, shown when 2+ canvas items are selected. */
export default function AlignToolbar({
  folder,
  keys,
  textIds
}: {
  folder: string
  keys: string[]
  textIds: string[]
}): JSX.Element {
  const applyCanvasOp = useBoardStore((s) => s.applyCanvasOp)
  const count = keys.length + textIds.length
  const run = (op: CanvasOp): void => applyCanvasOp(folder, keys, textIds, op)

  const Btn = ({ op, title, children }: { op: CanvasOp; title: string; children: JSX.Element }): JSX.Element => (
    <button className="btn-ghost !p-1.5" title={title} onClick={() => run(op)} data-testid={`align-${op}`}>
      {children}
    </button>
  )

  return (
    <div
      className="pop absolute left-1/2 top-3 z-30 flex -translate-x-1/2 items-center gap-0.5 rounded-xl border border-line bg-surface/95 p-1 shadow-lg backdrop-blur"
      data-testid="align-toolbar"
    >
      <span className="px-2 text-xs font-semibold text-muted">{count} selected</span>
      <span className="mx-0.5 h-5 w-px bg-line" />
      <Btn op="left" title="Align left">
        <AlignStartVertical size={15} />
      </Btn>
      <Btn op="hcenter" title="Align horizontal centers">
        <AlignCenterVertical size={15} />
      </Btn>
      <Btn op="right" title="Align right">
        <AlignEndVertical size={15} />
      </Btn>
      <span className="mx-0.5 h-5 w-px bg-line" />
      <Btn op="top" title="Align top">
        <AlignStartHorizontal size={15} />
      </Btn>
      <Btn op="vmiddle" title="Align vertical centers">
        <AlignCenterHorizontal size={15} />
      </Btn>
      <Btn op="bottom" title="Align bottom">
        <AlignEndHorizontal size={15} />
      </Btn>
      <span className="mx-0.5 h-5 w-px bg-line" />
      <Btn op="dist-h" title="Distribute horizontally (3+)">
        <AlignHorizontalSpaceAround size={15} />
      </Btn>
      <Btn op="dist-v" title="Distribute vertically (3+)">
        <AlignVerticalSpaceAround size={15} />
      </Btn>
      <span className="mx-0.5 h-5 w-px bg-line" />
      <button
        className="btn-ghost !px-2 text-xs"
        onClick={() => useUIStore.getState().clearCanvasSel()}
        title="Clear selection"
      >
        Done
      </button>
    </div>
  )
}
