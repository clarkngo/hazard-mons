export type MonsterArchetype = 'Sprinter' | 'Tank' | 'Toxic' | 'Camouflage' | 'Sentinel'
export type ViralStrain = 'Alpha' | 'Beta' | 'Gamma' | 'Delta' | 'Omega'
export type WeaponBaseType = 'Pistol' | 'Shotgun' | 'Rifle' | 'Grenade' | 'SMG'
export type ArmorSlot = 'head' | 'chest' | 'arms' | 'legs'

export type EvolutionTrigger =
  | { kind: 'level'; level: number }
  | { kind: 'item'; itemId: string; label: string }
  | { kind: 'strainExposure'; strain: ViralStrain; count: number }
  | { kind: 'breeding' }

export interface GeneticCode {
  monsterId: string
  weaponMod?: string
  armorMod?: string
  accessoryMod?: string
}

export interface MonsterDef {
  id: string
  name: string
  archetype: MonsterArchetype
  viralStrain: ViralStrain
  stats: { hp: number; atk: number; def: number; spd: number }
  captureRate: number
  geneticCode: GeneticCode
  evolutionChain: string[]
  evolutionTrigger?: EvolutionTrigger
  description: string
}

export interface WeaponDef {
  id: string
  name: string
  baseType: WeaponBaseType
  slots: number
  viralLoad: number
  hungerDrain: number
  description: string
}

export interface ArmorDef {
  id: string
  name: string
  slot: ArmorSlot
  archetype: MonsterArchetype
  defense: number
  resistance: string[]
  viralLoad: number
  description: string
}

export interface AccessoryDef {
  id: string
  name: string
  viralLoad: number
  effect: string
  description: string
}

export function formatTrigger(trigger?: EvolutionTrigger): string {
  if (!trigger) return 'Terminal stage'
  switch (trigger.kind) {
    case 'level':
      return `Level ${trigger.level}`
    case 'item':
      return `Held item: ${trigger.label}`
    case 'strainExposure':
      return `${trigger.count}× ${trigger.strain} strain exposure`
    case 'breeding':
      return 'Mutation Chamber offspring'
  }
}
