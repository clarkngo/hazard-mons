export type MonsterArchetype = 'Sprinter' | 'Tank' | 'Toxic' | 'Camouflage' | 'Sentinel'
export type ViralStrain = 'Alpha' | 'Beta' | 'Gamma' | 'Delta' | 'Omega'
export type DexTier = 'spotted' | 'encountered' | 'captured'

export interface OwnedMonster {
  instanceId: string
  monsterId: string
  level: number
  xp: number
  currentHp: number
  maxHp: number
}

export interface OwnedWeapon {
  id: string
  defId: string
  hunger: number
}

export interface SaveState {
  version: string
  timestamp: number
  player: {
    name: string
    hp: number
    maxHp: number
    level: number
    xp: number
    position: { map: string; x: number; y: number }
    viralLoad: number
    viralLoadCap: number
  }
  viralDex: Record<string, DexTier>
  party: OwnedMonster[]
  storage: OwnedMonster[]
  inventory: {
    bioPods: number
    items: Record<string, number>
  }
  weapons: OwnedWeapon[]
  progress: {
    flags: Record<string, boolean>
    chapter: number
  }
}

export const PARTY_CAP = 6
export const SAVE_VERSION = '0.3.0'

export function createDefaultSave(playerName: string): SaveState {
  return {
    version: SAVE_VERSION,
    timestamp: Date.now(),
    player: {
      name: playerName.toUpperCase().trim() || 'SURVIVOR',
      hp: 100,
      maxHp: 100,
      level: 1,
      xp: 0,
      position: { map: 'zone1', x: 2, y: 2 },
      viralLoad: 0,
      viralLoadCap: 80,
    },
    viralDex: {},
    party: [],
    storage: [],
    inventory: {
      bioPods: 5,
      items: {},
    },
    weapons: [
      { id: 'wpn-starter', defId: 'pulse-pistol', hunger: 100 },
    ],
    progress: {
      flags: {},
      chapter: 1,
    },
  }
}

/** Merge older saves into the 0.3.0 shape without wiping identity/progress. */
export function migrateSave(raw: Partial<SaveState> & { player?: Partial<SaveState['player']> }): SaveState {
  const base = createDefaultSave(raw.player?.name ?? 'SURVIVOR')
  const player = {
    ...base.player,
    ...(raw.player ?? {}),
    name: (raw.player?.name ?? base.player.name).toUpperCase().trim() || 'SURVIVOR',
    level: raw.player?.level ?? base.player.level,
    xp: raw.player?.xp ?? base.player.xp,
    position: raw.player?.position ?? base.player.position,
  }
  return {
    ...base,
    ...raw,
    version: SAVE_VERSION,
    timestamp: raw.timestamp ?? Date.now(),
    player,
    viralDex: raw.viralDex ?? {},
    party: raw.party ?? [],
    storage: raw.storage ?? [],
    inventory: {
      bioPods: raw.inventory?.bioPods ?? base.inventory.bioPods,
      items: raw.inventory?.items ?? {},
    },
    weapons: raw.weapons?.length ? raw.weapons : base.weapons,
    progress: {
      flags: raw.progress?.flags ?? {},
      chapter: raw.progress?.chapter ?? 1,
    },
  }
}

export function xpToNextLevel(level: number): number {
  return 40 + level * 25
}

/** Stabilize at ops hub: full HP, bleed off viral load. */
export function restAtHub(state: SaveState): void {
  state.player.hp = state.player.maxHp
  state.player.viralLoad = Math.max(0, Math.floor(state.player.viralLoad * 0.4))
}

export function applyPlayerXp(state: SaveState, amount: number): { leveled: boolean; levelsGained: number } {
  state.player.xp += amount
  let levelsGained = 0
  while (state.player.xp >= xpToNextLevel(state.player.level)) {
    state.player.xp -= xpToNextLevel(state.player.level)
    state.player.level += 1
    state.player.maxHp += 8
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + 8)
    levelsGained += 1
  }
  return { leveled: levelsGained > 0, levelsGained }
}
