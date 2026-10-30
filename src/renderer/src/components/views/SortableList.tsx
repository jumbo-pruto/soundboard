import { ReactNode } from 'react'
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core'
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useBoardStore } from '../../store/useBoardStore'
import { Item } from '../../utils/visible'
import SoundCard from '../SoundCard'

function SortableCard({
  folder,
  item,
  variant
}: {
  folder: string
  item: Item
  variant: 'card' | 'row'
}): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.file.key
  })
  return (
    <SoundCard
      ref={setNodeRef}
      folder={folder}
      item={item}
      variant={variant}
      hotkeyLabel={item.state.hotkey}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 30 : undefined,
        opacity: isDragging ? 0.85 : undefined
      }}
      {...attributes}
      {...listeners}
    />
  )
}

interface Props {
  folder: string
  items: Item[]
  variant: 'card' | 'row'
  canReorder: boolean
  children?: ReactNode
}

/** Renders items as sortable (Edit mode) or plain cards (User mode). Caller supplies the layout container. */
export function CardCollection({ folder, items, variant, canReorder }: Props): JSX.Element {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  if (!canReorder) {
    return (
      <>
        {items.map((item) => (
          <SoundCard
            key={item.file.key}
            folder={folder}
            item={item}
            variant={variant}
            hotkeyLabel={item.state.hotkey}
          />
        ))}
      </>
    )
  }

  const ids = items.map((i) => i.file.key)
  const onDragEnd = (e: DragEndEvent): void => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const from = ids.indexOf(String(active.id))
    const to = ids.indexOf(String(over.id))
    if (from < 0 || to < 0) return
    useBoardStore.getState().setOrder(folder, arrayMove(ids, from, to))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext
        items={ids}
        strategy={variant === 'row' ? verticalListSortingStrategy : rectSortingStrategy}
      >
        {items.map((item) => (
          <SortableCard key={item.file.key} folder={folder} item={item} variant={variant} />
        ))}
      </SortableContext>
    </DndContext>
  )
}
