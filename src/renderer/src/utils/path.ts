/** Last path segment of a Windows or POSIX path. */
export function baseName(p: string): string {
  const parts = p.split(/[\\/]+/).filter(Boolean)
  return parts[parts.length - 1] ?? p
}

/** URL served by the main-process `sound://` protocol handler (supports Range / seeking). */
export function soundUrl(absPath: string): string {
  return `sound://local/${encodeURIComponent(absPath)}`
}

export function formatTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) sec = 0
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
