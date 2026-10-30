import { FSWatcher, watch } from 'fs'
import { BrowserWindow } from 'electron'

const watchers = new Map<string, FSWatcher>()
const timers = new Map<string, NodeJS.Timeout>()

export function watchFolder(folder: string, win: BrowserWindow): void {
  if (watchers.has(folder)) return
  try {
    const w = watch(folder, { persistent: false }, (_event, filename) => {
      // ignore our own .soundboard writes
      if (filename && filename.toString().startsWith('.soundboard')) return
      clearTimeout(timers.get(folder))
      timers.set(
        folder,
        setTimeout(() => {
          if (!win.isDestroyed()) win.webContents.send('folder-changed', folder)
        }, 400)
      )
    })
    w.on('error', () => unwatchFolder(folder))
    watchers.set(folder, w)
  } catch {
    /* folder may have disappeared; ignore */
  }
}

export function unwatchFolder(folder: string): void {
  watchers.get(folder)?.close()
  watchers.delete(folder)
  clearTimeout(timers.get(folder))
  timers.delete(folder)
}

export function unwatchAll(): void {
  for (const f of [...watchers.keys()]) unwatchFolder(f)
}
