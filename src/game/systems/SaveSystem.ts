import type { SaveState } from '../types/save'
import { migrateSave, SAVE_VERSION } from '../types/save'

const SAVE_KEY = 'hazardmons-save'

export const SaveSystem = {
  save(state: SaveState): void {
    state.timestamp = Date.now()
    state.version = SAVE_VERSION
    localStorage.setItem(SAVE_KEY, JSON.stringify(state))
  },

  load(): SaveState | null {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    try {
      const data = JSON.parse(raw) as Partial<SaveState>
      if (!SaveSystem.validate(data)) return null
      const migrated = migrateSave(data)
      // Persist migration so next load is clean
      if (data.version !== SAVE_VERSION) SaveSystem.save(migrated)
      return migrated
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

  validate(data: unknown): data is Partial<SaveState> {
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
          resolve(migrateSave(data))
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
