import { promises as fs } from 'fs'
import { dirname } from 'path'

/** Read JSON; returns null if missing or corrupt (corrupt files are kept as .corrupt for recovery). */
export async function readJson<T>(path: string): Promise<T | null> {
  let raw: string
  try {
    raw = await fs.readFile(path, 'utf8')
  } catch {
    return null
  }
  try {
    return JSON.parse(raw) as T
  } catch {
    try {
      await fs.rename(path, `${path}.corrupt`)
    } catch {
      /* ignore */
    }
    return null
  }
}

/** Atomic write: temp file + rename, so a crash mid-save can't corrupt the real file. */
export async function writeJsonAtomic(path: string, data: unknown): Promise<void> {
  await fs.mkdir(dirname(path), { recursive: true })
  const tmp = `${path}.${process.pid}.tmp`
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8')
  await fs.rename(tmp, path)
}
