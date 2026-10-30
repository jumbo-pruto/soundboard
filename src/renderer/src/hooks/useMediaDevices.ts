import { useCallback, useEffect, useState } from 'react'

export interface OutputDevice {
  deviceId: string
  label: string
}

let unlocked = false

/** Output-device labels are blank until the page has had media permission once. */
async function unlockLabels(): Promise<void> {
  if (unlocked) return
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    stream.getTracks().forEach((t) => t.stop())
    unlocked = true
  } catch {
    // no mic / permission denied: devices still list, just with generic names
  }
}

export function useMediaDevices(): { devices: OutputDevice[]; refresh: () => Promise<void> } {
  const [devices, setDevices] = useState<OutputDevice[]>([])

  const refresh = useCallback(async () => {
    await unlockLabels()
    const all = await navigator.mediaDevices.enumerateDevices()
    const outs = all
      .filter((d) => d.kind === 'audiooutput')
      // we show our own "System default"; hide Chromium's virtual aliases
      .filter((d) => d.deviceId !== 'default' && d.deviceId !== 'communications')
      .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Output device ${i + 1}` }))
    setDevices(outs)
  }, [])

  useEffect(() => {
    void refresh()
    navigator.mediaDevices.addEventListener('devicechange', refresh)
    return () => navigator.mediaDevices.removeEventListener('devicechange', refresh)
  }, [refresh])

  return { devices, refresh }
}
