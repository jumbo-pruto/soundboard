import { play } from './player'
import { Item } from '../utils/visible'

/** Trigger one board button using its saved per-button defaults. */
export function triggerItem(folder: string, item: Item): void {
  play({
    folder,
    key: item.file.key,
    path: item.file.file,
    title: item.displayName,
    color: item.state.color,
    volume: item.state.volume,
    rate: item.state.rate,
    retrigger: item.state.retrigger
  })
}
