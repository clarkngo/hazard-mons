import { MONSTERS, MONSTER_BY_ID } from './monsters'
import { formatTrigger } from '../types/catalog'
import type { EvolutionTrigger, MonsterDef } from '../types/catalog'

export interface EvolutionLink {
  fromId: string
  toId: string
  trigger: EvolutionTrigger
}

export interface EvolutionChainView {
  ids: string[]
  names: string[]
  links: EvolutionLink[]
}

export const EVOLUTION_LINKS: EvolutionLink[] = MONSTERS.flatMap(m => {
  if (!m.evolutionTrigger) return []
  const idx = m.evolutionChain.indexOf(m.id)
  const nextId = m.evolutionChain[idx + 1]
  if (!nextId) return []
  return [{ fromId: m.id, toId: nextId, trigger: m.evolutionTrigger }]
})

const seen = new Set<string>()
export const EVOLUTION_CHAINS: EvolutionChainView[] = []
for (const m of MONSTERS) {
  const key = m.evolutionChain.join('>')
  if (seen.has(key)) continue
  seen.add(key)
  EVOLUTION_CHAINS.push(chainView(m.evolutionChain))
}

function chainView(ids: string[]): EvolutionChainView {
  return {
    ids,
    names: ids.map(id => MONSTER_BY_ID[id]?.name ?? id.toUpperCase()),
    links: EVOLUTION_LINKS.filter(l => ids.includes(l.fromId) && ids.includes(l.toId)),
  }
}

export function getChainFor(monster: MonsterDef): EvolutionChainView {
  return chainView(monster.evolutionChain)
}

export function describeLink(link: EvolutionLink): string {
  const from = MONSTER_BY_ID[link.fromId]?.name ?? link.fromId
  const to = MONSTER_BY_ID[link.toId]?.name ?? link.toId
  return `${from} → ${to}  (${formatTrigger(link.trigger)})`
}
