import { useEffect } from 'react'
import { useBoardStore } from '../store/useBoardStore'
import { useUIStore } from '../store/useUIStore'
import { isTypingTarget } from '../utils/keys'

const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1]
}

/** Edit-mode keyboard: undo/redo and arrow-nudge of selected canvas items. */
export function useCanvasKeys(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const ui = useUIStore.getState()
      if (ui.keyCaptureActive || ui.settingsOpen || isTypingTarget(e.target)) return
      if (!ui.config.editMode) return
      const folder = ui.config.activeTab
      if (!folder) return

      // undo / redo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) useBoardStore.getState().redo(folder)
        else useBoardStore.getState().undo(folder)
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        useBoardStore.getState().redo(folder)
        return
      }

      // arrow-nudge only makes sense on the canvas
      if (ui.config.viewMode !== 'canvas' || e.ctrlKey || e.metaKey || e.altKey) return
      const delta = ARROWS[e.key]
      if (!delta) return

      // operate on the multi-selection, falling back to the single selection
      let keys: string[] = []
      let textIds: string[] = []
      if (ui.canvasSel.folder === folder && ui.canvasSel.keys.length + ui.canvasSel.textIds.length > 0) {
        keys = ui.canvasSel.keys
        textIds = ui.canvasSel.textIds
      } else if (ui.selection?.folder === folder) {
        if (ui.selection.kind === 'button') keys = [ui.selection.key]
        else if (ui.selection.kind === 'text') textIds = [ui.selection.id]
      }
      if (keys.length === 0 && textIds.length === 0) return
      e.preventDefault()
      const step = e.shiftKey ? 10 : ui.config.snapToGrid ? 10 : 1
      useBoardStore.getState().nudgeCanvas(folder, keys, textIds, delta[0] * step, delta[1] * step)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
