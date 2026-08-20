import type { AccessoryDef } from '../types/catalog'

export const ACCESSORIES: AccessoryDef[] = [
  {
    id: 'stamina-charm',
    name: 'STAMINA CHARM',
    viralLoad: 4,
    effect: 'Recover stamina 20% faster after sprinting',
    description: 'A Sprinter node grown into a pendant. Pulses with the wearer\'s heart rate.',
  },
  {
    id: 'toxin-filter',
    name: 'TOXIN FILTER',
    viralLoad: 5,
    effect: 'Ignore first gas tick each encounter',
    description: 'Porous Omega tissue. It drinks airborne spores so you do not have to.',
  },
  {
    id: 'optic-veil',
    name: 'OPTIC VEIL',
    viralLoad: 7,
    effect: '2s invisibility on dodge (30s cooldown)',
    description: 'Camouflage membrane stretched over a lens. Blink and you vanish.',
  },
  {
    id: 'early-warning',
    name: 'EARLY WARNING',
    viralLoad: 6,
    effect: 'Ping hostiles 8m before line of sight',
    description: 'A Radarling cochlea in a brass ring. It clicks when something looks back.',
  },
  {
    id: 'adrenaline-core',
    name: 'ADRENALINE CORE',
    viralLoad: 9,
    effect: 'Held item: evolves RIPTOR → APEXBOLT',
    description: 'Compressed Alpha heart. Unstable. Do not wear it into a long fight.',
  },
  {
    id: 'osseous-plate',
    name: 'OSSEOUS PLATE',
    viralLoad: 8,
    effect: 'Held item: evolves BASTION → COLOSSUS',
    description: 'A plate that wants to be a wall. Tanks recognize it as family.',
  },
]
