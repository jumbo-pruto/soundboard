import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type { AppConfig, Board, ScannedFile } from '../shared/types'

const api = {
  pickFolder: (): Promise<string | null> => ipcRenderer.invoke('pick-folder'),
  /** Absolute path of a dropped File/folder (File.path was removed in modern Electron). */
  pathForFile: (file: File): string => webUtils.getPathForFile(file),
  scanFolder: (folder: string, exts: string[]): Promise<ScannedFile[]> =>
    ipcRenderer.invoke('scan-folder', folder, exts),
  folderExists: (folder: string): Promise<boolean> => ipcRenderer.invoke('folder-exists', folder),
  readBoard: (folder: string): Promise<Board | null> => ipcRenderer.invoke('read-board', folder),
  writeBoard: (folder: string, board: Board): Promise<void> =>
    ipcRenderer.invoke('write-board', folder, board),
  readConfig: (): Promise<AppConfig> => ipcRenderer.invoke('read-config'),
  writeConfig: (config: AppConfig): Promise<void> => ipcRenderer.invoke('write-config', config),
  watchFolder: (folder: string): Promise<void> => ipcRenderer.invoke('watch-folder', folder),
  unwatchFolder: (folder: string): Promise<void> => ipcRenderer.invoke('unwatch-folder', folder),
  onFolderChanged: (cb: (folder: string) => void): (() => void) => {
    const handler = (_e: unknown, folder: string): void => cb(folder)
    ipcRenderer.on('folder-changed', handler)
    return () => ipcRenderer.removeListener('folder-changed', handler)
  }
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
