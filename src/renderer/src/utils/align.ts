export type CanvasOp =
  | 'left'
  | 'hcenter'
  | 'right'
  | 'top'
  | 'vmiddle'
  | 'bottom'
  | 'dist-h'
  | 'dist-v'

export interface AlignRect {
  id: string
  x: number
  y: number
  w: number
  h: number
}

/** Compute new x/y for each rect under an align/distribute op. Needs >=2 rects (>=3 for distribute). */
export function computeAlign(rects: AlignRect[], op: CanvasOp): Map<string, { x: number; y: number }> {
  const out = new Map<string, { x: number; y: number }>()
  if (rects.length < 2) return out

  const minX = Math.min(...rects.map((r) => r.x))
  const maxX = Math.max(...rects.map((r) => r.x + r.w))
  const minY = Math.min(...rects.map((r) => r.y))
  const maxY = Math.max(...rects.map((r) => r.y + r.h))
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2

  const set = (r: AlignRect, x: number, y: number): void => void out.set(r.id, { x: Math.round(x), y: Math.round(y) })

  switch (op) {
    case 'left':
      rects.forEach((r) => set(r, minX, r.y))
      break
    case 'right':
      rects.forEach((r) => set(r, maxX - r.w, r.y))
      break
    case 'hcenter':
      rects.forEach((r) => set(r, cx - r.w / 2, r.y))
      break
    case 'top':
      rects.forEach((r) => set(r, r.x, minY))
      break
    case 'bottom':
      rects.forEach((r) => set(r, r.x, maxY - r.h))
      break
    case 'vmiddle':
      rects.forEach((r) => set(r, r.x, cy - r.h / 2))
      break
    case 'dist-h': {
      if (rects.length < 3) break
      const sorted = [...rects].sort((a, b) => a.x - b.x)
      const totalW = sorted.reduce((s, r) => s + r.w, 0)
      const gap = (maxX - minX - totalW) / (sorted.length - 1)
      let x = minX
      for (const r of sorted) {
        set(r, x, r.y)
        x += r.w + gap
      }
      break
    }
    case 'dist-v': {
      if (rects.length < 3) break
      const sorted = [...rects].sort((a, b) => a.y - b.y)
      const totalH = sorted.reduce((s, r) => s + r.h, 0)
      const gap = (maxY - minY - totalH) / (sorted.length - 1)
      let y = minY
      for (const r of sorted) {
        set(r, r.x, y)
        y += r.h + gap
      }
      break
    }
  }
  return out
}
