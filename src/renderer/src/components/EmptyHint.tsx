import { FileAudio, SearchX } from 'lucide-react'
import { TabData } from '../store/useBoardStore'
import { useUIStore } from '../store/useUIStore'

/** Shown when a tab has nothing to display (no audio files, or everything is filtered out). */
export default function EmptyHint({ tab }: { tab: TabData }): JSX.Element {
  const query = useUIStore((s) => s.query)
  const favoritesOnly = useUIStore((s) => s.favoritesOnly)
  const exts = useUIStore((s) => s.config.audioExts)
  const filtered = !!query.trim() || favoritesOnly

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center text-muted">
      {filtered ? <SearchX size={40} /> : <FileAudio size={40} />}
      {filtered ? (
        <>
          <p className="text-base font-semibold text-fg">Nothing matches</p>
          <p className="text-sm">Clear the search box or turn off the favorites filter.</p>
        </>
      ) : (
        <>
          <p className="text-base font-semibold text-fg">No sounds in this folder</p>
          <p className="max-w-md text-sm">
            Drop {exts.join(' / ')} files into <code className="text-fg">{tab.folder}</code> and
            they&apos;ll appear here automatically (or press Reload).
          </p>
        </>
      )}
    </div>
  )
}
