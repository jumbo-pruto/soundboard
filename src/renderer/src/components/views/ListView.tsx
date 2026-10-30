import { TabData } from '../../store/useBoardStore'
import EmptyHint from '../EmptyHint'
import { CardCollection } from './SortableList'
import { useItems } from './useItems'

export default function ListView({ tab }: { tab: TabData }): JSX.Element {
  const { items, canReorder, editMode } = useItems(tab)

  if (items.length === 0) return <EmptyHint tab={tab} />

  return (
    <div className="h-full overflow-y-auto p-4">
      {editMode && !canReorder && (
        <p className="mb-3 text-xs text-muted">
          Reordering is off while searching, filtering, or sorting. Use <b>Custom</b> sort with no
          filters to drag rows.
        </p>
      )}
      <div className="mx-auto flex max-w-4xl flex-col gap-1.5">
        <CardCollection folder={tab.folder} items={items} variant="row" canReorder={canReorder} />
      </div>
    </div>
  )
}
