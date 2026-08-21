import type { MonsterDef } from '../types/catalog'
import type { SaveState } from '../types/save'
import { WEAPONS } from '../data/weapons'
import { MONSTER_BY_ID } from '../data/monsters'

export interface BattleFighter {
  monsterId: string
  name: string
  hp: number
  maxHp: number
  atk: number
  def: number
  spd: number
  captureRate: number
  archetype: MonsterDef['archetype']
  viralStrain: MonsterDef['viralStrain']
}

export function createEnemyFighter(def: MonsterDef, playerLevel: number): BattleFighter {
  const scale = 1 + Math.max(0, playerLevel - 1) * 0.08
  const maxHp = Math.round(def.stats.hp * scale)
  return {
    monsterId: def.id,
    name: def.name,
    hp: maxHp,
    maxHp,
    atk: Math.round(def.stats.atk * scale),
    def: Math.round(def.stats.def * scale),
    spd: Math.round(def.stats.spd * scale),
    captureRate: def.captureRate,
    archetype: def.archetype,
    viralStrain: def.viralStrain,
  }
}

export function playerAttackPower(state: SaveState): number {
  const weapon = state.weapons[0]
  const def = weapon ? WEAPONS.find(w => w.id === weapon.defId) : undefined
  const base = def ? 28 + def.slots * 6 : 24
  return base + state.player.level * 4
}

export function playerDefense(state: SaveState): number {
  return 12 + state.player.level * 2
}

export function playerSpeed(state: SaveState): number {
  return 30 + state.player.level * 2
}

export function calcDamage(atk: number, def: number): number {
  const raw = atk * (0.85 + Math.random() * 0.3) - def * 0.35
  return Math.max(1, Math.round(raw))
}

/** captureRate 0–255 → probability, boosted when enemy is hurt */
export function captureChance(enemy: BattleFighter): number {
  const hpFactor = 1 - enemy.hp / enemy.maxHp
  const base = enemy.captureRate / 255
  return Math.min(0.92, base * 0.45 + hpFactor * 0.55)
}

export function fleeChance(playerSpd: number, enemySpd: number): number {
  const ratio = playerSpd / Math.max(1, enemySpd)
  return Math.min(0.9, 0.35 + ratio * 0.25)
}

export function xpReward(enemy: BattleFighter): number {
  const def = MONSTER_BY_ID[enemy.monsterId]
  const stage = def ? Math.max(0, def.evolutionChain.indexOf(def.id)) : 0
  return Math.round(18 + enemy.maxHp * 0.15 + stage * 12)
}

/** Stage-0 wild pool: first monster in each evolution chain */
export function wildEncounterPool(): MonsterDef[] {
  const seen = new Set<string>()
  const out: MonsterDef[] = []
  for (const id of Object.keys(MONSTER_BY_ID)) {
    const m = MONSTER_BY_ID[id]
    const root = m.evolutionChain[0]
    if (seen.has(root)) continue
    seen.add(root)
    const rootDef = MONSTER_BY_ID[root]
    if (rootDef) out.push(rootDef)
  }
  return out
}

export function pickWildEncounter(playerLevel: number): MonsterDef {
  const pool = wildEncounterPool()
  // Prefer lower-stage / higher capture for early levels
  const weights = pool.map(m => {
    const stageBias = m.evolutionChain.indexOf(m.id) === 0 ? 3 : 1
    const levelBias = playerLevel < 3 ? m.captureRate / 80 : 1
    return stageBias * levelBias
  })
  const total = weights.reduce((a, b) => a + b, 0)
  let roll = Math.random() * total
  for (let i = 0; i < pool.length; i++) {
    roll -= weights[i]
    if (roll <= 0) return pool[i]
  }
  return pool[0]
}
