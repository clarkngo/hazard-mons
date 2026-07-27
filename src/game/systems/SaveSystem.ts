import type { SaveState } from '../types/save'

const SAVE_KEY = 'hazardmons-save'
const CURRENT_VERSION = '0.1.0'

export const SaveSystem = {
  save(state: SaveState): void {
    state.timestamp = Date.now()
    localStorage.setItem(SAVE_KEY, JSON.stringify(state))
  },

  load(): SaveState | null {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw) as SaveState
    } catch {
      return null
    }
  },

  hasSave(): boolean {
    return !!localStorage.getItem(SAVE_KEY)
  },

  delete(): void {
    localStorage.removeItem(SAVE_KEY)
  },

  // Validates that an imported save is structurally sound before accepting it
  validate(data: unknown): data is SaveState {
    if (typeof data !== 'object' || data === null) return false
    const s = data as Record<string, unknown>
    return (
      typeof s.version === 'string' &&
      typeof s.timestamp === 'number' &&
      typeof s.player === 'object' && s.player !== null &&
      typeof (s.player as Record<string, unknown>).name === 'string'
    )
  },

  exportJSON(state: SaveState): void {
    const json = JSON.stringify(state, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = Object.assign(document.createElement('a'), {
      href: url,
      download: `hazardmons-save-${Date.now()}.json`,
    })
    a.click()
    URL.revokeObjectURL(url)
  },

  importJSON(file: File): Promise<SaveState> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = e => {
        try {
          const data = JSON.parse(e.target!.result as string)
          if (!SaveSystem.validate(data)) {
            reject(new Error('Invalid save file format'))
            return
          }
          // Stamp current version on import so old saves stay runnable
          data.version = CURRENT_VERSION
          resolve(data)
        } catch {
          reject(new Error('Could not parse save file'))
        }
      }
      reader.onerror = () => reject(new Error('Could not read file'))
      reader.readAsText(file)
    })
  },

  formatTimestamp(ts: number): string {
    return new Date(ts).toLocaleString(undefined, {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  },
}
