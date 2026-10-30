import { useEffect, useState } from 'react'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  AlignVerticalSpaceAround,
  ArrowDownToLine,
  ArrowUpToLine,
  EyeOff,
  Heart,
  Keyboard,
  Play,
  RotateCcw,
  Trash2,
  X
} from 'lucide-react'
import { ButtonState, TextBoxState } from '@shared/types'
import { triggerItem } from '../audio/actions'
import { useBoardStore, TabData } from '../store/useBoardStore'
import { useUIStore } from '../store/useUIStore'
import { PALETTE } from '../utils/color'
import { codeToLabel } from '../utils/keys'
import { baseName } from '../utils/path'
import { displayName } from '../utils/visible'
import Slider from './Slider'

function Swatches({
  value,
  onPick,
  allowNone = true
}: {
  value: string | null
  onPick: (c: string | null) => void
  allowNone?: boolean
}): JSX.Element {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {allowNone && (
        <button
          title="Default"
          onClick={() => onPick(null)}
          className={`flex h-6 w-6 items-center justify-center rounded-full border border-line bg-elevated text-muted ${
            value === null ? 'ring-2 ring-fg ring-offset-1 ring-offset-surface' : ''
          }`}
        >
          <X size={12} />
        </button>
      )}
      {PALETTE.map((c) => (
        <button
          key={c}
          title={c}
          onClick={() => onPick(c)}
          className={`h-6 w-6 rounded-full transition hover:scale-110 ${
            value?.toLowerCase() === c ? 'ring-2 ring-fg ring-offset-1 ring-offset-surface' : ''
          }`}
          style={{ backgroundColor: c }}
        />
      ))}
      <label
        title="Custom color"
        className="relative h-6 w-6 cursor-pointer overflow-hidden rounded-full border border-line"
        style={{ background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)' }}
      >
        <input
          type="color"
          className="absolute inset-0 cursor-pointer opacity-0"
          value={value && /^#[0-9a-f]{6}$/i.test(value) ? value : '#7c9cff'}
          onChange={(e) => onPick(e.target.value)}
        />
      </label>
    </div>
  )
}

function HotkeyField({
  value,
  onChange
}: {
  value: string | null
  onChange: (v: string | null) => void
}): JSX.Element {
  const [capturing, setCapturing] = useState(false)
  const setKeyCapture = useUIStore((s) => s.setKeyCapture)

  useEffect(() => {
    if (!capturing) return
    setKeyCapture(true)
    const onKey = (e: KeyboardEvent): void => {
      e.preventDefault()
      e.stopPropagation()
      if (e.key === 'Escape') return setCapturing(false)
      if (e.key === 'Backspace' || e.key === 'Delete') {
        onChange(null)
        return setCapturing(false)
      }
      const label = codeToLabel(e.code)
      if (!label) return
      onChange(label)
      setCapturing(false)
    }
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      setKeyCapture(false)
    }
  }, [capturing, onChange, setKeyCapture])

  return (
    <div className="flex gap-1.5">
      <button
        className={`btn flex-1 !justify-start ${capturing ? '!border-accent !text-accent' : ''}`}
        onClick={() => setCapturing((c) => !c)}
        onBlur={() => setCapturing(false)}
      >
        <Keyboard size={14} />
        {capturing ? 'Press a key… (Esc cancels)' : value ?? 'Not set — click to assign'}
      </button>
      {value && (
        <button className="btn-ghost" title="Clear hotkey" onClick={() => onChange(null)}>
          <X size={14} />
        </button>
      )}
    </div>
  )
}

function ButtonInspector({ tab, fileKey }: { tab: TabData; fileKey: string }): JSX.Element | null {
  const patchButton = useBoardStore((s) => s.patchButton)
  const file = tab.files.find((f) => f.key === fileKey)
  const state = tab.board.buttons[fileKey]
  if (!file || !state) return null
  const patch = (p: Partial<ButtonState>): void => patchButton(tab.folder, fileKey, p)

  const setHotkey = (hk: string | null): void => {
    if (hk) {
      // a key can only trigger one sound per tab: take it from whoever had it
      for (const [k, b] of Object.entries(tab.board.buttons)) {
        if (k !== fileKey && b.hotkey === hk) patchButton(tab.folder, k, { hotkey: null })
      }
    }
    patch({ hotkey: hk })
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="truncate text-sm font-bold" title={file.key}>
          {file.key}
        </p>
        <button
          className="btn-accent mt-2 w-full"
          onClick={() => triggerItem(tab.folder, { file, state, displayName: displayName(file, state) })}
        >
          <Play size={14} fill="currentColor" /> Test play
        </button>
      </div>

      <div>
        <label className="label">Label</label>
        <input
          className="field"
          placeholder={file.name}
          value={state.label ?? ''}
          onChange={(e) => patch({ label: e.target.value || null })}
          onKeyDown={(e) => e.stopPropagation()}
        />
      </div>

      <div>
        <label className="label">Color</label>
        <Swatches value={state.color} onPick={(color) => patch({ color })} />
      </div>

      <div>
        <label className="label">Hotkey (User mode)</label>
        <HotkeyField value={state.hotkey} onChange={setHotkey} />
      </div>

      <div className="flex gap-2">
        <button
          className={`btn flex-1 ${state.favorite ? '!border-accent !text-accent' : ''}`}
          onClick={() => patch({ favorite: !state.favorite })}
        >
          <Heart size={14} fill={state.favorite ? 'currentColor' : 'none'} /> Favorite
        </button>
        <button
          className={`btn flex-1 ${state.hidden ? '!border-amber-400 !text-amber-400' : ''}`}
          onClick={() => patch({ hidden: !state.hidden })}
          title="Hidden buttons only show in Edit mode"
        >
          <EyeOff size={14} /> {state.hidden ? 'Hidden' : 'Hide'}
        </button>
      </div>

      <div>
        <label className="label">
          Default volume <span className="float-right normal-case">{Math.round(state.volume * 100)}%</span>
        </label>
        <Slider value={state.volume} min={0} max={1} onChange={(volume) => patch({ volume })} className="w-full" />
      </div>

      <div>
        <label className="label">
          Default speed
          <span className="float-right normal-case">
            {state.rate.toFixed(2)}×{' '}
            <button className="ml-1 text-accent" onClick={() => patch({ rate: 1 })} title="Reset">
              <RotateCcw size={10} className="inline" />
            </button>
          </span>
        </label>
        <Slider value={state.rate} min={0.5} max={2} step={0.05} onChange={(rate) => patch({ rate })} className="w-full" />
      </div>

      <div>
        <label className="label">
          Canvas text size
          <span className="float-right normal-case">
            {state.canvasFontSize == null ? 'Auto' : `${state.canvasFontSize}px`}
            <button
              className="ml-1 text-accent"
              onClick={() => patch({ canvasFontSize: null })}
              title="Auto (default)"
            >
              <RotateCcw size={10} className="inline" />
            </button>
          </span>
        </label>
        <Slider
          value={state.canvasFontSize ?? 14}
          min={10}
          max={40}
          step={1}
          onChange={(canvasFontSize) => patch({ canvasFontSize })}
          className="w-full"
        />
      </div>

      <div>
        <label className="label">Re-click behavior</label>
        <select
          className="field cursor-pointer"
          value={state.retrigger}
          onChange={(e) => patch({ retrigger: e.target.value as ButtonState['retrigger'] })}
        >
          <option value="default">Use global setting</option>
          <option value="restart">Restart</option>
          <option value="stop">Stop</option>
          <option value="stack">Stack another copy</option>
        </select>
      </div>
    </div>
  )
}

function TextInspector({ tab, id }: { tab: TabData; id: string }): JSX.Element | null {
  const patchTextBox = useBoardStore((s) => s.patchTextBox)
  const removeTextBox = useBoardStore((s) => s.removeTextBox)
  const select = useUIStore((s) => s.select)
  const box = tab.board.textBoxes.find((t) => t.id === id)
  if (!box) return null
  const patch = (p: Partial<TextBoxState>): void => patchTextBox(tab.folder, id, p)

  return (
    <div className="space-y-4">
      <p className="text-sm font-bold">Text box</p>
      <div>
        <label className="label">Text</label>
        <textarea
          className="field min-h-[72px] resize-y"
          value={box.text}
          onChange={(e) => patch({ text: e.target.value })}
          onKeyDown={(e) => e.stopPropagation()}
        />
        <p className="mt-1 text-[11px] text-muted">Tip: double-click a text box on the canvas to edit inline.</p>
      </div>
      <div>
        <label className="label">
          Font size <span className="float-right normal-case">{box.fontSize}px</span>
        </label>
        <Slider value={box.fontSize} min={10} max={72} step={1} onChange={(fontSize) => patch({ fontSize })} className="w-full" />
      </div>
      <div>
        <label className="label">Alignment</label>
        <div className="flex gap-2">
          <div className="flex rounded-lg border border-line p-0.5">
            {([
              ['left', AlignLeft],
              ['center', AlignCenter],
              ['right', AlignRight]
            ] as const).map(([val, Icon]) => (
              <button
                key={val}
                title={`Align ${val}`}
                onClick={() => patch({ align: val })}
                className={`rounded-md p-1.5 transition ${box.align === val ? 'bg-accent text-bg' : 'text-muted hover:text-fg'}`}
              >
                <Icon size={15} />
              </button>
            ))}
          </div>
          <div className="flex rounded-lg border border-line p-0.5">
            {([
              ['top', ArrowUpToLine],
              ['middle', AlignVerticalSpaceAround],
              ['bottom', ArrowDownToLine]
            ] as const).map(([val, Icon]) => (
              <button
                key={val}
                title={`Vertical ${val}`}
                onClick={() => patch({ valign: val })}
                className={`rounded-md p-1.5 transition ${box.valign === val ? 'bg-accent text-bg' : 'text-muted hover:text-fg'}`}
              >
                <Icon size={15} />
              </button>
            ))}
          </div>
        </div>
      </div>
      <div>
        <label className="label">Text color</label>
        <Swatches value={box.color} allowNone={false} onPick={(c) => patch({ color: c ?? '#ffffff' })} />
      </div>
      <div>
        <label className="label">Background</label>
        <Swatches value={box.bg === 'transparent' ? null : box.bg} onPick={(c) => patch({ bg: c ?? 'transparent' })} />
      </div>
      <button
        className="btn w-full !text-danger"
        onClick={() => {
          removeTextBox(tab.folder, id)
          select(null)
        }}
      >
        <Trash2 size={14} /> Delete text box
      </button>
    </div>
  )
}

function TabInspector({ tab }: { tab: TabData }): JSX.Element {
  const patchTab = useBoardStore((s) => s.patchTab)
  return (
    <div className="space-y-4">
      <p className="text-sm font-bold">Tab settings</p>
      <div>
        <label className="label">Tab name</label>
        <input
          className="field"
          placeholder={baseName(tab.folder)}
          value={tab.board.tab.name ?? ''}
          onChange={(e) => patchTab(tab.folder, { name: e.target.value || null })}
          onKeyDown={(e) => e.stopPropagation()}
        />
      </div>
      <div>
        <label className="label">Tab accent color</label>
        <Swatches value={tab.board.tab.accent} onPick={(accent) => patchTab(tab.folder, { accent })} />
      </div>
      <div>
        <label className="label">Folder</label>
        <p className="break-all text-xs text-muted">{tab.folder}</p>
        <p className="mt-1 break-all text-xs text-muted">
          Layout is saved in <code>.soundboard/board.json</code> inside this folder.
        </p>
      </div>
      <div className="rounded-lg bg-elevated p-3 text-xs leading-relaxed text-muted">
        <b className="text-fg">Edit mode tips</b>
        <ul className="mt-1 list-disc space-y-0.5 pl-4">
          <li>Click a button to select it and edit it here.</li>
          <li>Grid / List: drag buttons to reorder.</li>
          <li>Canvas: drag to move, pull edges to resize, add text boxes.</li>
          <li>Switch to <b>User</b> mode to lock everything before the show.</li>
        </ul>
      </div>
    </div>
  )
}

export default function Inspector(): JSX.Element | null {
  const activeTab = useUIStore((s) => s.config.activeTab)
  const selection = useUIStore((s) => s.selection)
  const tab = useBoardStore((s) => (activeTab ? s.tabs[activeTab] : undefined))
  if (!tab || tab.status !== 'ready') return null

  const sel = selection && selection.folder === tab.folder ? selection : null

  return (
    <aside className="w-72 shrink-0 overflow-y-auto border-l border-line bg-surface p-4" data-testid="inspector">
      {sel?.kind === 'button' ? (
        <ButtonInspector tab={tab} fileKey={sel.key} />
      ) : sel?.kind === 'text' ? (
        <TextInspector tab={tab} id={sel.id} />
      ) : (
        <TabInspector tab={tab} />
      )}
    </aside>
  )
}
