import { protocol } from 'electron'
import { createReadStream, promises as fs } from 'fs'
import { extname } from 'path'
import { Readable } from 'stream'

const MIME: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.flac': 'audio/flac',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac'
}

/** Must be called BEFORE app is ready. */
export function registerSoundScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'sound',
      privileges: {
        standard: true,
        secure: true,
        stream: true,
        supportFetchAPI: true,
        bypassCSP: true
      }
    }
  ])
}

/** Call after app is ready. URL form: sound://local/<encodeURIComponent(absPath)> */
export function handleSoundScheme(): void {
  protocol.handle('sound', async (request) => {
    try {
      const url = new URL(request.url)
      const absPath = decodeURIComponent(url.pathname.replace(/^\//, ''))
      const stat = await fs.stat(absPath)
      const size = stat.size
      const type = MIME[extname(absPath).toLowerCase()] ?? 'application/octet-stream'
      const range = request.headers.get('range')

      if (range) {
        const m = /bytes=(\d*)-(\d*)/.exec(range)
        if (m) {
          let start = m[1] ? parseInt(m[1], 10) : 0
          let end = m[2] ? parseInt(m[2], 10) : size - 1
          if (!m[1] && m[2]) {
            // suffix range: last N bytes
            start = Math.max(0, size - parseInt(m[2], 10))
            end = size - 1
          }
          end = Math.min(end, size - 1)
          if (start > end || start >= size) {
            return new Response(null, {
              status: 416,
              headers: { 'Content-Range': `bytes */${size}` }
            })
          }
          const stream = Readable.toWeb(
            createReadStream(absPath, { start, end })
          ) as unknown as ReadableStream
          return new Response(stream, {
            status: 206,
            headers: {
              'Content-Type': type,
              'Content-Length': String(end - start + 1),
              'Content-Range': `bytes ${start}-${end}/${size}`,
              'Accept-Ranges': 'bytes'
            }
          })
        }
      }

      const stream = Readable.toWeb(createReadStream(absPath)) as unknown as ReadableStream
      return new Response(stream, {
        status: 200,
        headers: {
          'Content-Type': type,
          'Content-Length': String(size),
          'Accept-Ranges': 'bytes'
        }
      })
    } catch {
      return new Response('Not found', { status: 404 })
    }
  })
}
