export type MonsterArchetype = 'Sprinter' | 'Tank' | 'Toxic' | 'Camouflage' | 'Sentinel'
export type ViralStrain = 'Alpha' | 'Beta' | 'Gamma' | 'Delta' | 'Omega'

export interface SaveState {
  version: string
  timestamp: number
  player: {
    name: string
    hp: number
    maxHp: number
    position: { map: string; x: number; y: number }
    viralLoad: number
    viralLoadCap: number
  }
  progress: {
    flags: Record<string, boolean>
    chapter: number
  }
}

export function createDefaultSave(playerName: string): SaveState {
  return {
    version: '0.2.0',
    timestamp: Date.now(),
    player: {
      name: playerName.toUpperCase().trim() || 'SURVIVOR',
      hp: 100,
      maxHp: 100,
      position: { map: 'start', x: 0, y: 0 },
      viralLoad: 0,
      viralLoadCap: 80,
    },
    progress: {
      flags: {},
      chapter: 0,
    },
  }
}
