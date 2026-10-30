import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useUIStore } from '../store/useUIStore'

/** Global right-click menu host. Mount once near the app root; opened via useUIStore.openContextMenu. */
export default function ContextMenu(): JSX.Element | null {
  const menu = useUIStore((s) => s.contextMenu)
  const close = useUIStore((s) => s.closeContextMenu)
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })

  // keep the menu on-screen
  useLayoutEffect(() => {
    if (!menu) return
    const el = ref.current
    const w = el?.offsetWidth ?? 200
    const h = el?.offsetHeight ?? 200
    setPos({
      x: Math.min(menu.x, window.innerWidth - w - 8),
      y: Math.min(menu.y, window.innerHeight - h - 8)
    })
  }, [menu])

  useEffect(() => {
    if (!menu) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', close)
    }
  }, [menu, close])

  if (!menu) return null

  return (
    <div className="fixed inset-0 z-[60]" onMouseDown={close} onContextMenu={(e) => e.preventDefault()}>
      <div
        ref={ref}
        className="pop panel absolute min-w-[180px] overflow-hidden py-1 shadow-2xl"
        style={{ left: pos.x, top: pos.y }}
        onMouseDown={(e) => e.stopPropagation()}
        data-testid="context-menu"
      >
        {menu.items.map((item, i) =>
          item.separator ? (
            <div key={i} className="my-1 h-px bg-line" />
          ) : (
            <button
              key={i}
              disabled={item.disabled}
              onClick={() => {
                item.onClick?.()
                close()
              }}
              className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm transition disabled:opacity-40 ${
                item.danger ? 'text-danger hover:bg-danger/10' : 'text-fg hover:bg-elevated'
              }`}
            >
              {item.icon && <span className="flex w-4 justify-center">{item.icon}</span>}
              {item.label}
            </button>
          )
        )}
      </div>
    </div>
  )
}
