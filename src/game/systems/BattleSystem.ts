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
  // Catalog stats are "true" values; wild fights use a softer curve so early
  // encounters last a few turns instead of one-shotting a wounded survivor.
  const scale = 1 + Math.max(0, playerLevel - 1) * 0.05
  const maxHp = Math.max(18, Math.round(def.stats.hp * 0.62 * scale))
  return {
    monsterId: def.id,
    name: def.name,
    hp: maxHp,
    maxHp,
    atk: Math.max(8, Math.round(def.stats.atk * 0.36 * scale)),
    def: Math.max(4, Math.round(def.stats.def * 0.38 * scale)),
    spd: Math.round(def.stats.spd * 0.7 * scale),
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

export function calcDamage(atk: number, def: number, maxHit?: number): number {
  const raw = atk * (0.88 + Math.random() * 0.22) - def * 0.5
  const dmg = Math.max(1, Math.round(raw))
  if (maxHit && maxHit > 0) return Math.min(dmg, maxHit)
  return dmg
}

/** captureRate 0–255 → probability, boosted when enemy is hurt */
export function captureChance(enemy: BattleFighter): number {
  const hpFactor = 1 - enemy.hp / enemy.maxHp
  const base = enemy.captureRate / 255
  return Math.min(0.92, base * 0.45 + hpFactor * 0.55)
}

export function fleeChance(playerSpd: number, enemySpd: number, hpRatio = 1): number {
  const ratio = playerSpd / Math.max(1, enemySpd)
  let chance = 0.55 + ratio * 0.28
  if (hpRatio < 0.45) chance += 0.2
  return Math.min(0.95, chance)
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
