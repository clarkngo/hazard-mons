import { MONSTER_BY_ID } from '../data/monsters'
import { WEAPONS } from '../data/weapons'
import { spriteUrl } from '../data/sprites'
import { PARTY_CAP, type SaveState } from '../types/save'
import { xpToNextLevel } from '../types/save'

export class PartyInventoryPanel {
  private root: HTMLDivElement | null = null
  private onClose: (() => void) | null = null

  open(state: SaveState, onClose?: () => void) {
    this.onClose = onClose ?? null
    this.destroy()
    this.root = document.createElement('div')
    this.root.id = 'party-overlay'
    this.root.classList.add('fade-in')
    document.getElementById('ui')!.appendChild(this.root)
    this.render(state)
  }

  close() {
    this.destroy()
    this.onClose?.()
  }

  private destroy() {
    this.root?.remove()
    this.root = null
  }

  private render(state: SaveState) {
    if (!this.root) return
    const weapon = state.weapons[0]
    const wdef = weapon ? WEAPONS.find(w => w.id === weapon.defId) : undefined
    const next = xpToNextLevel(state.player.level)

    this.root.innerHTML = `
      <div class="dex-shell party-shell">
        <header class="dex-head">
          <div>
            <p class="dex-eyebrow">// FIELD LOCKER //</p>
            <h2 class="dex-title">PARTY / INVENTORY</h2>
          </div>
          <button class="menu-btn secondary dex-close" type="button" id="party-close">✕ CLOSE</button>
        </header>

        <div class="party-summary">
          <p class="dex-kv"><span>LEVEL</span><span>${state.player.level} · XP ${state.player.xp}/${next}</span></p>
          <p class="dex-kv"><span>BIO-PODS</span><span>${state.inventory.bioPods}</span></p>
          <p class="dex-kv"><span>WEAPON</span><span>${wdef?.name ?? 'NONE'} · hunger ${weapon?.hunger ?? 0}</span></p>
          <p class="dex-kv"><span>PARTY</span><span>${state.party.length}/${PARTY_CAP}</span></p>
        </div>

        <h3 class="party-section">ACTIVE PARTY</h3>
        <div class="party-grid">
          ${state.party.length === 0
            ? '<p class="dex-empty">NO SPECIMENS — CAPTURE IN THE ZONE</p>'
            : state.party.map(m => this.card(m)).join('')}
        </div>

        <h3 class="party-section">STORAGE</h3>
        <div class="party-grid">
          ${state.storage.length === 0
            ? '<p class="dex-empty">STORAGE EMPTY</p>'
            : state.storage.map(m => this.card(m)).join('')}
        </div>
      </div>
    `

    this.root.querySelector('#party-close')!.addEventListener('click', () => this.close())
  }

  private card(m: { monsterId: string; level: number; currentHp: number; maxHp: number; instanceId: string }): string {
    const def = MONSTER_BY_ID[m.monsterId]
    const name = def?.name ?? m.monsterId.toUpperCase()
    return `
      <article class="dex-card party-card">
        <img class="dex-card-art" src="${spriteUrl('monsters', m.monsterId)}" alt="${name}" width="72" height="72">
        <p class="dex-card-label">LV ${m.level} · ${def?.archetype ?? '?'}</p>
        <h3>${name}</h3>
        <p class="dex-kv"><span>HP</span><span>${m.currentHp}/${m.maxHp}</span></p>
      </article>
    `
  }
}
