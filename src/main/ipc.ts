import { BrowserWindow, dialog, ipcMain } from 'electron'
import { AppConfig, Board } from '../shared/types'
import {
  folderExists,
  readBoard,
  readConfig,
  scanFolder,
  writeBoard,
  writeConfig
} from './storage'
import { unwatchFolder, watchFolder } from './watcher'

export function registerIpc(getWindow: () => BrowserWindow | null): void {
  ipcMain.handle('pick-folder', async () => {
    const win = getWindow()
    const opts = { properties: ['openDirectory' as const], title: 'Choose a sounds folder' }
    const res = win ? await dialog.showOpenDialog(win, opts) : await dialog.showOpenDialog(opts)
    return res.canceled || res.filePaths.length === 0 ? null : res.filePaths[0]
  })

  ipcMain.handle('scan-folder', (_e, folder: string, exts: string[]) => scanFolder(folder, exts))
  ipcMain.handle('folder-exists', (_e, folder: string) => folderExists(folder))

  ipcMain.handle('read-board', (_e, folder: string) => readBoard(folder))
  ipcMain.handle('write-board', (_e, folder: string, board: Board) => writeBoard(folder, board))

  ipcMain.handle('read-config', () => readConfig())
  ipcMain.handle('write-config', (_e, config: AppConfig) => writeConfig(config))

  ipcMain.handle('watch-folder', (_e, folder: string) => {
    const win = getWindow()
    if (win) watchFolder(folder, win)
  })
  ipcMain.handle('unwatch-folder', (_e, folder: string) => unwatchFolder(folder))
}
