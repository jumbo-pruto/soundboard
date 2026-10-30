import { CSSProperties } from 'react'

interface Props {
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
  className?: string
  title?: string
  ariaLabel?: string
}

/** Range input whose filled portion follows the accent color. */
export default function Slider({
  value,
  min,
  max,
  step = 0.01,
  onChange,
  className = '',
  title,
  ariaLabel
}: Props): JSX.Element {
  const span = max - min || 1
  const pct = Math.min(100, Math.max(0, ((value - min) / span) * 100))
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      title={title}
      aria-label={ariaLabel ?? title}
      className={className}
      style={{ '--pct': `${pct}%` } as CSSProperties}
      onChange={(e) => onChange(parseFloat(e.target.value))}
    />
  )
}
