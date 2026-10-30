import { Gauge, Pause, Play, Square, Volume2 } from 'lucide-react'
import { seek, setRate, setVolume, stop, togglePause } from '../audio/player'
import { PlayInstance, usePlayerStore } from '../store/usePlayerStore'
import { formatTime } from '../utils/path'
import Slider from './Slider'

function Row({ inst }: { inst: PlayInstance }): JSX.Element {
  const known = inst.duration > 0
  return (
    <div
      className="grid items-center gap-3 px-4 py-1.5"
      style={{ gridTemplateColumns: '190px 28px 40px minmax(120px,1fr) 40px 190px 130px 28px' }}
      data-testid="transport-row"
    >
      <div className="flex min-w-0 items-center gap-2">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full bg-accent"
          style={inst.color ? { backgroundColor: inst.color } : undefined}
        />
        <span className="truncate text-sm font-semibold" title={inst.title}>
          {inst.title}
        </span>
      </div>

      <button
        className="flex h-7 w-7 items-center justify-center rounded-full bg-elevated transition hover:bg-accent hover:text-bg"
        onClick={() => togglePause(inst.id)}
        title={inst.paused ? 'Resume' : 'Pause'}
        data-testid="transport-pause"
      >
        {inst.paused ? <Play size={13} fill="currentColor" /> : <Pause size={13} fill="currentColor" />}
      </button>

      <span className="text-right text-xs tabular-nums text-muted">{formatTime(inst.currentTime)}</span>

      <Slider
        value={known ? Math.min(inst.currentTime, inst.duration) : 0}
        min={0}
        max={known ? inst.duration : 1}
        step={0.05}
        onChange={(t) => seek(inst.id, t)}
        className="w-full"
        title="Seek"
      />

      <span className="text-xs tabular-nums text-muted">{known ? formatTime(inst.duration) : '--:--'}</span>

      <div className="flex items-center gap-1.5" title="Playback speed (double-click to reset)">
        <Gauge size={14} className="shrink-0 text-muted" />
        <Slider
          value={inst.rate}
          min={0.5}
          max={2}
          step={0.05}
          onChange={(r) => setRate(inst.id, r)}
          className="w-full"
          title="Playback speed"
        />
        <button
          className="w-11 shrink-0 text-right text-xs tabular-nums text-muted hover:text-fg"
          onClick={() => setRate(inst.id, 1)}
          title="Reset to 1×"
        >
          {inst.rate.toFixed(2)}×
        </button>
      </div>

      <div className="flex items-center gap-1.5" title="This sound's volume">
        <Volume2 size={14} className="shrink-0 text-muted" />
        <Slider
          value={inst.volume}
          min={0}
          max={1}
          onChange={(v) => setVolume(inst.id, v)}
          className="w-full"
          title="Volume"
        />
      </div>

      <button
        className="flex h-7 w-7 items-center justify-center rounded-full bg-danger/90 text-white transition hover:bg-danger"
        onClick={() => stop(inst.id)}
        title="Stop"
        data-testid="transport-stop"
      >
        <Square size={11} fill="currentColor" />
      </button>
    </div>
  )
}

export default function TransportBar(): JSX.Element {
  const instances = usePlayerStore((s) => s.instances)
  const list = Object.values(instances)

  return (
    <footer className="border-t border-line bg-surface" data-testid="transport">
      {list.length === 0 ? (
        <div className="flex h-11 items-center px-4 text-sm text-muted">
          Nothing playing — click a sound to start. Press <kbd className="mx-1 rounded bg-elevated px-1.5 py-0.5 text-xs font-bold">Esc</kbd> to stop everything.
        </div>
      ) : (
        <div className="max-h-44 divide-y divide-line/60 overflow-y-auto py-0.5">
          {list.map((inst) => (
            <Row key={inst.id} inst={inst} />
          ))}
        </div>
      )}
    </footer>
  )
}
