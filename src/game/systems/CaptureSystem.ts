import type { MonsterDef } from '../types/catalog'
import type { OwnedMonster, SaveState } from '../types/save'
import { PARTY_CAP } from '../types/save'
import { MONSTER_BY_ID } from '../data/monsters'
import type { DexTier } from '../types/save'

function uid(): string {
  return `mon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function raiseDex(state: SaveState, monsterId: string, tier: DexTier) {
  const order: DexTier[] = ['spotted', 'encountered', 'captured']
  const cur = state.viralDex[monsterId]
  const curIdx = cur ? order.indexOf(cur) : -1
  const nextIdx = order.indexOf(tier)
  if (nextIdx > curIdx) state.viralDex[monsterId] = tier
}

export const CaptureSystem = {
  markSpotted(state: SaveState, monsterId: string) {
    raiseDex(state, monsterId, 'spotted')
  },

  markEncountered(state: SaveState, monsterId: string) {
    raiseDex(state, monsterId, 'encountered')
  },

  createOwned(def: MonsterDef, level = 1): OwnedMonster {
    const maxHp = Math.round(def.stats.hp * (1 + (level - 1) * 0.1))
    return {
      instanceId: uid(),
      monsterId: def.id,
      level,
      xp: 0,
      currentHp: maxHp,
      maxHp,
    }
  },

  /** Add captured monster to party or storage. Returns destination label. */
  addToCollection(state: SaveState, def: MonsterDef): { dest: 'party' | 'storage'; owned: OwnedMonster } {
    raiseDex(state, def.id, 'captured')
    const owned = CaptureSystem.createOwned(def, 1)
    if (state.party.length < PARTY_CAP) {
      state.party.push(owned)
      return { dest: 'party', owned }
    }
    state.storage.push(owned)
    return { dest: 'storage', owned }
  },

  geneticSummary(monsterId: string): string {
    const def = MONSTER_BY_ID[monsterId]
    if (!def) return 'Genetic code archived.'
    const parts = [
      def.geneticCode.weaponMod && `Weapon: ${def.geneticCode.weaponMod}`,
      def.geneticCode.armorMod && `Armor: ${def.geneticCode.armorMod}`,
      def.geneticCode.accessoryMod && `Accessory: ${def.geneticCode.accessoryMod}`,
    ].filter(Boolean)
    return parts.length ? parts.join(' · ') : 'Genetic code archived.'
  },
}
