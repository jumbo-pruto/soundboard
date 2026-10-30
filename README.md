# Soundboard

A fast desktop soundboard built for live events: point it at folders, every `.mp3`/`.wav` becomes a button, click to play. Inspired by [Soundux](https://github.com/Soundux/Soundux), with a free-form **Canvas** layout added.

## Run it

```bash
npm install
npm run dev          # development (hot reload)
npm run build && npm start   # production build, run locally
npm run package:win  # unpacked Windows app -> release/win-unpacked/Soundboard.exe
npm run gen-test-sounds -- ./test-sounds   # makes a few sample .wav files to try
```

> npm may block Electron's postinstall script on newer npm versions. If `npm run dev` says Electron failed to install, run `node node_modules/electron/install.js` once.

## Using it

1. **Add folder** (or drag a folder onto the window). The folder becomes a tab; each audio file becomes a button named after the file.
2. **Click a button** to play. The bottom transport bar shows, per playing sound: pause/resume, seek bar, elapsed/duration, speed (0.5×–2×), volume, stop. The big red **STOP** (or `Esc`) silences everything.
3. **Output device** is chosen top-right (system default or any output). Master volume is next to STOP.
4. **User mode** (default on every launch) locks the layout: clicking only plays. **Edit mode** unlocks it — click a button to edit it in the side panel (label, color, hotkey, favorite, hide, default volume/speed); drag to reorder in Grid/List; drag + resize on Canvas; add text boxes on Canvas.

### Views
| View | What it is |
| --- | --- |
| List | Compact rows with progress |
| Grid | Responsive cards (button size in Settings) |
| Launchpad | 10×4 pads per page; the key at that keyboard position triggers the pad (`1`–`0`, `Q`–`P`, `A`–`;`, `Z`–`/`) |
| **Canvas** | Free x/y placement, resizable buttons, text boxes, snap-to-grid |

### Hotkeys (only while the window is focused)
- `Esc` — stop everything
- Per-button custom hotkeys (Edit mode → select button → Hotkey), active in User mode
- Launchpad position keys when in Launchpad view; `PageUp/PageDown` are not bound, use the page buttons

## Where your data lives

- **Per folder:** `<your folder>/.soundboard/board.json` — labels, colors, order, hotkeys, favorites, canvas positions, text boxes. Delete it to reset that folder's layout. Writes are atomic.
- **Global:** `%APPDATA%/soundboard/config.json` — open tabs, theme, view mode, output device, volume, settings.
- If a folder is missing (moved, drive unplugged) its tab shows a warning and your saved layout is left untouched.

## Voice chat (Discord/OBS)

v1 plays to an output device only. If you have a virtual audio cable (e.g. VB-Audio), choose its **input** as the output device here and use the cable's **output** as the microphone in your chat app. Native mic injection is a v2 item.

## Stack & layout

Electron + electron-vite, React 18, TypeScript, Tailwind 3, Zustand, react-rnd (canvas), dnd-kit (reorder).

```
src/main/       window, sound:// protocol (Range support => seeking), IPC, JSON storage, folder watcher
src/preload/    typed window.api bridge (contextIsolation on)
src/shared/     types shared by main + renderer (config & board schemas)
src/renderer/   UI. audio/player.ts is the playback engine; store/ holds board, player, UI state
```

Audio is played with HTML5 `<audio>` elements served from a custom `sound://` protocol; a pool of pre-buffered elements makes the first click instant, and `setSinkId` routes output. Not built (v2 / out of scope): microphone injection, global OS-wide hotkeys, online downloader.
