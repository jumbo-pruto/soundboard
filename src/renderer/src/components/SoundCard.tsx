import { CSSProperties, forwardRef, HTMLAttributes, memo, MouseEvent } from 'react'
import { EyeOff, Heart, Pause, Play, Square } from 'lucide-react'
import { stopButton } from '../audio/player'
import { triggerItem } from '../audio/actions'
import { useBoardStore } from '../store/useBoardStore'
import { PlayInstance, usePlayerStore } from '../store/usePlayerStore'
import { useUIStore } from '../store/useUIStore'
import { readableOn } from '../utils/color'
import { formatTime } from '../utils/path'
import { Item } from '../utils/visible'

interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'onClick'> {
  folder: string
  item: Item
  variant: 'card' | 'row'
  /** key badge to show (custom hotkey or launchpad position) */
  hotkeyLabel?: string | null
}

/** The single button used by Grid / List / Launchpad / Canvas views. */
const SoundCard = forwardRef<HTMLDivElement, Props>(function SoundCard(
  { folder, item, variant, hotkeyLabel, className = '', style, ...rest },
  ref
) {
  const { file, state, displayName } = item
  const editMode = useUIStore((s) => s.config.editMode)
  const selected = useUIStore(
    (s) => s.selection?.kind === 'button' && s.selection.folder === folder && s.selection.key === file.key
  )
  const inst: PlayInstance | undefined = usePlayerStore((s) => {
    for (const i of Object.values(s.instances)) if (i.folder === folder && i.key === file.key) return i
    return undefined
  })

  const playing = !!inst
  const pct = inst && inst.duration > 0 ? Math.min(100, (inst.currentTime / inst.duration) * 100) : 0
  const textColor = readableOn(state.color)

  const onClick = (): void => {
    if (editMode) {
      useUIStore.getState().select({ kind: 'button', folder, key: file.key })
    } else {
      triggerItem(folder, item)
    }
  }
  const onStop = (e: MouseEvent): void => {
    e.stopPropagation()
    stopButton(folder, file.key)
  }
  const onFav = (e: MouseEvent): void => {
    e.stopPropagation()
    useBoardStore.getState().patchButton(folder, file.key, { favorite: !state.favorite })
  }

  const colorStyle: CSSProperties = {
    ...(state.color ? { backgroundColor: state.color, color: textColor } : {}),
    ...style
  }

  const base = [
    'group relative cursor-pointer overflow-hidden border text-left transition select-none',
    state.color ? 'border-transparent' : 'border-line bg-elevated text-fg hover:border-accent/70',
    playing ? 'animate-pulseGlow ring-2 ring-accent' : 'hover:brightness-110 active:scale-[0.985]',
    selected && editMode ? 'outline outline-2 outline-offset-2 outline-fg' : '',
    state.hidden ? 'opacity-40' : '',
    variant === 'card' ? 'rounded-xl' : 'rounded-lg',
    className
  ].join(' ')

  const stopBtn = playing && (
    <button
      type="button"
      title="Stop"
      onClick={onStop}
      className="absolute bottom-1.5 right-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-danger"
    >
      <Square size={11} fill="currentColor" />
    </button>
  )

  const heart = (state.favorite || editMode) && (
    <button
      type="button"
      title={state.favorite ? 'Remove from favorites' : 'Add to favorites'}
      onClick={onFav}
      className={`z-10 transition ${state.favorite ? 'opacity-90' : 'opacity-0 group-hover:opacity-60'} hover:!opacity-100`}
    >
      <Heart size={13} fill={state.favorite ? 'currentColor' : 'none'} />
    </button>
  )

  const keyBadge = hotkeyLabel && (
    <span className="rounded bg-black/35 px-1.5 py-px text-[10px] font-bold tracking-wide text-white/90">
      {hotkeyLabel}
    </span>
  )

  if (variant === 'row') {
    return (
      <div
        ref={ref}
        role="button"
        data-testid="sound-card"
        data-key={file.key}
        className={`${base} flex h-11 items-center gap-2.5 px-3`}
        style={colorStyle}
        onClick={onClick}
        {...rest}
      >
        {playing && (
          <div className="absolute inset-y-0 left-0 bg-white/20" style={{ width: `${pct}%` }} />
        )}
        <span className="relative z-[1] flex h-5 w-5 shrink-0 items-center justify-center">
          {playing ? (
            inst?.paused ? <Pause size={14} /> : <Play size={14} fill="currentColor" />
          ) : (
            <Play size={14} className="opacity-50" />
          )}
        </span>
        <span className="relative z-[1] min-w-0 flex-1 truncate text-sm font-semibold">
          {displayName}
        </span>
        {state.hidden && <EyeOff size={13} className="relative z-[1] opacity-70" />}
        {inst && (
          <span className="relative z-[1] text-xs tabular-nums opacity-80">
            {formatTime(inst.currentTime)} / {inst.duration ? formatTime(inst.duration) : '--:--'}
          </span>
        )}
        <span className="relative z-[1] flex items-center gap-2">
          {keyBadge}
          {heart}
        </span>
        {playing && (
          <button
            type="button"
            title="Stop"
            onClick={onStop}
            className="relative z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white transition hover:bg-danger"
          >
            <Square size={11} fill="currentColor" />
          </button>
        )}
      </div>
    )
  }

  return (
    <div
      ref={ref}
      role="button"
      data-testid="sound-card"
      data-key={file.key}
      className={`${base} flex h-full min-h-[56px] w-full items-center justify-center px-3 py-2`}
      style={colorStyle}
      onClick={onClick}
      {...rest}
    >
      {playing && (
        <div
          className="absolute inset-y-0 left-0 bg-white/20 transition-[width] duration-100"
          style={{ width: `${pct}%` }}
        />
      )}
      <div className="absolute left-2 top-1.5 flex items-center gap-1">{heart}</div>
      <div className="absolute right-2 top-1.5 flex items-center gap-1">
        {state.hidden && <EyeOff size={12} className="opacity-70" />}
        {keyBadge}
      </div>
      <span className="relative z-[1] line-clamp-3 break-words px-2 text-center text-sm font-semibold leading-tight">
        {displayName}
      </span>
      {inst && (
        <span className="absolute bottom-1.5 left-2.5 z-[1] text-[10px] tabular-nums opacity-85">
          {inst.paused ? '⏸ ' : ''}
          {formatTime(inst.currentTime)}
          {inst.duration ? ` / ${formatTime(inst.duration)}` : ''}
        </span>
      )}
      {stopBtn}
    </div>
  )
})

export default memo(SoundCard)
