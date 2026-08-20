# Changelog

All notable changes to Hazard Mons are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

---

## [Unreleased]

---

## [0.5.0] — 2026-08-19 — Phase 2: Data Layer

### Added
- **26 monster definitions** across Sprinter, Tank, Toxic, Camouflage, and Sentinel archetypes with Alpha–Omega strains, stats, capture rates, and genetic codes
- **10 T-Evolution chains** (level, held item, strain exposure, breeding triggers)
- **Weapon / armor / accessory catalogs** (living weapon bases, bio-armor slots, sentient accessories)
- **Static Viral Dex overlay** — filterable specimen list, chain view, and gear browsers from the in-game survivor log
- `npm run snapshot:phase2` — freeze the build to `docs/phase2/`

---

## [0.4.0] — 2026-05-07 — Phase 1: Game Foundation

### Added
- **Vite + TypeScript + Phaser 3** project scaffold (`src/`, `index.html`, `vite.config.ts`, `tsconfig.json`)
- **TitleScene** — Phaser scene with live node network animation (60 nodes, proximity edges, glowing packets in green/red/purple), HTML overlay with glitch title, version badge, and full menu
  - New Game → name entry modal → creates and persists save
  - Continue → loads existing save (disabled when no save exists)
  - Import Save → file picker, JSON validation, stamps current version
  - Export Save → downloads timestamped `.json`
- **GameScene** — placeholder screen showing survivor biometric status (HP, Viral Load, Chapter, last save time) with Back to Title and Export Save actions
- **SaveSystem** (`src/game/systems/SaveSystem.ts`) — localStorage persistence, JSON export/import, structural validation, timestamp formatting
- **Save types** (`src/game/types/save.ts`) — `SaveState` interface, `createDefaultSave()`
- **GitHub Actions deploy workflow** (`.github/workflows/deploy.yml`) — builds on every push to `main`, copies `dist/` → `docs/latest/` and auto-commits
- `npm run snapshot:phase1` script — builds and freezes output to `docs/phase1/`
- Two-way navigation: homepage `▶ Play Latest` → `docs/phase1/`; game title screen `☣ POKÉHAZARD.DEV` → homepage

### Infrastructure
- `base` path set to `/hazard-mons/` on build, `/` in dev (no broken asset paths in either env)
- GH Pages now auto-updates `docs/latest/` on every merge to `main`

---

## [0.3.0] — 2026-05-07 — Node Network Hero Background

### Added
- Animated node network background in hero section — 55 drifting nodes connected by proximity edges, with glowing packets traveling along edges in green, red (viral), and purple (mutation)

---

## [0.2.0] — 2026-05-07 — Homepage & Plan

### Added
- `docs/index.html`: full landing page with dark toxic-green aesthetic
  - Glitch title animation (POKÉHAZARD)
  - Typewriter tagline cycling through three phrases
  - 9 feature cards with phase badges and per-card color accents (Viral Dex, T-Evolution, Mutation Monsters, Viral Core Extraction, Bio-Containerization, Living Weapons, Bio-Armor, Sentient Accessories, Viral Load)
  - Systems section with three interactive diagrams (Living Weapon loop, Bio-Pod slot visualizer, Viral Load meter)
  - Monster archetype → gear table with viral strain badges
  - 8-phase roadmap cards; Phase 1 marked IN PROGRESS
  - Scroll reveal animations via IntersectionObserver
  - Sticky nav with blur backdrop and scroll tint
- `PLAN.md`: full development plan covering data models, all 8 systems, and per-phase task checklists

### Infrastructure
- `docs/` folder established as the GitHub Pages root
- Phase snapshot workflow documented: each completed phase build is frozen to `docs/phaseN/`

---

## [0.1.0] — 2026-05-07 — Initial Commit

### Added
- Repository initialized with README
