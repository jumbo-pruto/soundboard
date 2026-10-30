import { useEffect } from 'react'
import { stopAll } from '../audio/player'
import { triggerItem } from '../audio/actions'
import { useBoardStore } from '../store/useBoardStore'
import { useUIStore } from '../store/useUIStore'
import { codeToLabel, isTypingTarget, LAUNCHPAD_KEYS, LAUNCHPAD_PAGE_SIZE } from '../utils/keys'
import { getVisibleItems } from '../utils/visible'

/**
 * In-app hotkeys (only while the window is focused):
 *  - Esc            stop everything (works in every mode)
 *  - custom hotkeys per-button hotkey, User mode only
 *  - launchpad keys keyboard-position keys on the current launchpad page, User mode only
 */
export function useHotkeys(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.repeat || e.ctrlKey || e.altKey || e.metaKey) return
      const ui = useUIStore.getState()
      if (ui.keyCaptureActive || ui.settingsOpen || isTypingTarget(e.target)) return

      if (e.key === 'Escape') {
        stopAll()
        return
      }
      if (ui.config.editMode) return

      const label = codeToLabel(e.code)
      if (!label) return

      const { tabs } = useBoardStore.getState()
      const active = ui.config.activeTab
      const order = [
        ...(active && tabs[active] ? [active] : []),
        ...(ui.config.hotkeysOnlyCurrentTab ? [] : ui.config.openTabs.filter((f) => f !== active))
      ]

      // 1) explicit per-button hotkeys win
      for (const folder of order) {
        const tab = tabs[folder]
        if (!tab || tab.status !== 'ready') continue
        for (const file of tab.files) {
          const state = tab.board.buttons[file.key]
          if (state && !state.hidden && state.hotkey === label) {
            e.preventDefault()
            triggerItem(folder, { file, state, displayName: state.label?.trim() || file.name })
            return
          }
        }
      }

      // 2) launchpad positional keys for the visible page
      if (ui.config.viewMode === 'launchpad' && active && tabs[active]?.status === 'ready') {
        const idx = LAUNCHPAD_KEYS.indexOf(label)
        if (idx === -1) return
        const items = getVisibleItems(tabs[active], {
          query: ui.query,
          sortMode: ui.sortMode,
          favoritesOnly: ui.favoritesOnly,
          editMode: false
        })
        const item = items[ui.launchpadPage * LAUNCHPAD_PAGE_SIZE + idx]
        if (item) {
          e.preventDefault()
          triggerItem(active, item)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
