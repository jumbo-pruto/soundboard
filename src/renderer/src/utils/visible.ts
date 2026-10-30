import { ButtonState, ScannedFile, SortMode } from '@shared/types'
import { TabData } from '../store/useBoardStore'

export interface Item {
  file: ScannedFile
  state: ButtonState
  displayName: string
}

export interface VisibleOpts {
  query: string
  sortMode: SortMode
  favoritesOnly: boolean
  editMode: boolean
}

export function displayName(file: ScannedFile, state: ButtonState): string {
  return state.label?.trim() ? state.label : file.name
}

/** Items for a tab after applying hidden/search/favorites/sort. Hidden items stay visible (dimmed) in Edit mode. */
export function getVisibleItems(tab: TabData, opts: VisibleOpts): Item[] {
  const q = opts.query.trim().toLowerCase()
  let items: Item[] = []
  for (const file of tab.files) {
    const state = tab.board.buttons[file.key]
    if (!state) continue
    if (state.hidden && !opts.editMode) continue
    if (opts.favoritesOnly && !state.favorite) continue
    const name = displayName(file, state)
    if (q && !name.toLowerCase().includes(q)) continue
    items.push({ file, state, displayName: name })
  }

  switch (opts.sortMode) {
    case 'name':
      items = items.sort((a, b) =>
        a.displayName.localeCompare(b.displayName, undefined, { numeric: true, sensitivity: 'base' })
      )
      break
    case 'favorites':
      items = items.sort(
        (a, b) =>
          Number(b.state.favorite) - Number(a.state.favorite) ||
          a.displayName.localeCompare(b.displayName, undefined, { numeric: true, sensitivity: 'base' })
      )
      break
    default:
      items = items.sort((a, b) => a.state.order - b.state.order)
  }
  return items
}
