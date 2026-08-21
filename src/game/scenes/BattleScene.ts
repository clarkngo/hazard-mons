import Phaser from 'phaser'
import { SaveSystem } from '../systems/SaveSystem'
import { CaptureSystem } from '../systems/CaptureSystem'
import {
  calcDamage,
  captureChance,
  createEnemyFighter,
  fleeChance,
  playerAttackPower,
  playerDefense,
  playerSpeed,
  xpReward,
  type BattleFighter,
} from '../systems/BattleSystem'
import { applyPlayerXp, type SaveState } from '../types/save'
import { MONSTER_BY_ID } from '../data/monsters'
import { spriteUrl } from '../data/sprites'

export class BattleScene extends Phaser.Scene {
  private ui: HTMLDivElement | null = null
  private state!: SaveState
  private enemy!: BattleFighter
  private log: string[] = []
  private busy = false
  private ended = false

  constructor() {
    super({ key: 'BattleScene' })
  }

  create() {
    const { width: W, height: H } = this.scale
    const gfx = this.add.graphics()
    gfx.fillStyle(0x050a06, 1)
    gfx.fillRect(0, 0, W, H)
    gfx.lineStyle(1, 0xff2240, 0.08)
    for (let y = 0; y < H; y += 40) gfx.lineBetween(0, y, W, y)

    this.state = this.registry.get('saveState') as SaveState
    const enemyId = this.registry.get('battleEnemyId') as string
    const def = MONSTER_BY_ID[enemyId]
    if (!def) {
      this.returnToZone()
      return
    }

    this.enemy = createEnemyFighter(def, this.state.player.level)
    CaptureSystem.markSpotted(this.state, def.id)
    CaptureSystem.markEncountered(this.state, def.id)
    SaveSystem.save(this.state)

    this.log = [`// HOSTILE CONTACT — ${def.name} //`, 'Bio-sensors locked. Choose an action.']
    this.mountUI()
    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => this.destroyUI())
  }

  private mountUI() {
    const uiRoot = document.getElementById('ui')!
    this.ui = document.createElement('div')
    this.ui.id = 'battle-ui'
    this.ui.classList.add('fade-in')
    uiRoot.appendChild(this.ui)
    this.render()
  }

  private destroyUI() {
    this.ui?.remove()
    this.ui = null
  }

  private render() {
    if (!this.ui || this.ended) return
    const e = this.enemy
    const p = this.state.player
    const ePct = Math.max(0, Math.round((e.hp / e.maxHp) * 100))
    const pPct = Math.max(0, Math.round((p.hp / p.maxHp) * 100))
    const pods = this.state.inventory.bioPods

    this.ui.innerHTML = `
      <div class="battle-shell">
        <p class="battle-eyebrow">// COMBAT PROTOCOL — PHASE 3 //</p>
        <div class="battle-arena">
          <div class="battle-side enemy">
            <img class="battle-sprite" src="${spriteUrl('monsters', e.monsterId)}" alt="${e.name}" width="128" height="128">
            <p class="battle-name">${e.name}</p>
            <p class="battle-meta">${e.archetype} · ${e.viralStrain}</p>
            <div class="hp-bar"><div class="hp-fill enemy" style="width:${ePct}%"></div></div>
            <p class="hp-text">${e.hp} / ${e.maxHp}</p>
          </div>
          <div class="battle-side player">
            <p class="battle-name">${p.name}</p>
            <p class="battle-meta">LV ${p.level} · LOAD ${p.viralLoad}/${p.viralLoadCap}</p>
            <div class="hp-bar"><div class="hp-fill player" style="width:${pPct}%"></div></div>
            <p class="hp-text">${p.hp} / ${p.maxHp}</p>
            <p class="battle-pods">BIO-PODS × ${pods}</p>
          </div>
        </div>
        <div class="battle-log">${this.log.slice(-5).map(l => `<p>${l}</p>`).join('')}</div>
        <div class="battle-actions">
          <button class="menu-btn primary" id="btn-attack" ${this.busy ? 'disabled' : ''}>⚔ ATTACK</button>
          <button class="menu-btn secondary" id="btn-capture" ${this.busy || pods < 1 ? 'disabled' : ''}>⊕ CAPTURE</button>
          <button class="menu-btn secondary" id="btn-flee" ${this.busy ? 'disabled' : ''}>↩ FLEE</button>
        </div>
      </div>
    `

    this.ui.querySelector('#btn-attack')?.addEventListener('click', () => this.doAttack())
    this.ui.querySelector('#btn-capture')?.addEventListener('click', () => this.doCapture())
    this.ui.querySelector('#btn-flee')?.addEventListener('click', () => this.doFlee())
  }

  private push(msg: string) {
    this.log.push(msg)
  }

  private async doAttack() {
    if (this.busy || this.ended) return
    this.busy = true
    const dmg = calcDamage(playerAttackPower(this.state), this.enemy.def)
    this.enemy.hp = Math.max(0, this.enemy.hp - dmg)
    this.push(`You strike for ${dmg} damage.`)
    this.render()

    if (this.enemy.hp <= 0) {
      await this.finishVictory('defeat')
      return
    }
    await this.enemyTurn()
    this.busy = false
    this.render()
  }

  private async doCapture() {
    if (this.busy || this.ended || this.state.inventory.bioPods < 1) return
    this.busy = true
    this.state.inventory.bioPods -= 1
    const chance = captureChance(this.enemy)
    this.push(`Bio-Pod launched… (${Math.round(chance * 100)}% lock)`)
    this.render()

    if (Math.random() < chance) {
      const def = MONSTER_BY_ID[this.enemy.monsterId]!
      const { dest } = CaptureSystem.addToCollection(this.state, def)
      this.push(`CAPTURED ${def.name} → ${dest.toUpperCase()}`)
      this.push(CaptureSystem.geneticSummary(def.id))
      await this.finishVictory('capture')
      return
    }

    this.push('Capture failed. The specimen broke free.')
    await this.enemyTurn()
    this.busy = false
    this.render()
  }

  private async doFlee() {
    if (this.busy || this.ended) return
    this.busy = true
    const chance = fleeChance(playerSpeed(this.state), this.enemy.spd)
    if (Math.random() < chance) {
      this.push('Disengaged. Returning to zone…')
      SaveSystem.save(this.state)
      this.registry.set('saveState', this.state)
      this.showEnd('FLED', 'You escaped the encounter.', false)
      return
    }
    this.push('Flee failed — path blocked.')
    await this.enemyTurn()
    this.busy = false
    this.render()
  }

  private async enemyTurn() {
    await wait(280)
    const dmg = calcDamage(this.enemy.atk, playerDefense(this.state))
    this.state.player.hp = Math.max(0, this.state.player.hp - dmg)
    this.push(`${this.enemy.name} hits for ${dmg}.`)

    if (this.enemy.archetype === 'Toxic' && Math.random() < 0.45) {
      const bump = 4 + Math.floor(Math.random() * 5)
      this.state.player.viralLoad = Math.min(
        this.state.player.viralLoadCap,
        this.state.player.viralLoad + bump,
      )
      this.push(`Viral contamination +${bump}.`)
    }

    if (this.state.player.hp <= 0) {
      this.state.player.hp = Math.max(1, Math.floor(this.state.player.maxHp * 0.25))
      this.state.player.viralLoad = Math.min(
        this.state.player.viralLoadCap,
        this.state.player.viralLoad + 8,
      )
      SaveSystem.save(this.state)
      this.registry.set('saveState', this.state)
      this.showEnd('DOWNED', 'You black out and crawl back to the hub. HP partially restored.', true)
      return
    }
    SaveSystem.save(this.state)
    this.registry.set('saveState', this.state)
  }

  private async finishVictory(kind: 'defeat' | 'capture') {
    const xp = xpReward(this.enemy)
    const { leveled, levelsGained } = applyPlayerXp(this.state, xp)
    this.push(`+${xp} XP${leveled ? ` · LEVEL UP ×${levelsGained}` : ''}`)
    if (kind === 'defeat') {
      // small bio-pod chance on kill
      if (Math.random() < 0.2) {
        this.state.inventory.bioPods += 1
        this.push('Salvaged +1 Bio-Pod from the remains.')
      }
    }
    SaveSystem.save(this.state)
    this.registry.set('saveState', this.state)
    this.showEnd(
      kind === 'capture' ? 'CAPTURED' : 'NEUTRALIZED',
      kind === 'capture'
        ? `${this.enemy.name} secured. Genetic code filed.`
        : `${this.enemy.name} neutralized. +${xp} XP.`,
      false,
    )
  }

  private showEnd(title: string, detail: string, toHub: boolean) {
    this.ended = true
    this.busy = true
    if (!this.ui) return
    this.ui.innerHTML = `
      <div class="battle-shell end">
        <p class="battle-eyebrow">// ENCOUNTER RESOLVED //</p>
        <h2 class="battle-end-title">${title}</h2>
        <p class="battle-end-detail">${detail}</p>
        <div class="battle-log">${this.log.slice(-6).map(l => `<p>${l}</p>`).join('')}</div>
        <button class="menu-btn primary" id="btn-continue">▶ CONTINUE</button>
      </div>
    `
    this.ui.querySelector('#btn-continue')!.addEventListener('click', () => {
      this.destroyUI()
      if (toHub) this.scene.start('GameScene')
      else this.returnToZone()
    })
  }

  private returnToZone() {
    this.scene.start('OverworldScene')
  }
}

function wait(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}
