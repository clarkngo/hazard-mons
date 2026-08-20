import { MONSTERS } from '../data/monsters'
import { EVOLUTION_CHAINS, describeLink, getChainFor } from '../data/evolutions'
import { WEAPONS } from '../data/weapons'
import { ARMOR } from '../data/armor'
import { ACCESSORIES } from '../data/accessories'
import { formatTrigger } from '../types/catalog'
import type { MonsterArchetype, MonsterDef, ViralStrain } from '../types/catalog'

type Tab = 'dex' | 'chains' | 'weapons' | 'armor' | 'accessories'

const ARCHETYPES: Array<MonsterArchetype | 'ALL'> = ['ALL', 'Sprinter', 'Tank', 'Toxic', 'Camouflage', 'Sentinel']
const STRAINS: Array<ViralStrain | 'ALL'> = ['ALL', 'Alpha', 'Beta', 'Gamma', 'Delta', 'Omega']

export class ViralDexPanel {
  private root: HTMLDivElement | null = null
  private tab: Tab = 'dex'
  private archetype: MonsterArchetype | 'ALL' = 'ALL'
  private strain: ViralStrain | 'ALL' = 'ALL'
  private selectedId: string = MONSTERS[0].id
  private onClose: (() => void) | null = null

  open(onClose?: () => void) {
    this.onClose = onClose ?? null
    this.destroy()
    this.root = document.createElement('div')
    this.root.id = 'dex-overlay'
    this.root.classList.add('fade-in')
    document.getElementById('ui')!.appendChild(this.root)
    this.render()
  }

  close() {
    this.destroy()
    this.onClose?.()
  }

  private destroy() {
    this.root?.remove()
    this.root = null
  }

  private monsters(): MonsterDef[] {
    return MONSTERS.filter(m =>
      (this.archetype === 'ALL' || m.archetype === this.archetype) &&
      (this.strain === 'ALL' || m.viralStrain === this.strain),
    )
  }

  private render() {
    if (!this.root) return
    const list = this.monsters()
    if (!list.some(m => m.id === this.selectedId)) {
      this.selectedId = list[0]?.id ?? MONSTERS[0].id
    }
    const selected = MONSTERS.find(m => m.id === this.selectedId) ?? MONSTERS[0]

    this.root.innerHTML = `
      <div class="dex-shell">
        <header class="dex-head">
          <div>
            <p class="dex-eyebrow">// VIRAL DEX ARCHIVE — STATIC FILE //</p>
            <h2 class="dex-title">GENETIC CATALOG</h2>
          </div>
          <button class="menu-btn secondary dex-close" type="button" id="dex-close">✕ CLOSE</button>
        </header>

        <nav class="dex-tabs">
          ${this.tabBtn('dex', `DEX (${MONSTERS.length})`)}
          ${this.tabBtn('chains', `T-EVO (${EVOLUTION_CHAINS.length})`)}
          ${this.tabBtn('weapons', `WEAPONS (${WEAPONS.length})`)}
          ${this.tabBtn('armor', `ARMOR (${ARMOR.length})`)}
          ${this.tabBtn('accessories', `ACCESSORIES (${ACCESSORIES.length})`)}
        </nav>

        <div class="dex-body">
          ${this.tab === 'dex' ? this.renderDex(list, selected) : ''}
          ${this.tab === 'chains' ? this.renderChains() : ''}
          ${this.tab === 'weapons' ? this.renderWeapons() : ''}
          ${this.tab === 'armor' ? this.renderArmor() : ''}
          ${this.tab === 'accessories' ? this.renderAccessories() : ''}
        </div>
      </div>
    `

    this.root.querySelector('#dex-close')!.addEventListener('click', () => this.close())
    this.root.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.tab = btn.dataset.tab as Tab
        this.render()
      })
    })
    this.root.querySelectorAll<HTMLButtonElement>('[data-arch]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.archetype = btn.dataset.arch as MonsterArchetype | 'ALL'
        this.render()
      })
    })
    this.root.querySelectorAll<HTMLButtonElement>('[data-strain]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.strain = btn.dataset.strain as ViralStrain | 'ALL'
        this.render()
      })
    })
    this.root.querySelectorAll<HTMLButtonElement>('[data-mon]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectedId = btn.dataset.mon!
        this.render()
      })
    })
  }

  private tabBtn(id: Tab, label: string): string {
    return `<button type="button" class="dex-tab${this.tab === id ? ' on' : ''}" data-tab="${id}">${label}</button>`
  }

  private chip(kind: 'arch' | 'strain', value: string, current: string): string {
    const attr = kind === 'arch' ? 'data-arch' : 'data-strain'
    return `<button type="button" class="dex-chip${current === value ? ' on' : ''}" ${attr}="${value}">${value}</button>`
  }

  private renderDex(list: MonsterDef[], selected: MonsterDef): string {
    const chain = getChainFor(selected)
    const next = selected.evolutionTrigger
      ? formatTrigger(selected.evolutionTrigger)
      : '—'
    return `
      <div class="dex-filters">
        <div class="dex-chip-row">${ARCHETYPES.map(a => this.chip('arch', a, this.archetype)).join('')}</div>
        <div class="dex-chip-row">${STRAINS.map(s => this.chip('strain', s, this.strain)).join('')}</div>
      </div>
      <div class="dex-split">
        <div class="dex-list">
          ${list.length === 0 ? '<p class="dex-empty">NO MATCHING FILES</p>' : list.map(m => `
            <button type="button" class="dex-item${m.id === selected.id ? ' on' : ''}" data-mon="${m.id}">
              <span class="dex-item-name">${m.name}</span>
              <span class="dex-item-meta">${m.archetype} · ${m.viralStrain}</span>
            </button>
          `).join('')}
        </div>
        <article class="dex-detail">
          <p class="dex-file">FILE ${String(MONSTERS.indexOf(selected) + 1).padStart(2, '0')} / ${MONSTERS.length} · ARCHIVED</p>
          <h3>${selected.name}</h3>
          <p class="dex-desc">${selected.description}</p>
          <div class="dex-stats">
            ${stat('HP', selected.stats.hp)}
            ${stat('ATK', selected.stats.atk)}
            ${stat('DEF', selected.stats.def)}
            ${stat('SPD', selected.stats.spd)}
            ${stat('CAPTURE', selected.captureRate)}
          </div>
          <p class="dex-kv"><span>ARCHETYPE</span><span>${selected.archetype}</span></p>
          <p class="dex-kv"><span>STRAIN</span><span>${selected.viralStrain}</span></p>
          <p class="dex-kv"><span>NEXT EVO</span><span>${next}</span></p>
          <p class="dex-kv"><span>CHAIN</span><span>${chain.names.join(' → ')}</span></p>
          <p class="dex-kv"><span>WEAPON MOD</span><span>${selected.geneticCode.weaponMod ?? '—'}</span></p>
          <p class="dex-kv"><span>ARMOR MOD</span><span>${selected.geneticCode.armorMod ?? '—'}</span></p>
          <p class="dex-kv"><span>ACCESSORY</span><span>${selected.geneticCode.accessoryMod ?? '—'}</span></p>
        </article>
      </div>
    `
  }

  private renderChains(): string {
    return `
      <div class="dex-grid">
        ${EVOLUTION_CHAINS.map(c => `
          <article class="dex-card">
            <p class="dex-card-label">${c.ids.length}-STAGE T-EVOLUTION</p>
            <h3>${c.names.join(' → ')}</h3>
            <ul>${c.links.map(l => `<li>${describeLink(l)}</li>`).join('')}</ul>
          </article>
        `).join('')}
      </div>
    `
  }

  private renderWeapons(): string {
    return `
      <div class="dex-grid">
        ${WEAPONS.map(w => `
          <article class="dex-card">
            <p class="dex-card-label">${w.baseType} · ${w.slots} POD SLOT${w.slots > 1 ? 'S' : ''}</p>
            <h3>${w.name}</h3>
            <p>${w.description}</p>
            <p class="dex-kv"><span>VIRAL LOAD</span><span>+${w.viralLoad}</span></p>
            <p class="dex-kv"><span>HUNGER / BATTLE</span><span>${w.hungerDrain}</span></p>
          </article>
        `).join('')}
      </div>
    `
  }

  private renderArmor(): string {
    return `
      <div class="dex-grid">
        ${ARMOR.map(a => `
          <article class="dex-card">
            <p class="dex-card-label">${a.slot.toUpperCase()} · ${a.archetype}</p>
            <h3>${a.name}</h3>
            <p>${a.description}</p>
            <p class="dex-kv"><span>DEFENSE</span><span>${a.defense}</span></p>
            <p class="dex-kv"><span>RESIST</span><span>${a.resistance.join(', ')}</span></p>
            <p class="dex-kv"><span>VIRAL LOAD</span><span>+${a.viralLoad}</span></p>
          </article>
        `).join('')}
      </div>
    `
  }

  private renderAccessories(): string {
    return `
      <div class="dex-grid">
        ${ACCESSORIES.map(a => `
          <article class="dex-card">
            <p class="dex-card-label">ACCESSORY · LOAD +${a.viralLoad}</p>
            <h3>${a.name}</h3>
            <p>${a.description}</p>
            <p class="dex-kv"><span>EFFECT</span><span>${a.effect}</span></p>
          </article>
        `).join('')}
      </div>
    `
  }
}

function stat(label: string, value: number): string {
  return `<div class="dex-stat"><span>${label}</span><strong>${value}</strong></div>`
}
