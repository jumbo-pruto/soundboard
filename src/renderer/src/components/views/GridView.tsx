import { TabData } from '../../store/useBoardStore'
import { useUIStore } from '../../store/useUIStore'
import EmptyHint from '../EmptyHint'
import { CardCollection } from './SortableList'
import { SIZE_PRESETS, useItems } from './useItems'

export default function GridView({ tab }: { tab: TabData }): JSX.Element {
  const { items, canReorder, editMode } = useItems(tab)
  const size = useUIStore((s) => s.config.buttonSize)
  const p = SIZE_PRESETS[size]

  if (items.length === 0) return <EmptyHint tab={tab} />

  return (
    <div className="h-full overflow-y-auto p-4">
      {editMode && !canReorder && (
        <p className="mb-3 text-xs text-muted">
          Reordering is off while searching, filtering, or sorting. Use <b>Custom</b> sort with no
          filters to drag buttons.
        </p>
      )}
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: `repeat(auto-fill, minmax(${p.minW}px, 1fr))`,
          gridAutoRows: `${p.h}px`
        }}
      >
        <CardCollection folder={tab.folder} items={items} variant="card" canReorder={canReorder} />
      </div>
    </div>
  )
}
