import { create } from 'zustand'

export interface PlayInstance {
  id: string
  folder: string
  key: string
  title: string
  color: string | null
  duration: number
  currentTime: number
  paused: boolean
  rate: number
  /** per-instance volume 0..1 (master volume is applied on top) */
  volume: number
}

interface PlayerState {
  instances: Record<string, PlayInstance>
}

/** Pure UI mirror of playback; all mutation goes through audio/player.ts. */
export const usePlayerStore = create<PlayerState>(() => ({ instances: {} }))
