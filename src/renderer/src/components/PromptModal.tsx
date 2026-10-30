import { useEffect, useRef, useState } from 'react'
import { useUIStore } from '../store/useUIStore'

/** Simple in-app text prompt (Electron has no window.prompt). Mount once near the app root. */
export default function PromptModal(): JSX.Element | null {
  const dialog = useUIStore((s) => s.promptDialog)
  const close = useUIStore((s) => s.closePrompt)
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (dialog) {
      setValue(dialog.value)
      setTimeout(() => inputRef.current?.select(), 0)
    }
  }, [dialog])

  if (!dialog) return null

  const submit = (): void => {
    dialog.onSubmit(value)
    close()
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-6 backdrop-blur-sm"
      onMouseDown={close}
      data-testid="prompt-modal"
    >
      <div className="pop panel w-full max-w-sm p-5 shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <p className="mb-3 text-sm font-bold">{dialog.title}</p>
        <input
          ref={inputRef}
          className="field"
          value={value}
          placeholder={dialog.placeholder}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation()
            if (e.key === 'Enter') submit()
            if (e.key === 'Escape') close()
          }}
          data-testid="prompt-input"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn" onClick={close}>
            Cancel
          </button>
          <button className="btn-accent" onClick={submit} data-testid="prompt-ok">
            OK
          </button>
        </div>
      </div>
    </div>
  )
}
