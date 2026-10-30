# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A desktop **soundboard** for **live-event hosting**: point it at folders, every `.mp3`/`.wav` becomes a button, click to play instantly through a chosen output device. Built from [Soundux](https://github.com/Soundux/Soundux) as inspiration, with an added free-form **Canvas** layout. The live-event use case drives priorities: **instant/low-latency playback, an always-visible STOP, and User mode (layout locked) as the launch default** so nothing moves mid-show.

## Conventions (important)

- **No Claude attribution in commits or PRs.** Never add `Co-Authored-By: Claude …` or `🤖 Generated with Claude Code`. Short conventional messages, commit **direct to `main`**, small diffs per logical chunk.
- **Do not `git push`** — the user pushes via their own SSH key. After committing, print the push command (`git push origin main`) for them.
- Commit author is `Jeferson <jumbo-pruto@users.noreply.github.com>` (set repo-locally). Remote: `git@github.com:jumbo-pruto/soundboard.git`.
- **Tailwind v3** (not v4). Config/storage uses a **custom JSON module** (`src/main/jsonStore.ts`), not `electron-store`.
- Config files are `.cjs` (`tailwind.config.cjs`, `postcss.config.cjs`) because the package is CommonJS — don't rename to `.js` with ESM syntax.

## Commands

```bash
npm install            # if Electron's binary is missing afterward: node node_modules/electron/install.js
npm run dev            # dev with HMR
npm run build          # type-bundles main+preload+renderer into out/ (also the typecheck gate)
npm run typecheck      # tsc for node (main/preload) + web (renderer) projects
npm run start          # electron-vite preview of a production build
npm run gen-test-sounds -- ./test-sounds   # generate sample .wav files to try/verify
npm run package:win    # unpacked Windows app -> release/win-unpacked/Soundboard.exe
```

There is no unit-test runner. Verification is an **end-to-end CDP harness** (not committed; lives in the session scratchpad `…/scratchpad/verify/`): it launches the built app with env `SOUNDBOARD_DEBUG_PORT=<port>` (see `src/main/index.ts`, which enables `--remote-debugging-port`), drives it over Chrome DevTools Protocol, asserts via `[data-testid=…]` hooks, and screenshots. `cdp.mjs` is the helper; `phase1.mjs`/`phase2.mjs` cover v1 (playback/views/edit, and persistence/missing-folder). Re-run these as regression, add `phase4.mjs` for v2. UI elements expose `data-testid` attributes specifically so this harness can target them — keep them when editing components.

## Architecture (the big picture)

Electron app, three TypeScript surfaces bundled by **electron-vite**:

- **`src/main/`** — Node side. `index.ts` (window lifecycle, media-permission handlers so output-device labels resolve, single-instance lock, window-bounds persistence), `ipc.ts` (all `ipcMain.handle`s), `protocol.ts`, `storage.ts`, `jsonStore.ts`, `watcher.ts`.
- **`src/preload/`** — `index.ts` exposes a typed `window.api` via `contextBridge` (contextIsolation on, nodeIntegration off). `index.d.ts` declares `window.api` and the `setSinkId` typing. **Any new main↔renderer call is added in all three: `ipc.ts`, `preload/index.ts`, and here.**
- **`src/renderer/src/`** — React UI + the audio engine.
- **`src/shared/types.ts`** — types shared by main and renderer, and the canonical **schemas**: `AppConfig` (global) and `Board` (per-folder), plus `DEFAULT_CONFIG`/`EMPTY_BOARD`. Both carry a `version`; schema changes must be **additive and migrated** so existing files load.

### Key mechanisms (each needs reading >1 file)

- **Audio playback — `renderer/src/audio/player.ts`.** The single source of playback truth. Plays HTML5 `<audio>` elements sourced from the custom **`sound://local/<encodeURIComponent(absPath)>`** protocol (registered privileged pre-`app.ready`, handled in `protocol.ts` with **HTTP Range support so seeking works**). A pool of pre-buffered idle elements (`preload()`, driven from `App.tsx` for the active tab) makes the first click instant. `usePlayerStore` is a pure UI mirror; mutate playback only through `player.ts` (`play/stop/stopAll/togglePause/seek/setRate/setVolume`). Output routing is `element.setSinkId`; a subscription re-applies device + master volume to live elements when settings change.
- **State — Zustand stores in `renderer/src/store/`.**
  - `useUIStore` — `config: AppConfig` (persisted, debounced, via `window.api.writeConfig`), plus transient UI (search/sort/selection/toast). **Edit mode is never persisted** — the app always launches in safe User mode.
  - `useBoardStore` — per-folder `tabs` (files + `Board` + status). `loadTab`/`rescan` **reconcile** disk files with the saved board (buttons keyed by **filename**, not index, so recolor/reorder survive add/remove). Writes are **debounced + atomic** (temp file + rename) and only ever persist `status === 'ready'` tabs, so a missing/loading folder can't clobber a saved layout.
  - `usePlayerStore` — active play instances for the transport UI.
  - `store/tabActions.ts` — open/close/activate/reload tabs (orchestrates both stores + the player).
- **Views — `renderer/src/components/views/`.** `GridView`/`ListView`/`LaunchpadView`/`CanvasView` each take a `tab` prop and render the shared `SoundCard`. Visible-item filtering/sorting is centralized in `utils/visible.ts` (+ `views/useItems.ts`). `TabContent.tsx` routes the active tab+view. Canvas uses **react-rnd** for drag/resize; Grid/List reorder uses **@dnd-kit** (`views/SortableList.tsx`).
- **Persistence locations.** Per folder: `<folder>/.soundboard/board.json` (labels, colors, order, hotkeys, favorites, canvas geometry, text boxes). Global: `%APPDATA%/soundboard/config.json` (open tabs, theme, view, output device, volume, settings). `openTabs` restores the session; each folder's board restores that tab.
- **Theming.** CSS variables on `:root` with `data-theme` dark/light (`theme/globals.css`); the active tab's accent is written to `--accent` from `App.tsx`. Tailwind colors map to those vars.
- **In-app hotkeys — `hooks/useHotkeys.ts`.** Only while the window is focused (no global OS hotkeys in v1): `Esc` stops all; per-button custom hotkeys and Launchpad positional keys fire in User mode. Key handling uses `KeyboardEvent.code` (see `utils/keys.ts`).

## Status & roadmap

- **v1: shipped.**
- **v2: shipped** — canvas zoom (`canvas/ZoomControls`, react-rnd `scale`); text-box text alignment (H/V); tab drag-reorder + up to 3 independent split panes (`PaneArea`/`TabPane`, `config.panes`/`focusedPane`/`paneSizes`); saved canvas layout presets (`board.layouts`/`activeLayoutId`, auto-synced on edit); per-button canvas font size; compounding (stack) playback (`config.retriggerMode` + per-button `retrigger`); multi-select + align/distribute (`canvas/AlignToolbar`, `utils/align.ts`, `useUIStore.canvasSel`); undo/redo (per-folder history in `useBoardStore`, Ctrl+Z/Y via `hooks/useCanvasKeys`); right-click menus (`ContextMenu`); arrow-key nudge. In-app `PromptModal` replaces `window.prompt` (unsupported in Electron).
- **Deferred (do not build unless reopened):** microphone / voice-chat injection (virtual-audio-cable routing), global OS-wide hotkeys, the Soundux online downloader. The user has VB-Audio Virtual Cable, so output-device selection already feeds Discord/OBS by picking the cable's input as the output device.

## Gotchas

- `sound://` must be registered privileged **before** `app.ready`, then handled after, and must honor `Range` or seeking breaks.
- Output-device labels are empty until media permission is granted once (`getUserMedia({audio:true})` in `hooks/useMediaDevices.ts`); always keep a "System default" (`deviceId:'default'`) fallback.
- When zooming the canvas, pass react-rnd's `scale` prop to every `<Rnd>` or drag/resize math drifts.
- Board edits are debounced ~500ms — when verifying persistence, wait past that before reading `board.json`.
