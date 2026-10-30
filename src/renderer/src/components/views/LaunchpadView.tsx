import { ChevronLeft, ChevronRight } from 'lucide-react'
import { TabData } from '../../store/useBoardStore'
import { useUIStore } from '../../store/useUIStore'
import { LAUNCHPAD_KEYS, LAUNCHPAD_PAGE_SIZE } from '../../utils/keys'
import EmptyHint from '../EmptyHint'
import SoundCard from '../SoundCard'
import { useItems } from './useItems'

/** Soundux-style "emulated launchpad": 10x4 pad per page, keyboard position = trigger key. */
export default function LaunchpadView({ tab }: { tab: TabData }): JSX.Element {
  const { items, editMode } = useItems(tab)
  const page = useUIStore((s) => s.launchpadPage)
  const setPage = useUIStore((s) => s.setLaunchpadPage)

  if (items.length === 0) return <EmptyHint tab={tab} />

  const pages = Math.max(1, Math.ceil(items.length / LAUNCHPAD_PAGE_SIZE))
  const cur = Math.min(page, pages - 1)
  const slice = items.slice(cur * LAUNCHPAD_PAGE_SIZE, (cur + 1) * LAUNCHPAD_PAGE_SIZE)

  return (
    <div className="flex h-full flex-col p-4">
      <div
        className="grid flex-1 gap-2.5"
        style={{
          gridTemplateColumns: 'repeat(10, minmax(0, 1fr))',
          gridTemplateRows: 'repeat(4, minmax(64px, 1fr))'
        }}
      >
        {LAUNCHPAD_KEYS.map((key, i) => {
          const item = slice[i]
          return item ? (
            <SoundCard
              key={item.file.key}
              folder={tab.folder}
              item={item}
              variant="card"
              hotkeyLabel={item.state.hotkey ?? key}
            />
          ) : (
            <div
              key={`empty-${key}`}
              className="relative rounded-xl border border-dashed border-line/60"
            >
              <span className="absolute right-2 top-1.5 text-[10px] font-bold text-muted/50">
                {key}
              </span>
            </div>
          )
        })}
      </div>

      <div className="mt-3 flex items-center justify-center gap-1.5">
        <button className="btn-ghost" disabled={cur === 0} onClick={() => setPage(cur - 1)}>
          <ChevronLeft size={16} />
        </button>
        {Array.from({ length: pages }, (_, n) => (
          <button
            key={n}
            onClick={() => setPage(n)}
            className={`h-7 min-w-7 rounded-full px-2 text-xs font-semibold transition ${
              n === cur ? 'bg-accent text-bg' : 'text-muted hover:bg-elevated hover:text-fg'
            }`}
          >
            {n + 1}
          </button>
        ))}
        <button className="btn-ghost" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)}>
          <ChevronRight size={16} />
        </button>
      </div>
      {editMode && (
        <p className="mt-1 text-center text-xs text-muted">
          Launchpad keys follow the keyboard layout. Reorder in Grid view; set a custom key per button
          in the inspector.
        </p>
      )}
    </div>
  )
}
