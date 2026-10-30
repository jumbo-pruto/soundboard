export const PALETTE = [
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#84cc16',
  '#22c55e',
  '#14b8a6',
  '#06b6d4',
  '#3b82f6',
  '#6366f1',
  '#a855f7',
  '#ec4899',
  '#64748b'
]

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** Readable text color (near-black or white) for a given background hex. */
export function readableOn(hex: string | null): string | undefined {
  if (!hex) return undefined
  const rgb = hexToRgb(hex)
  if (!rgb) return undefined
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return lum > 0.45 ? '#0b0d12' : '#ffffff'
}

/** "#rrggbb" -> "r g b" triple for use in `rgb(var(--accent))`. */
export function hexToTriple(hex: string): string | null {
  const rgb = hexToRgb(hex)
  return rgb ? rgb.join(' ') : null
}
