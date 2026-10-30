import { useMemo } from 'react'
import { TabData } from '../../store/useBoardStore'
import { useUIStore } from '../../store/useUIStore'
import { getVisibleItems, Item } from '../../utils/visible'

export const SIZE_PRESETS = {
  sm: { minW: 130, h: 52 },
  md: { minW: 170, h: 72 },
  lg: { minW: 220, h: 96 }
} as const

export function useItems(tab: TabData): {
  items: Item[]
  /** drag-reorder only makes sense when the full list is visible in custom order */
  canReorder: boolean
  editMode: boolean
} {
  const query = useUIStore((s) => s.query)
  const sortMode = useUIStore((s) => s.sortMode)
  const favoritesOnly = useUIStore((s) => s.favoritesOnly)
  const editMode = useUIStore((s) => s.config.editMode)

  const items = useMemo(
    () => getVisibleItems(tab, { query, sortMode, favoritesOnly, editMode }),
    [tab, query, sortMode, favoritesOnly, editMode]
  )
  const canReorder = editMode && sortMode === 'custom' && !query.trim() && !favoritesOnly
  return { items, canReorder, editMode }
}
