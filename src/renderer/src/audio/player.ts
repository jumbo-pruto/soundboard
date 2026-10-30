import { nanoid } from 'nanoid'
import { RetriggerPref } from '@shared/types'
import { soundUrl } from '../utils/path'
import { PlayInstance, usePlayerStore } from '../store/usePlayerStore'
import { useUIStore } from '../store/useUIStore'

/**
 * Audio engine. One <audio> element per playing instance; a pool of pre-buffered idle
 * elements (one per file) makes the first trigger of a sound effectively instant.
 */

const MAX_POOL = 120
const elements = new Map<string, HTMLAudioElement>()
const pool = new Map<string, HTMLAudioElement>()
const cleanups = new Map<string, () => void>()

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n))
const master = (): number => useUIStore.getState().config.masterVolume
const wantedSink = (): string => {
  const id = useUIStore.getState().config.outputDeviceId
  return id === 'default' ? '' : id
}

async function applySink(el: HTMLAudioElement): Promise<void> {
  const want = wantedSink()
  if (el.sinkId === want) return
  try {
    await el.setSinkId(want)
  } catch {
    // device unplugged / unknown id -> fall back to system default rather than staying silent
    try {
      await el.setSinkId('')
    } catch {
      /* nothing more we can do */
    }
  }
}

function createElement(path: string): HTMLAudioElement {
  const el = new Audio()
  el.preload = 'auto'
  el.src = soundUrl(path)
  return el
}

/** Pre-buffer idle elements so the first click plays with no load delay. */
export function preload(paths: string[]): void {
  for (const path of paths) {
    if (pool.size >= MAX_POOL) return
    if (pool.has(path)) continue
    const el = createElement(path)
    pool.set(path, el)
    void applySink(el)
  }
}

export function dropPreloaded(paths: string[]): void {
  for (const path of paths) {
    const el = pool.get(path)
    if (!el) continue
    el.removeAttribute('src')
    el.load()
    pool.delete(path)
  }
}

function patchInstance(id: string, patch: Partial<PlayInstance>): void {
  const { instances } = usePlayerStore.getState()
  const cur = instances[id]
  if (!cur) return
  usePlayerStore.setState({ instances: { ...instances, [id]: { ...cur, ...patch } } })
}

function finish(id: string): void {
  const el = elements.get(id)
  cleanups.get(id)?.()
  cleanups.delete(id)
  if (el) {
    el.pause()
    el.removeAttribute('src')
    el.load() // release the file handle
    elements.delete(id)
  }
  const { instances } = usePlayerStore.getState()
  if (instances[id]) {
    const next = { ...instances }
    delete next[id]
    usePlayerStore.setState({ instances: next })
  }
}

// ---- progress ticker: ~15fps while anything is playing ----
let rafId = 0
let lastTick = 0
function tick(now: number): void {
  rafId = 0
  const { instances } = usePlayerStore.getState()
  const ids = Object.keys(instances)
  if (ids.length === 0) return
  if (now - lastTick >= 66) {
    lastTick = now
    let next: Record<string, PlayInstance> | null = null
    for (const id of ids) {
      const el = elements.get(id)
      if (!el) continue
      const cur = instances[id]
      const duration = isFinite(el.duration) ? el.duration : 0
      if (cur.currentTime !== el.currentTime || cur.paused !== el.paused || cur.duration !== duration) {
        next ??= { ...instances }
        next[id] = { ...cur, currentTime: el.currentTime, paused: el.paused, duration }
      }
    }
    if (next) usePlayerStore.setState({ instances: next })
  }
  rafId = requestAnimationFrame(tick)
}
function ensureTicker(): void {
  if (!rafId) rafId = requestAnimationFrame(tick)
}

export interface PlayOpts {
  folder: string
  key: string
  path: string
  title: string
  color: string | null
  volume: number
  rate: number
  /** per-button re-click behavior; 'default' follows the global setting */
  retrigger: RetriggerPref
}

export function findInstance(folder: string, key: string): PlayInstance | undefined {
  return Object.values(usePlayerStore.getState().instances).find(
    (i) => i.folder === folder && i.key === key
  )
}

/** Trigger a sound. Honors the overlap + retrigger settings. */
export function play(opts: PlayOpts): void {
  const { allowOverlap, retriggerMode } = useUIStore.getState().config
  const effective = opts.retrigger === 'default' ? retriggerMode : opts.retrigger

  // 'stack' skips the dedup entirely so copies pile up (great for short sounds)
  if (effective !== 'stack') {
    const existing = findInstance(opts.folder, opts.key)
    if (existing) {
      if (effective === 'restart') restart(existing.id)
      else stop(existing.id)
      return
    }
    if (!allowOverlap) stopAll()
  }

  const id = nanoid(8)
  let el = pool.get(opts.path)
  if (el) pool.delete(opts.path)
  else el = createElement(opts.path)

  const volume = clamp01(opts.volume)
  el.volume = clamp01(master() * volume)
  el.playbackRate = opts.rate
  el.currentTime = 0
  elements.set(id, el)

  const onEnded = (): void => finish(id)
  const onError = (): void => finish(id)
  const onMeta = (): void => {
    if (isFinite(el!.duration)) patchInstance(id, { duration: el!.duration })
  }
  el.addEventListener('ended', onEnded)
  el.addEventListener('error', onError)
  el.addEventListener('loadedmetadata', onMeta)
  el.addEventListener('durationchange', onMeta)
  cleanups.set(id, () => {
    el!.removeEventListener('ended', onEnded)
    el!.removeEventListener('error', onError)
    el!.removeEventListener('loadedmetadata', onMeta)
    el!.removeEventListener('durationchange', onMeta)
  })

  usePlayerStore.setState({
    instances: {
      ...usePlayerStore.getState().instances,
      [id]: {
        id,
        folder: opts.folder,
        key: opts.key,
        title: opts.title,
        color: opts.color,
        duration: isFinite(el.duration) ? el.duration : 0,
        currentTime: 0,
        paused: false,
        rate: opts.rate,
        volume
      }
    }
  })
  ensureTicker()

  const start = (): void => {
    el!.play().catch(() => finish(id))
  }
  // only pay the (async) sink switch cost if this element isn't already on the right device
  if (el.sinkId !== wantedSink()) void applySink(el).then(start)
  else start()

  // refill the pool so the next trigger of this sound is instant too
  setTimeout(() => preload([opts.path]), 80)
}

export function restart(id: string): void {
  const el = elements.get(id)
  if (!el) return
  el.currentTime = 0
  void el.play().catch(() => finish(id))
}

export function stop(id: string): void {
  finish(id)
}

export function stopAll(): void {
  for (const id of Object.keys(usePlayerStore.getState().instances)) finish(id)
}

export function stopButton(folder: string, key: string): void {
  for (const i of Object.values(usePlayerStore.getState().instances)) {
    if (i.folder === folder && i.key === key) finish(i.id)
  }
}

export function stopFolder(folder: string): void {
  for (const i of Object.values(usePlayerStore.getState().instances)) {
    if (i.folder === folder) finish(i.id)
  }
}

export function togglePause(id: string): void {
  const el = elements.get(id)
  if (!el) return
  if (el.paused) void el.play()
  else el.pause()
  patchInstance(id, { paused: el.paused })
}

export function seek(id: string, seconds: number): void {
  const el = elements.get(id)
  if (!el) return
  el.currentTime = Math.max(0, seconds)
  patchInstance(id, { currentTime: el.currentTime })
}

export function setRate(id: string, rate: number): void {
  const el = elements.get(id)
  if (!el) return
  el.playbackRate = rate
  patchInstance(id, { rate })
}

export function setVolume(id: string, volume: number): void {
  const el = elements.get(id)
  if (!el) return
  el.volume = clamp01(master() * volume)
  patchInstance(id, { volume })
}

// ---- keep live elements in sync with global settings ----
let lastMaster = master()
let lastSink = wantedSink()
useUIStore.subscribe((state) => {
  const m = state.config.masterVolume
  if (m !== lastMaster) {
    lastMaster = m
    const { instances } = usePlayerStore.getState()
    for (const [id, el] of elements) el.volume = clamp01(m * (instances[id]?.volume ?? 1))
  }
  const sink = state.config.outputDeviceId === 'default' ? '' : state.config.outputDeviceId
  if (sink !== lastSink) {
    lastSink = sink
    for (const el of elements.values()) void applySink(el)
    for (const el of pool.values()) void applySink(el)
  }
})
