# Hazard Mons — Development Plan

## Deployment
- Hosted on **GitHub Pages** at `https://clarkngo.github.io/hazard-mons/`
- Save data stored in **localStorage**
- Save state can be **downloaded** (JSON) and **uploaded** to restore

### Playing Past Phases
Each completed phase is preserved as a playable build at its own URL:

| Phase | URL | Status |
|---|---|---|
| Phase 1 | `/hazard-mons/phase1/` | ✅ Complete |
| Phase 2 | `/hazard-mons/phase2/` | ✅ Complete |
| Phase 3 | `/hazard-mons/phase3/` | ✅ Complete |
| Phase 4 | `/hazard-mons/phase4/` | 🔲 Not started |
| Phase 5 | `/hazard-mons/phase5/` | 🔲 Not started |
| Phase 6 | `/hazard-mons/phase6/` | 🔲 Not started |
| Phase 7 | `/hazard-mons/phase7/` | 🔲 Not started |
| Phase 8 | `/hazard-mons/phase8/` | 🔲 Not started |

**How it works:** When a phase is complete, its build is copied into `docs/phaseN/` on the `main` branch. GitHub Pages serves the entire `docs/` folder, so every phase stays accessible at its own URL forever. The root `docs/index.html` acts as a **phase selector landing page**.

**Workflow per phase:**
1. Build: `npm run build` (Vite outputs to `dist/`)
2. Copy: `cp -r dist/* docs/phaseN/`
3. Commit + push → GitHub Pages auto-deploys

---

## Tech Stack
- **Vite + TypeScript** — build tool, fast dev server, trivial GH Pages deploy
- **Phaser 3** — game loop, scenes, sprites, tilemaps, input
- **HTML/CSS overlays** — Phaser `UIScene` + DOM panels for inventory, Viral Dex, crafting menus
- `vite.config.ts` base path: `/hazard-mons/` (root) or `/hazard-mons/phaseN/` per snapshot

---

## Project Structure

```
hazard-mons/
├── docs/                        ← GitHub Pages root
│   ├── index.html               ← Phase selector landing page
│   ├── phase1/                  ← Frozen build snapshots
│   ├── phase2/
│   └── ...
├── public/
│   └── assets/
│       ├── sprites/
│       ├── tilesets/
│       └── audio/
├── src/
│   ├── main.ts
│   ├── game/
│   │   ├── scenes/
│   │   │   ├── BootScene.ts
│   │   │   ├── TitleScene.ts
│   │   │   ├── OverworldScene.ts
│   │   │   ├── BattleScene.ts
│   │   │   └── UIScene.ts         # parallel HUD scene
│   │   ├── systems/
│   │   │   ├── SaveSystem.ts      # localStorage + JSON export/import
│   │   │   ├── BattleSystem.ts
│   │   │   ├── CaptureSystem.ts
│   │   │   ├── EvolutionSystem.ts
│   │   │   ├── BreedSystem.ts
│   │   │   ├── WeaponSystem.ts    # living weapon + hunger
│   │   │   ├── ArmorSystem.ts
│   │   │   └── ViralLoadSystem.ts # balance mechanic
│   │   ├── data/
│   │   │   ├── monsters.ts        # all Viral Dex entries
│   │   │   ├── evolutions.ts      # T-Evolution chains
│   │   │   ├── weapons.ts
│   │   │   ├── armor.ts
│   │   │   └── accessories.ts
│   │   ├── entities/
│   │   │   ├── Player.ts
│   │   │   ├── Monster.ts
│   │   │   ├── LivingWeapon.ts
│   │   │   ├── BioArmor.ts
│   │   │   └── Accessory.ts
│   │   └── ui/
│   │       ├── ViralDexPanel.ts
│   │       ├── InventoryPanel.ts
│   │       ├── CraftingBench.ts
│   │       └── SaveMenu.ts
├── index.html
├── vite.config.ts
└── tsconfig.json
```

---

## Core Data Models

```typescript
type MonsterArchetype = 'Sprinter' | 'Tank' | 'Toxic' | 'Camouflage' | 'Sentinel'
type ViralStrain    = 'Alpha' | 'Beta' | 'Gamma' | 'Delta' | 'Omega'

interface Monster {
  id: string
  name: string
  archetype: MonsterArchetype
  viralStrain: ViralStrain
  stats: { hp: number; atk: number; def: number; spd: number }
  captureRate: number            // 0–255
  geneticCode: GeneticCode       // extracted on capture/defeat
  evolutionChain: string[]       // ordered monster IDs
  evolutionTrigger: EvolutionTrigger
}

interface GeneticCode {
  monsterId: string
  weaponMod?: WeaponModBlueprint
  armorMod?: ArmorModBlueprint
  accessoryMod?: AccessoryModBlueprint
}

interface LivingWeapon {
  id: string
  baseType: 'Pistol' | 'Shotgun' | 'Rifle' | 'Grenade' | 'SMG'
  slots: BioPodSlot[]            // 1–4, unlocked by XP
  activeCore?: ViralCore         // one Mega Man-style extracted ability
  hunger: number                 // 0–100, drains per battle; 0 = Dormant
  xp: number
  evolutionPath: WeaponEvolutionPath
  visualMutations: string[]      // 'eyes' | 'veins' | 'limbs'
  viralLoad: number
}

interface BioPodSlot {
  pod?: BioPod
  locked: boolean
}

interface BioPod {
  monsterId: string
  viralStrain: ViralStrain
  effect: SlotEffect             // elemental overlay, scope, triple-strain bonus
}

interface BioArmor {
  slot: 'head' | 'chest' | 'arms' | 'legs'
  monsterId: string
  archetype: MonsterArchetype
  stats: { defense: number; resistance: string[] }
  effect: ArmorEffect            // reactive spikes, regen weave, etc.
  durability: number
  viralLoad: number
}

interface SaveState {
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
  viralDex: Record<string, ViralDexEntry>
  party: Monster[]
  storage: Monster[]
  weapons: LivingWeapon[]
  armor: Partial<Record<'head' | 'chest' | 'arms' | 'legs', BioArmor>>
  accessories: Accessory[]
  inventory: InventoryItem[]
  progress: { flags: Record<string, boolean>; chapter: number }
}
```

---

## Systems

### Save System
- `localStorage.setItem('hazardmons-save', JSON.stringify(state))`
- **Export:** `Blob` → `<a download="save.json">` trigger
- **Import:** `<input type="file">` → `FileReader` → JSON parse → version check → restore

### Viral Dex
Three tiers per entry:
- **Spotted** — name only
- **Encountered** — stats visible
- **Captured** — full entry + genetic code available for crafting

### Battle System
Turn-based. Player actions: Attack, Capture (Bio-Pod), Use Viral Core ability, Flee.
Enemies can inflict **Viral Contamination** status that raises player viral load.

### T-Evolution
Triggered by: level threshold, held item, viral strain exposure count, or breeding result.
Max three-stage chains; each stage unlocks new genetic codes.

### Mutation/Breed System
Two captured monsters → **Mutation Chamber** → offspring inherits dominant strain + mixed stats.
Rare **Chimera** result if viral strains conflict.

### Viral Core (Mega Man Style)
One core slotted per weapon = unique active ability extracted from a named monster.

| Monster | Core Ability |
|---|---|
| Licker | Tongue Grapple — pulls enemy closer |
| Hunter | Claw Strike — high-crit melee hit |
| Tyrant | Rage Burst — brief max fire rate |

### Bio-Pod Containerization
Weapon slots accept compressed monsters (Bio-Pods):
- **Elemental overlay** — Fire/Toxic/Cryo rounds
- **Scope effect** — auto-aim, thermal vision
- **Triple-strain bonus** — 3 pods of same ViralStrain = weapon evolves + stat boost

### Living Weapon Hunger
Hunger drains 1pt/battle. At 0: **Dormant** state, no special abilities.
Feed by consuming stored Bio-Pods (pod is destroyed). Forces the hunt loop.

### Viral Load Balance
Each equipped weapon/armor/accessory contributes `viralLoad` to the player total.
Exceeding the cap: max HP reduced, random debuffs. Forces focused builds.

---

## Monster Archetype → Gear Map

| Archetype | Weapon Mod | Armor / Accessory |
|---|---|---|
| **Sprinter** | Increased fire rate | Stamina recovery boost |
| **Tank** | Heavy impact / knockback | Blast resistance plates |
| **Toxic** | Corrosive / poison rounds | Gas mask / acid immunity |
| **Camouflage** | Silencer / stealth mod | Invisibility cloak (short burst) |
| **Sentinel** | Auto-turret mode | 360° radar / mini-map reveal |

---

## Development Phases

### ✅ Phase 1 — Foundation
- [x] Vite + TypeScript + Phaser 3 scaffold
- [x] Save/Load system (localStorage + JSON export/import)
- [x] GitHub Pages deploy config (`base: '/hazard-mons/'`)
- [x] Title screen + new game / load game flow
- [x] `docs/` folder structure + phase selector landing page (`docs/index.html`)

### ✅ Phase 2 — Data Layer
- [x] 20+ monster definitions (Viral Dex entries)
- [x] T-Evolution chains
- [x] Weapon / armor / accessory base definitions
- [x] Static Viral Dex UI panel

### ✅ Phase 3 — Battle System
- [x] Turn-based battle scene
- [x] Capture mechanic (Bio-Pod throwing)
- [x] Genetic code extraction on capture/defeat
- [x] XP and leveling
- [x] Minimal encounter zone + party/inventory on save

### 🔲 Phase 4 — Weapon System
- [ ] Bio-Pod slot UI
- [ ] Viral Core extraction and equip
- [ ] Living weapon hunger mechanic
- [ ] Weapon evolution paths + visual mutations

### 🔲 Phase 5 — Evolution & Breeding
- [ ] T-Evolution triggers and cutscene
- [ ] Mutation Chamber UI
- [ ] Chimera / conflict outcomes

### 🔲 Phase 6 — Armor & Accessories
- [ ] Bio-Armor equip system
- [ ] Sentient accessory passive effects
- [ ] Viral Load meter + debuff triggers

### 🔲 Phase 7 — Overworld
- [ ] Tilemap navigation
- [ ] Encounter zones (random + visible)
- [ ] Map transitions

### 🔲 Phase 8 — Polish
- [ ] Audio (battle BGM, SFX)
- [ ] Sprite animations
- [ ] UI polish pass
- [ ] Balance tuning
