// Generates a handful of short sine/sweep .wav files for trying out the soundboard.
// Usage: node scripts/gen-test-sounds.mjs [outputDir]
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const outDir = resolve(process.argv[2] ?? 'test-sounds')
mkdirSync(outDir, { recursive: true })

const RATE = 22050

function wav(samples) {
  const data = Buffer.alloc(samples.length * 2)
  samples.forEach((s, i) => data.writeInt16LE(Math.max(-1, Math.min(1, s)) * 32767, i * 2))
  const h = Buffer.alloc(44)
  h.write('RIFF', 0)
  h.writeUInt32LE(36 + data.length, 4)
  h.write('WAVEfmt ', 8)
  h.writeUInt32LE(16, 16)
  h.writeUInt16LE(1, 20) // PCM
  h.writeUInt16LE(1, 22) // mono
  h.writeUInt32LE(RATE, 24)
  h.writeUInt32LE(RATE * 2, 28)
  h.writeUInt16LE(2, 32)
  h.writeUInt16LE(16, 34)
  h.write('data', 36)
  h.writeUInt32LE(data.length, 40)
  return Buffer.concat([h, data])
}

/** freq(t) in Hz; amplitude has a short attack/release so there are no clicks. */
function tone(seconds, freq, amp = 0.35) {
  const n = Math.floor(seconds * RATE)
  const out = new Array(n)
  let phase = 0
  for (let i = 0; i < n; i++) {
    const t = i / RATE
    phase += (2 * Math.PI * freq(t)) / RATE
    const env = Math.min(1, t / 0.01, (seconds - t) / 0.03)
    out[i] = Math.sin(phase) * amp * env
  }
  return out
}

const sounds = {
  'Airhorn Drop': tone(2.5, (t) => 440 + 40 * Math.sin(t * 30)),
  'Rimshot Ba-dum-tss': [
    ...tone(0.15, () => 196),
    ...tone(0.15, () => 147),
    ...tone(0.6, (t) => 2000 - 1200 * t)
  ],
  'Sad Trombone': [
    ...tone(0.5, () => 233),
    ...tone(0.5, () => 220),
    ...tone(0.5, () => 208),
    ...tone(1.2, (t) => 196 - 25 * Math.sin(t * 20))
  ],
  'Level Up': tone(1.6, (t) => 300 + 600 * t),
  'Long Drone (seek me)': tone(12, (t) => 110 + 20 * Math.sin(t * 2), 0.25),
  'Ding': tone(0.8, () => 1320),
  'Applause-ish noise': Array.from({ length: RATE * 3 }, (_, i) => {
    const t = i / RATE
    return (Math.random() * 2 - 1) * 0.25 * Math.min(1, t / 0.2, (3 - t) / 0.4)
  })
}

for (const [name, samples] of Object.entries(sounds)) {
  writeFileSync(join(outDir, `${name}.wav`), wav(samples))
}
console.log(`Wrote ${Object.keys(sounds).length} files to ${outDir}`)
