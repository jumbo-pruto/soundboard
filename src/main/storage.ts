import { app } from 'electron'
import { promises as fs } from 'fs'
import { basename, extname, join } from 'path'
import { readJson, writeJsonAtomic } from './jsonStore'
import { AppConfig, Board, DEFAULT_CONFIG, migrateConfig, ScannedFile } from '../shared/types'

const configPath = (): string => join(app.getPath('userData'), 'config.json')
const boardPath = (folder: string): string => join(folder, '.soundboard', 'board.json')

export async function readConfig(): Promise<AppConfig> {
  const raw = await readJson<Record<string, unknown>>(configPath())
  const saved = migrateConfig(raw) as Partial<AppConfig>
  // merge over defaults so newly added settings always have a value
  return { ...DEFAULT_CONFIG, ...saved, window: { ...DEFAULT_CONFIG.window, ...(saved.window ?? {}) } }
}

export async function writeConfig(config: AppConfig): Promise<void> {
  await writeJsonAtomic(configPath(), config)
}

export async function readBoard(folder: string): Promise<Board | null> {
  return readJson<Board>(boardPath(folder))
}

export async function writeBoard(folder: string, board: Board): Promise<void> {
  await writeJsonAtomic(boardPath(folder), board)
}

export async function folderExists(folder: string): Promise<boolean> {
  try {
    return (await fs.stat(folder)).isDirectory()
  } catch {
    return false
  }
}

export async function scanFolder(folder: string, exts: string[]): Promise<ScannedFile[]> {
  const allowed = new Set(exts.map((e) => e.toLowerCase()))
  const entries = await fs.readdir(folder, { withFileTypes: true })
  const files: ScannedFile[] = []
  for (const entry of entries) {
    if (!entry.isFile()) continue
    const ext = extname(entry.name).toLowerCase()
    if (!allowed.has(ext)) continue
    files.push({
      name: basename(entry.name, extname(entry.name)),
      key: entry.name,
      file: join(folder, entry.name),
      ext
    })
  }
  files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))
  return files
}
