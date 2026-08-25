import Phaser from 'phaser'
import { SaveSystem } from '../systems/SaveSystem'
import { pickWildEncounter } from '../systems/BattleSystem'
import type { SaveState } from '../types/save'

const TILE = 32
const COLS = 20
const ROWS = 14
const ENCOUNTER_CHANCE = 0.08
const POST_BATTLE_GRACE_MS = 1200

// 0 floor, 1 wall, 2 grass
const MAP: number[][] = (() => {
  const m: number[][] = []
  for (let y = 0; y < ROWS; y++) {
    const row: number[] = []
    for (let x = 0; x < COLS; x++) {
      if (x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1) row.push(1)
      else if (x >= 8 && x <= 16 && y >= 3 && y <= 10) row.push(2)
      else if ((x + y) % 7 === 0 && x > 2 && y > 2) row.push(2)
      else row.push(0)
    }
    m.push(row)
  }
  // clear spawn pocket
  for (let y = 1; y <= 4; y++)
    for (let x = 1; x <= 5; x++)
      m[y][x] = 0
  return m
})()

export class OverworldScene extends Phaser.Scene {
  private state!: SaveState
  private tileX = 2
  private tileY = 2
  private playerGfx!: Phaser.GameObjects.Rectangle
  private moving = false
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: {
    W: Phaser.Input.Keyboard.Key
    A: Phaser.Input.Keyboard.Key
    S: Phaser.Input.Keyboard.Key
    D: Phaser.Input.Keyboard.Key
  }
  private ui: HTMLDivElement | null = null
  private mapOriginX = 0
  private mapOriginY = 0
  private encounterLock = false
  private graceUntil = 0
  private moveTimer?: Phaser.Time.TimerEvent

  constructor() {
    super({ key: 'OverworldScene' })
  }

  create() {
    // Phaser reuses scene instances — reset locks from the previous visit
    this.moving = false
    this.encounterLock = false
    this.moveTimer?.remove(false)
    this.moveTimer = undefined
    this.graceUntil = this.time.now + POST_BATTLE_GRACE_MS

    document.getElementById('battle-ui')?.remove()
    document.getElementById('overworld-ui')?.remove()
    this.ui = null

    this.state = this.registry.get('saveState') as SaveState
    this.tileX = this.state.player.position?.x ?? 2
    this.tileY = this.state.player.position?.y ?? 2
    if (this.state.player.position?.map !== 'zone1') {
      this.tileX = 2
      this.tileY = 2
    }
    // Clamp in case of bad save coords
    this.tileX = Phaser.Math.Clamp(this.tileX, 1, COLS - 2)
    this.tileY = Phaser.Math.Clamp(this.tileY, 1, ROWS - 2)
    if (MAP[this.tileY][this.tileX] === 1) {
      this.tileX = 2
      this.tileY = 2
    }

    this.drawMap()
    this.playerGfx = this.add.rectangle(0, 0, TILE - 8, TILE - 8, 0x00ff41)
    this.playerGfx.setStrokeStyle(2, 0xccefd4)
    this.syncPlayerPos()

    if (this.input.keyboard) {
      this.input.keyboard.enabled = true
      this.input.keyboard.removeAllListeners()
      this.cursors = this.input.keyboard.createCursorKeys()
      this.wasd = {
        W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      }
      this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC).on('down', () => this.backToHub())
      this.input.keyboard.resetKeys()
    }

    this.game.canvas?.focus?.()
    this.mountHUD()
    this.events.off(Phaser.Scenes.Events.SHUTDOWN)
    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => this.onShutdown())
  }

  update() {
    if (this.moving || this.encounterLock || !this.cursors || !this.wasd) return

    let dx = 0
    let dy = 0
    if (Phaser.Input.Keyboard.JustDown(this.cursors.left) || Phaser.Input.Keyboard.JustDown(this.wasd.A)) dx = -1
    else if (Phaser.Input.Keyboard.JustDown(this.cursors.right) || Phaser.Input.Keyboard.JustDown(this.wasd.D)) dx = 1
    else if (Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.wasd.W)) dy = -1
    else if (Phaser.Input.Keyboard.JustDown(this.cursors.down) || Phaser.Input.Keyboard.JustDown(this.wasd.S)) dy = 1
    // Hold-to-walk after the first step
    else if (this.cursors.left.isDown || this.wasd.A.isDown) dx = -1
    else if (this.cursors.right.isDown || this.wasd.D.isDown) dx = 1
    else if (this.cursors.up.isDown || this.wasd.W.isDown) dy = -1
    else if (this.cursors.down.isDown || this.wasd.S.isDown) dy = 1

    if (dx || dy) this.tryMove(dx, dy)
  }

  private drawMap() {
    const { width: W, height: H } = this.scale
    const mapW = COLS * TILE
    const mapH = ROWS * TILE
    this.mapOriginX = Math.floor((W - mapW) / 2)
    this.mapOriginY = Math.floor((H - mapH) / 2) - 20

    const bg = this.add.graphics()
    bg.fillStyle(0x030806, 1)
    bg.fillRect(0, 0, W, H)

    const g = this.add.graphics()
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const t = MAP[y][x]
        const px = this.mapOriginX + x * TILE
        const py = this.mapOriginY + y * TILE
        if (t === 1) {
          g.fillStyle(0x1a2a1c, 1)
          g.fillRect(px, py, TILE - 1, TILE - 1)
          g.lineStyle(1, 0x00ff41, 0.15)
          g.strokeRect(px, py, TILE - 1, TILE - 1)
        } else if (t === 2) {
          g.fillStyle(0x0a1a0c, 1)
          g.fillRect(px, py, TILE - 1, TILE - 1)
          g.fillStyle(0x00ff41, 0.12)
          for (let i = 0; i < 4; i++) {
            g.fillRect(px + 4 + (i % 2) * 12, py + 6 + Math.floor(i / 2) * 12, 6, 8)
          }
        } else {
          g.fillStyle(0x07100a, 1)
          g.fillRect(px, py, TILE - 1, TILE - 1)
          g.lineStyle(1, 0x00ff41, 0.04)
          g.strokeRect(px, py, TILE - 1, TILE - 1)
        }
      }
    }
  }

  private syncPlayerPos() {
    this.playerGfx.setPosition(
      this.mapOriginX + this.tileX * TILE + TILE / 2,
      this.mapOriginY + this.tileY * TILE + TILE / 2,
    )
  }

  private tryMove(dx: number, dy: number) {
    const nx = this.tileX + dx
    const ny = this.tileY + dy
    if (ny < 0 || nx < 0 || ny >= ROWS || nx >= COLS) return
    if (MAP[ny][nx] === 1) return

    this.moving = true
    this.tileX = nx
    this.tileY = ny
    this.state.player.position = { map: 'zone1', x: nx, y: ny }
    this.syncPlayerPos()
    this.refreshHUD()
    SaveSystem.save(this.state)
    this.registry.set('saveState', this.state)

    const inGrace = this.time.now < this.graceUntil
    if (!inGrace && MAP[ny][nx] === 2 && Math.random() < ENCOUNTER_CHANCE) {
      this.triggerEncounter()
      return
    }

    this.moveTimer?.remove(false)
    this.moveTimer = this.time.delayedCall(140, () => {
      this.moving = false
    })
  }

  private triggerEncounter() {
    this.encounterLock = true
    this.moving = true
    this.moveTimer?.remove(false)
    const enemy = pickWildEncounter(this.state.player.level)
    this.registry.set('battleEnemyId', enemy.id)
    this.registry.set('saveState', this.state)
    this.destroyHUD()
    this.scene.start('BattleScene')
  }

  private mountHUD() {
    const uiRoot = document.getElementById('ui')!
    this.ui = document.createElement('div')
    this.ui.id = 'overworld-ui'
    uiRoot.appendChild(this.ui)
    this.refreshHUD()
  }

  private refreshHUD() {
    if (!this.ui) return
    const p = this.state.player
    this.ui.innerHTML = `
      <div class="ow-bar">
        <span>${p.name} · LV ${p.level} · HP ${p.hp}/${p.maxHp} · PODS ${this.state.inventory.bioPods}</span>
        <span class="ow-hint">WASD / ARROWS move · green scrub = encounters · ESC hub</span>
        <button class="menu-btn secondary ow-hub" type="button" id="btn-hub">← HUB</button>
      </div>
    `
    this.ui.querySelector('#btn-hub')?.addEventListener('click', () => this.backToHub())
  }

  private destroyHUD() {
    this.ui?.remove()
    this.ui = null
  }

  private onShutdown() {
    this.moveTimer?.remove(false)
    this.moveTimer = undefined
    this.destroyHUD()
  }

  private backToHub() {
    if (this.encounterLock) return
    SaveSystem.save(this.state)
    this.registry.set('saveState', this.state)
    this.destroyHUD()
    this.scene.start('GameScene')
  }
}
