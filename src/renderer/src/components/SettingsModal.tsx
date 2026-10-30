import { ReactNode, useEffect } from 'react'
import { Settings, X } from 'lucide-react'
import { reloadAll } from '../store/tabActions'
import { useUIStore } from '../store/useUIStore'

const ALL_EXTS = ['.mp3', '.wav', '.ogg', '.flac', '.m4a']

function Check({
  checked,
  onChange,
  label,
  hint
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  hint?: string
}): JSX.Element {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg p-2 transition hover:bg-elevated">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 accent-[rgb(var(--accent))]"
      />
      <span>
        <span className="text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
    </label>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }): JSX.Element {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  )
}

export default function SettingsModal(): JSX.Element | null {
  const open = useUIStore((s) => s.settingsOpen)
  const setOpen = useUIStore((s) => s.setSettingsOpen)
  const config = useUIStore((s) => s.config)
  const setConfig = useUIStore((s) => s.setConfig)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  if (!open) return null

  const toggleExt = (ext: string, on: boolean): void => {
    const next = on ? [...config.audioExts, ext] : config.audioExts.filter((e) => e !== ext)
    if (next.length === 0) return
    setConfig({ audioExts: next })
    // new file types only matter once folders are re-scanned
    setTimeout(() => void reloadAll(), 0)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm"
      onClick={() => setOpen(false)}
      data-testid="settings-modal"
    >
      <div
        className="pop panel max-h-full w-full max-w-2xl overflow-y-auto p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center gap-2.5">
          <Settings size={20} />
          <h2 className="text-lg font-bold">Settings</h2>
          <div className="flex-1" />
          <button className="btn-ghost" onClick={() => setOpen(false)} title="Close">
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <Field label="Theme">
            <select
              className="field cursor-pointer"
              value={config.theme}
              onChange={(e) => setConfig({ theme: e.target.value as typeof config.theme })}
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="system">Follow system</option>
            </select>
          </Field>

          <Field label="View mode">
            <select
              className="field cursor-pointer"
              value={config.viewMode}
              onChange={(e) => setConfig({ viewMode: e.target.value as typeof config.viewMode })}
            >
              <option value="list">List</option>
              <option value="grid">Grid</option>
              <option value="launchpad">Emulated launchpad</option>
              <option value="canvas">Canvas (free layout)</option>
            </select>
          </Field>

          <Field label="Button size (Grid)">
            <select
              className="field cursor-pointer"
              value={config.buttonSize}
              onChange={(e) => setConfig({ buttonSize: e.target.value as typeof config.buttonSize })}
            >
              <option value="sm">Small</option>
              <option value="md">Medium</option>
              <option value="lg">Large</option>
            </select>
          </Field>

          <Field label="Clicking a playing sound again">
            <select
              className="field cursor-pointer"
              value={config.retriggerMode}
              onChange={(e) => setConfig({ retriggerMode: e.target.value as typeof config.retriggerMode })}
            >
              <option value="restart">Restarts it from the beginning</option>
              <option value="stop">Stops it</option>
              <option value="stack">Plays another copy on top (stack)</option>
            </select>
          </Field>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-x-4">
          <Check
            checked={config.allowOverlap}
            onChange={(allowOverlap) => setConfig({ allowOverlap })}
            label="Allow sound overlapping"
            hint="Off: starting a sound stops the others."
          />
          <Check
            checked={config.hotkeysOnlyCurrentTab}
            onChange={(hotkeysOnlyCurrentTab) => setConfig({ hotkeysOnlyCurrentTab })}
            label="Hotkeys only for current tab"
          />
          <Check
            checked={config.snapToGrid}
            onChange={(snapToGrid) => setConfig({ snapToGrid })}
            label="Snap to grid (Canvas)"
            hint="Moves and resizes in 10px steps."
          />
          <Check
            checked={config.watchFolders}
            onChange={(watchFolders) => setConfig({ watchFolders })}
            label="Auto-refresh when files change"
            hint="Applies to tabs opened from now on."
          />
        </div>

        <div className="mt-4">
          <label className="label">Audio file types</label>
          <div className="flex flex-wrap gap-2">
            {ALL_EXTS.map((ext) => {
              const on = config.audioExts.includes(ext)
              return (
                <button
                  key={ext}
                  onClick={() => toggleExt(ext, !on)}
                  className={`rounded-full border px-3 py-1 text-sm font-semibold transition ${
                    on ? 'border-accent bg-accent/15 text-accent' : 'border-line text-muted hover:text-fg'
                  }`}
                >
                  {ext}
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-5 rounded-lg bg-elevated p-3 text-xs leading-relaxed text-muted">
          <b className="text-fg">Keyboard</b> — <kbd>Esc</kbd> stops everything. Custom hotkeys and launchpad
          keys work in User mode while this window is focused. The output device is chosen in the top bar.
        </div>

        <div className="mt-5 flex justify-end">
          <button className="btn-accent" onClick={() => setOpen(false)}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
