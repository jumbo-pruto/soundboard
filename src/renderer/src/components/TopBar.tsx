import {
  AudioLines,
  Lock,
  Moon,
  Pencil,
  RefreshCw,
  Settings,
  Square,
  Sun,
  Volume1,
  Volume2,
  VolumeX
} from 'lucide-react'
import { stopAll } from '../audio/player'
import { useMediaDevices } from '../hooks/useMediaDevices'
import { usePlayerStore } from '../store/usePlayerStore'
import { useUIStore } from '../store/useUIStore'
import Slider from './Slider'

export default function TopBar(): JSX.Element {
  const config = useUIStore((s) => s.config)
  const setConfig = useUIStore((s) => s.setConfig)
  const select = useUIStore((s) => s.select)
  const setSettingsOpen = useUIStore((s) => s.setSettingsOpen)
  const playingCount = usePlayerStore((s) => Object.keys(s.instances).length)
  const { devices, refresh } = useMediaDevices()

  const vol = config.masterVolume
  const VolIcon = vol === 0 ? VolumeX : vol < 0.5 ? Volume1 : Volume2
  const isDark =
    config.theme === 'dark' ||
    (config.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  const savedDeviceMissing =
    config.outputDeviceId !== 'default' && !devices.some((d) => d.deviceId === config.outputDeviceId)

  return (
    <header className="flex items-center gap-4 border-b border-line bg-surface px-4 py-2.5">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-bg">
          <AudioLines size={20} strokeWidth={2.5} />
        </div>
        <span className="text-base font-bold tracking-tight">Soundboard</span>
      </div>

      <button
        onClick={stopAll}
        title="Stop all sounds (Esc)"
        data-testid="stop-all"
        className={`flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-extrabold tracking-wide transition active:scale-95 ${
          playingCount > 0
            ? 'bg-danger text-white shadow-[0_0_18px_rgb(var(--danger)/0.45)] hover:brightness-110'
            : 'bg-elevated text-muted hover:text-fg'
        }`}
      >
        <Square size={14} fill="currentColor" />
        STOP{playingCount > 0 ? ` (${playingCount})` : ''}
      </button>

      <div className="flex items-center gap-2" title="Master volume">
        <button
          className="btn-ghost !p-1.5"
          onClick={() => setConfig({ masterVolume: vol === 0 ? 1 : 0 })}
          title={vol === 0 ? 'Unmute' : 'Mute'}
        >
          <VolIcon size={18} />
        </button>
        <Slider
          value={vol}
          min={0}
          max={1}
          onChange={(v) => setConfig({ masterVolume: v })}
          className="w-36"
          title="Master volume"
        />
        <span className="w-9 text-xs tabular-nums text-muted">{Math.round(vol * 100)}%</span>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-1.5">
        <select
          className="field max-w-[260px] cursor-pointer !py-1.5"
          value={savedDeviceMissing ? 'default' : config.outputDeviceId}
          onChange={(e) => setConfig({ outputDeviceId: e.target.value })}
          title="Audio output device"
          aria-label="Audio output device"
        >
          <option value="default">System default output</option>
          {devices.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label}
            </option>
          ))}
        </select>
        <button className="btn-ghost !p-1.5" onClick={() => void refresh()} title="Refresh devices">
          <RefreshCw size={16} />
        </button>
      </div>

      <div
        className="flex rounded-xl border border-line bg-bg p-0.5"
        role="group"
        aria-label="Mode"
      >
        <button
          data-testid="mode-user"
          onClick={() => {
            setConfig({ editMode: false })
            select(null)
          }}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
            !config.editMode ? 'bg-accent text-bg' : 'text-muted hover:text-fg'
          }`}
          title="User mode: layout locked, just play"
        >
          <Lock size={14} /> User
        </button>
        <button
          data-testid="mode-edit"
          onClick={() => setConfig({ editMode: true })}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
            config.editMode ? 'bg-amber-400 text-black' : 'text-muted hover:text-fg'
          }`}
          title="Edit mode: arrange, recolor, annotate"
        >
          <Pencil size={14} /> Edit
        </button>
      </div>

      <div className="flex items-center gap-0.5">
        <button
          className="btn-ghost !p-2"
          onClick={() => setConfig({ theme: isDark ? 'light' : 'dark' })}
          title="Toggle light / dark"
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button
          className="btn-ghost !p-2"
          onClick={() => setSettingsOpen(true)}
          title="Settings"
          data-testid="open-settings"
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  )
}
