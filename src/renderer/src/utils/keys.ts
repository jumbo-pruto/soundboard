/** Keyboard-position helpers. We key off KeyboardEvent.code so layouts/shift don't matter. */

export const LAUNCHPAD_ROWS: string[][] = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/']
]
export const LAUNCHPAD_KEYS: string[] = LAUNCHPAD_ROWS.flat()
export const LAUNCHPAD_PAGE_SIZE = LAUNCHPAD_KEYS.length

const PUNCT: Record<string, string> = {
  Semicolon: ';',
  Comma: ',',
  Period: '.',
  Slash: '/',
  Minus: '-',
  Equal: '=',
  BracketLeft: '[',
  BracketRight: ']',
  Quote: "'",
  Backquote: '`',
  Backslash: '\\'
}

/** KeyboardEvent.code -> short label stored in board.json ("A", "5", "F3", ";"). null = not assignable. */
export function codeToLabel(code: string): string | null {
  if (/^Key[A-Z]$/.test(code)) return code.slice(3)
  if (/^Digit[0-9]$/.test(code)) return code.slice(5)
  if (/^Numpad[0-9]$/.test(code)) return `Num${code.slice(6)}`
  if (/^F([1-9]|1[0-2])$/.test(code)) return code
  if (PUNCT[code]) return PUNCT[code]
  return null
}

export function isTypingTarget(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null
  if (!el || !el.tagName) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable
}
