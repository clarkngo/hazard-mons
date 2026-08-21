import Phaser from 'phaser'
import { SaveSystem } from '../systems/SaveSystem'
import type { SaveState } from '../types/save'
import { xpToNextLevel } from '../types/save'
import { ViralDexPanel } from '../ui/ViralDexPanel'
import { PartyInventoryPanel } from '../ui/PartyInventoryPanel'

export class GameScene extends Phaser.Scene {
  private ui: HTMLDivElement | null = null
  private dex = new ViralDexPanel()
  private party = new PartyInventoryPanel()

  constructor() {
    super({ key: 'GameScene' })
  }

  create() {
    const { width: W, height: H } = this.scale
    const gfx = this.add.graphics()
    gfx.fillStyle(0x030806, 1)
    gfx.fillRect(0, 0, W, H)
    gfx.lineStyle(0.5, 0x00ff41, 0.03)
    for (let x = 0; x < W; x += 56) gfx.lineBetween(x, 0, x, H)
    for (let y = 0; y < H; y += 56) gfx.lineBetween(0, y, W, y)

    const state = this.registry.get('saveState') as SaveState
    this.mountUI(state)
    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => this.destroyUI())
  }

  private mountUI(state: SaveState) {
    const uiRoot = document.getElementById('ui')!
    this.ui = document.createElement('div')
    this.ui.id = 'game-ui'
    this.ui.classList.add('fade-in')
    this.ui.innerHTML = this.buildHTML(state)
    uiRoot.appendChild(this.ui)
    this.bindEvents(state)
  }

  private buildHTML(state: SaveState): string {
    const load = state.player.viralLoad
    const cap = state.player.viralLoadCap
    const pct = Math.round((load / cap) * 100)
    const next = xpToNextLevel(state.player.level)
    const known = Object.keys(state.viralDex ?? {}).length

    return `
      <p class="game-eyebrow">// OPS HUB — COMBAT LOOP ONLINE //</p>
      <h2 class="game-title">${state.player.name}</h2>
      <p class="game-coming-soon">PHASE 3 · LV ${state.player.level} · XP ${state.player.xp}/${next}</p>

      <div class="save-card">
        <p class="save-card-label">// BIOMETRIC STATUS //</p>
        <div class="save-card-row">
          <span class="save-card-key">HP</span>
          <span class="save-card-val">${state.player.hp} / ${state.player.maxHp}</span>
        </div>
        <div class="save-card-row">
          <span class="save-card-key">VIRAL LOAD</span>
          <span class="save-card-val" style="color:${pct >= 80 ? '#ff2240' : '#00ff41'}">${load} / ${cap}</span>
        </div>
        <div class="save-card-row">
          <span class="save-card-key">BIO-PODS</span>
          <span class="save-card-val">${state.inventory?.bioPods ?? 0}</span>
        </div>
        <div class="save-card-row">
          <span class="save-card-key">PARTY</span>
          <span class="save-card-val">${state.party?.length ?? 0} / 6 · DEX ${known}</span>
        </div>
        <div class="save-card-row">
          <span class="save-card-key">CHAPTER</span>
          <span class="save-card-val">${state.progress.chapter}</span>
        </div>
        <div class="save-card-row">
          <span class="save-card-key">LAST SAVE</span>
          <span class="save-card-val" style="font-size:0.65rem">${SaveSystem.formatTimestamp(state.timestamp)}</span>
        </div>
      </div>

      <div class="game-actions">
        <button class="menu-btn primary" id="btn-zone">▶ ENTER ZONE</button>
        <button class="menu-btn secondary" id="btn-dex">▶ VIRAL DEX</button>
        <button class="menu-btn secondary" id="btn-party">▶ PARTY / INV</button>
        <button class="menu-btn secondary" id="btn-back">← TITLE</button>
        <button class="menu-btn secondary" id="btn-export">↓ EXPORT SAVE</button>
      </div>
    `
  }

  private bindEvents(state: SaveState) {
    this.ui!.querySelector('#btn-zone')!.addEventListener('click', () => {
      this.destroyUI()
      this.registry.set('saveState', state)
      this.scene.start('OverworldScene')
    })

    this.ui!.querySelector('#btn-dex')!.addEventListener('click', () => {
      this.dex.open(state)
    })

    this.ui!.querySelector('#btn-party')!.addEventListener('click', () => {
      this.party.open(state)
    })

    this.ui!.querySelector('#btn-back')!.addEventListener('click', () => {
      this.destroyUI()
      this.scene.start('TitleScene')
    })

    this.ui!.querySelector('#btn-export')!.addEventListener('click', () => {
      SaveSystem.exportJSON(state)
    })
  }

  private destroyUI() {
    this.dex.close()
    this.party.close()
    this.ui?.remove()
    this.ui = null
  }
}
