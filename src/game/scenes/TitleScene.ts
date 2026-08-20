import Phaser from 'phaser'
import { SaveSystem } from '../systems/SaveSystem'
import { createDefaultSave } from '../types/save'
import type { SaveState } from '../types/save'

// ── Node network data ────────────────────────────────────────────
interface Node { x: number; y: number; vx: number; vy: number; r: number; ph: number }
interface Packet { x0: number; y0: number; x1: number; y1: number; t: number; spd: number; col: number }

const MAX_DIST = 165
const NODE_COUNT = 60

function makeNode(w: number, h: number): Node {
  return {
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.38,
    vy: (Math.random() - 0.5) * 0.38,
    r: Math.random() * 1.6 + 1.1,
    ph: Math.random() * Math.PI * 2,
  }
}

// ── TitleScene ────────────────────────────────────────────────────
export class TitleScene extends Phaser.Scene {
  private gfx!: Phaser.GameObjects.Graphics
  private nodes: Node[] = []
  private packets: Packet[] = []
  private ui: HTMLDivElement | null = null

  constructor() {
    super({ key: 'TitleScene' })
  }

  create() {
    const { width: W, height: H } = this.scale

    // Node network graphics layer
    this.gfx = this.add.graphics()
    this.nodes = Array.from({ length: NODE_COUNT }, () => makeNode(W, H))

    // Resize: redistribute nodes
    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      for (const n of this.nodes) {
        n.x = Math.min(n.x, gameSize.width)
        n.y = Math.min(n.y, gameSize.height)
      }
    })

    this.mountUI()

    // Clean up DOM when scene shuts down
    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => this.destroyUI())
  }

  update() {
    const { width: W, height: H } = this.scale
    this.updateNodes(W, H)
    this.drawNetwork(W, H)
  }

  // ── Node network logic ─────────────────────────────────────────
  private updateNodes(W: number, H: number) {
    for (const n of this.nodes) {
      n.x  += n.vx
      n.y  += n.vy
      n.ph += 0.018
      if (n.x < 0 || n.x > W) n.vx *= -1
      if (n.y < 0 || n.y > H) n.vy *= -1
    }

    // Occasionally fire a packet along a nearby edge
    if (Math.random() < 0.055) {
      const a = this.nodes[Math.floor(Math.random() * this.nodes.length)]
      const near = this.nodes.filter(b => {
        if (b === a) return false
        const dx = a.x - b.x, dy = a.y - b.y
        return dx * dx + dy * dy < MAX_DIST * MAX_DIST
      })
      if (near.length) {
        const b = near[Math.floor(Math.random() * near.length)]
        // Green, occasionally red (viral) or purple (mutation)
        const rnd = Math.random()
        const col = rnd < 0.10 ? 0xff2240 : rnd < 0.20 ? 0xbf00ff : 0x00ff41
        this.packets.push({ x0: a.x, y0: a.y, x1: b.x, y1: b.y, t: 0, spd: 0.013 + Math.random() * 0.01, col })
      }
    }

    this.packets = this.packets.filter(p => (p.t += p.spd) < 1)
  }

  private drawNetwork(W: number, H: number) {
    this.gfx.clear()

    // Edges
    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const a = this.nodes[i], b = this.nodes[j]
        const dx = a.x - b.x, dy = a.y - b.y
        const d  = Math.sqrt(dx * dx + dy * dy)
        if (d < MAX_DIST) {
          const alpha = (1 - d / MAX_DIST) * 0.12
          this.gfx.lineStyle(0.7, 0x00ff41, alpha)
          this.gfx.lineBetween(a.x, a.y, b.x, b.y)
        }
      }
    }

    // Packets — faked glow with 3 concentric circles
    for (const p of this.packets) {
      const x = p.x0 + (p.x1 - p.x0) * p.t
      const y = p.y0 + (p.y1 - p.y0) * p.t
      const a = Math.sin(p.t * Math.PI)
      this.gfx.fillStyle(p.col, a * 0.12); this.gfx.fillCircle(x, y, 7)
      this.gfx.fillStyle(p.col, a * 0.30); this.gfx.fillCircle(x, y, 4)
      this.gfx.fillStyle(p.col, a * 0.90); this.gfx.fillCircle(x, y, 2.5)
    }

    // Nodes — faked glow
    for (const n of this.nodes) {
      const g = 0.5 + 0.5 * Math.sin(n.ph)
      this.gfx.fillStyle(0x00ff41, g * 0.10); this.gfx.fillCircle(n.x, n.y, n.r * 3.5)
      this.gfx.fillStyle(0x00ff41, 0.35 + g * 0.40); this.gfx.fillCircle(n.x, n.y, n.r)
    }
  }

  // ── HTML UI ────────────────────────────────────────────────────
  private mountUI() {
    const uiRoot = document.getElementById('ui')!
    const save   = SaveSystem.load()

    this.ui = document.createElement('div')
    this.ui.id = 'title-ui'
    this.ui.classList.add('fade-in')
    this.ui.innerHTML = this.buildTitleHTML(save)
    uiRoot.appendChild(this.ui)

    this.bindTitleEvents(save)
  }

  private buildTitleHTML(save: SaveState | null): string {
    const hasSave = save !== null
    const saveInfo = hasSave
      ? `LAST SAVE — ${save.player.name} &nbsp;·&nbsp; ${SaveSystem.formatTimestamp(save.timestamp)}`
      : ''
    // '../' goes up one level from phase1/ or latest/ back to the landing page
    const homeUrl = import.meta.env.DEV ? '/' : '../'

    return `
      <a href="${homeUrl}" class="title-home-link">☣ HAZARDMONS.DEV</a>
      <p class="title-eyebrow">// VIRAL INCIDENT REPORT — PROJECT H.M. //</p>
      <h1 class="title-main">
        <span class="tp">HAZARD</span><span class="th">MONS</span>
      </h1>
      <p class="title-version">v0.2.0 — PHASE 2: DATA LAYER</p>

      <div class="title-menu">
        <button class="menu-btn primary" id="btn-new">▶ NEW GAME</button>
        <button class="menu-btn primary" id="btn-continue" ${hasSave ? '' : 'disabled'}>
          ${hasSave ? '▶ CONTINUE' : '○ CONTINUE'}
        </button>
        <button class="menu-btn secondary" id="btn-import">⊕ IMPORT SAVE</button>
        ${hasSave ? '<button class="menu-btn secondary" id="btn-export">↓ EXPORT SAVE</button>' : ''}
      </div>

      <p class="title-save-info" id="save-info">${saveInfo}</p>

      <input type="file" id="file-input" accept=".json" style="display:none">
    `
  }

  private bindTitleEvents(existingSave: SaveState | null) {
    const ui = this.ui!

    ui.querySelector('#btn-new')!.addEventListener('click', () => this.showNameModal())

    if (existingSave) {
      ui.querySelector('#btn-continue')!.addEventListener('click', () => {
        this.launchGame(existingSave)
      })
      ui.querySelector('#btn-export')?.addEventListener('click', () => {
        SaveSystem.exportJSON(existingSave)
      })
    }

    ui.querySelector('#btn-import')!.addEventListener('click', () => {
      ui.querySelector<HTMLInputElement>('#file-input')!.click()
    })

    ui.querySelector<HTMLInputElement>('#file-input')!.addEventListener('change', async e => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      try {
        const state = await SaveSystem.importJSON(file)
        SaveSystem.save(state)
        this.launchGame(state)
      } catch (err) {
        console.error('Import failed:', err)
        this.showError('INVALID SAVE FILE')
      }
    })
  }

  private showNameModal() {
    const backdrop = document.createElement('div')
    backdrop.className = 'modal-backdrop fade-in'
    backdrop.innerHTML = `
      <div class="modal-box">
        <p class="modal-label">// ENTER YOUR DESIGNATION //</p>
        <p class="modal-title">IDENTIFY YOURSELF</p>
        <input type="text" class="name-input" id="name-input"
          maxlength="12" placeholder="SURVIVOR" autocomplete="off" spellcheck="false">
        <div class="modal-btns">
          <button class="menu-btn primary" id="btn-start">INITIALIZE</button>
          <button class="menu-btn secondary" id="btn-cancel">ABORT</button>
        </div>
      </div>
    `
    this.ui!.appendChild(backdrop)

    const input = backdrop.querySelector<HTMLInputElement>('#name-input')!
    input.focus()

    const start = () => {
      const name  = input.value.trim() || 'SURVIVOR'
      const state = createDefaultSave(name)
      SaveSystem.save(state)
      this.launchGame(state)
    }

    backdrop.querySelector('#btn-start')!.addEventListener('click', start)
    backdrop.querySelector('#btn-cancel')!.addEventListener('click', () => backdrop.remove())
    input.addEventListener('keydown', e => { if (e.key === 'Enter') start() })
  }

  private showError(msg: string) {
    const el = document.createElement('p')
    el.style.cssText = `
      position:absolute; bottom:2rem; left:50%; transform:translateX(-50%);
      font-family:'Orbitron',monospace; font-size:0.6rem; letter-spacing:0.2em;
      color:#ff2240; border:1px solid rgba(255,34,64,0.4); padding:0.4rem 1rem;
    `
    el.textContent = `⚠ ${msg}`
    this.ui!.appendChild(el)
    setTimeout(() => el.remove(), 3000)
  }

  private launchGame(state: SaveState) {
    this.registry.set('saveState', state)
    this.destroyUI()
    this.scene.start('GameScene')
  }

  private destroyUI() {
    this.ui?.remove()
    this.ui = null
  }
}
