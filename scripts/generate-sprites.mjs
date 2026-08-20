#!/usr/bin/env node
/**
 * Procedural pixel-art sprite generator for Hazard Mons Viral Dex.
 * 32×32 PNGs → public/assets/sprites/{monsters,weapons,armor,accessories}/
 */
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'public', 'assets', 'sprites')
const SIZE = 32

const hex = (h) => {
  const n = parseInt(h.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255]
}

const STRAIN = {
  Alpha: { main: hex('#ff3355'), light: hex('#ff8fa3'), dark: hex('#6e0c20'), mid: hex('#c41e3a'), glow: hex('#ff2240') },
  Beta:  { main: hex('#c42bff'), light: hex('#e9a0ff'), dark: hex('#4a0070'), mid: hex('#8e14c4'), glow: hex('#d040ff') },
  Gamma: { main: hex('#00e83a'), light: hex('#9affb0'), dark: hex('#006622'), mid: hex('#00b332'), glow: hex('#00ff41') },
  Delta: { main: hex('#00d8e0'), light: hex('#a8ffff'), dark: hex('#005c66'), mid: hex('#0099a3'), glow: hex('#00f5ff') },
  Omega: { main: hex('#ffb020'), light: hex('#ffe08a'), dark: hex('#6e4800'), mid: hex('#d48900'), glow: hex('#ffcc33') },
}

const C = {
  outline: hex('#e8f5ea'),
  bone: hex('#d5e0d0'),
  steel: hex('#7a8a82'),
  steelDk: hex('#3a4a42'),
  void: hex('#0a100c'),
  cream: hex('#f2f7ef'),
  vein: hex('#ff3355'),
  toxic: hex('#00ff41'),
  cyan: hex('#00f5ff'),
  purple: hex('#bf00ff'),
}

function canvas() { return new Uint8Array(SIZE * SIZE * 4) }

function set(px, x, y, c) {
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE || !c) return
  const i = (y * SIZE + x) * 4
  px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = c[3] ?? 255
}

function clear(px, x, y) {
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return
  const i = (y * SIZE + x) * 4
  px[i] = px[i + 1] = px[i + 2] = px[i + 3] = 0
}

function get(px, x, y) {
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return null
  const i = (y * SIZE + x) * 4
  if (px[i + 3] === 0) return null
  return [px[i], px[i + 1], px[i + 2], px[i + 3]]
}

function fillRect(px, x, y, w, h, c) {
  for (let yy = y; yy < y + h; yy++)
    for (let xx = x; xx < x + w; xx++) set(px, xx, yy, c)
}

function fillCircle(px, cx, cy, r, c) {
  for (let y = -r; y <= r; y++)
    for (let x = -r; x <= r; x++)
      if (x * x + y * y <= r * r + r * 0.2) set(px, cx + x, cy + y, c)
}

function outline(px, color = C.outline) {
  const copy = Uint8Array.from(px)
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (get(copy, x, y)) continue
      if (get(copy, x - 1, y) || get(copy, x + 1, y) || get(copy, x, y - 1) || get(copy, x, y + 1))
        set(px, x, y, color)
    }
  }
}

function encodePNG(px) {
  const w = SIZE, h = SIZE
  const raw = Buffer.alloc((w * 4 + 1) * h)
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0
    for (let x = 0; x < w; x++) {
      const si = (y * w + x) * 4
      const di = y * (w * 4 + 1) + 1 + x * 4
      raw[di] = px[si]; raw[di + 1] = px[si + 1]; raw[di + 2] = px[si + 2]; raw[di + 3] = px[si + 3]
    }
  }
  const compressed = deflateSync(raw)
  const crcTable = (() => {
    const t = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      t[n] = c
    }
    return t
  })()
  const crc = (buf) => {
    let c = 0xffffffff
    for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
    return (c ^ 0xffffffff) >>> 0
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
    const typeBuf = Buffer.from(type)
    const crcBuf = Buffer.alloc(4)
    crcBuf.writeUInt32BE(crc(Buffer.concat([typeBuf, data])))
    return Buffer.concat([len, typeBuf, data, crcBuf])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8; ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function writeSprite(folder, id, px) {
  const dir = join(OUT, folder)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, `${id}.png`), encodePNG(px))
}

// ── Monsters ─────────────────────────────────────────────────────
function drawSprinter(px, p, stage) {
  const leg = 6 + stage
  // torso
  fillRect(px, 12, 9, 8, 10 + stage, p.main)
  fillRect(px, 13, 10, 6, 3, p.light)
  fillRect(px, 13, 14, 6, 4, p.mid)
  // head
  fillRect(px, 13, 4, 7, 6, p.main)
  fillRect(px, 14, 5, 5, 3, p.light)
  set(px, 17, 6, C.cream); set(px, 17, 6, p.glow)
  set(px, 15, 7, C.void)
  // jaw
  fillRect(px, 18, 8, 3 + stage, 2, p.dark)
  // arms in motion
  fillRect(px, 7, 11, 5, 3, p.mid)
  fillRect(px, 20, 10, 5 + stage, 3, p.mid)
  // legs
  fillRect(px, 12, 19 + stage, 3, leg, p.dark)
  fillRect(px, 17, 19 + stage, 3, leg, p.dark)
  fillRect(px, 11, 19 + stage + leg - 1, 4, 2, p.mid)
  fillRect(px, 17, 19 + stage + leg - 1, 4, 2, p.mid)
  if (stage >= 1) {
    fillRect(px, 19, 8, 2, 5, p.glow) // fin/spike
    fillRect(px, 11, 8, 1, 4, p.light)
  }
  if (stage >= 2) {
    fillRect(px, 4, 12, 3, 1, p.glow)
    fillRect(px, 5, 14, 2, 1, p.light)
    fillRect(px, 24, 9, 3, 1, p.glow)
    fillRect(px, 20, 6, 4, 1, p.dark) // snarl
  }
}

function drawTank(px, p, stage) {
  const w = 14 + stage * 2
  const h = 12 + stage * 2
  const bx = Math.floor((SIZE - w) / 2)
  const by = 7
  fillRect(px, bx, by, w, h, p.main)
  fillRect(px, bx + 2, by + 2, w - 4, h - 4, p.dark)
  fillRect(px, bx + 3, by + 3, w - 6, 3, p.light)
  fillRect(px, bx + 3, by + 7, w - 6, 2, p.mid)
  // head block
  fillRect(px, bx + Math.floor(w / 2) - 3, by - 5, 7, 5, p.main)
  fillRect(px, bx + Math.floor(w / 2) - 2, by - 4, 5, 2, p.light)
  set(px, bx + Math.floor(w / 2), by - 3, p.glow)
  // legs
  fillRect(px, bx + 2, by + h, 4, 5 + stage, p.dark)
  fillRect(px, bx + w - 6, by + h, 4, 5 + stage, p.dark)
  if (stage >= 1) {
    fillRect(px, bx - 3, by + 2, 3, 6, p.light)
    fillRect(px, bx + w, by + 2, 3, 6, p.light)
  }
  if (stage >= 2) {
    for (let i = 0; i < 5; i++) fillRect(px, bx + 2 + i * 3, by - 2, 2, 2, p.glow)
    fillRect(px, bx + 4, by + 5, w - 8, 2, C.bone)
  }
}

function drawToxic(px, p, stage) {
  const r = 8 + stage
  fillCircle(px, 16, 15, r, p.main)
  fillCircle(px, 16, 14, r - 2, p.light)
  fillCircle(px, 14, 12, 3, p.mid)
  // face
  fillRect(px, 12, 14, 2, 2, C.void)
  fillRect(px, 18, 14, 2, 2, C.void)
  fillRect(px, 14, 18, 4, 2, p.dark)
  fillRect(px, 15, 20, 2, 3 + stage, p.glow)
  // spores
  const spores = [[6, 7], [25, 8], [5, 14], [27, 15], [9, 5], [23, 4], [8, 20], [24, 22]]
  for (let i = 0; i < 3 + stage * 2; i++) {
    const [sx, sy] = spores[i]
    fillRect(px, sx, sy, 2, 2, p.glow)
  }
  if (stage >= 2) {
    fillRect(px, 11, 4, 2, 5, p.dark)
    fillRect(px, 19, 3, 2, 6, p.dark)
    fillRect(px, 15, 2, 2, 5, p.glow)
  }
}

function drawCamouflage(px, p, stage) {
  fillRect(px, 11, 7, 10, 16, p.main)
  fillRect(px, 13, 5, 6, 4, p.main)
  fillRect(px, 12, 9, 8, 10, p.mid)
  fillRect(px, 14, 11, 4, 6, p.light)
  // diamond head tip
  fillRect(px, 14, 3, 4, 3, p.light)
  set(px, 15, 12, p.glow); set(px, 17, 12, p.glow)
  // cloak gaps
  for (let y = 10; y < 20; y += 3) {
    clear(px, 12, y); clear(px, 19, y)
  }
  fillRect(px, 12, 22, 8, 3, p.dark)
  if (stage >= 1) {
    fillRect(px, 6, 13, 5, 3, p.main)
    fillRect(px, 21, 13, 5, 3, p.main)
  }
  if (stage >= 2) {
    fillRect(px, 4, 9, 3, 1, p.light)
    fillRect(px, 25, 10, 3, 1, p.light)
    fillRect(px, 3, 16, 3, 1, p.glow)
    fillRect(px, 26, 17, 3, 1, p.glow)
  }
}

function drawSentinel(px, p, stage) {
  // base
  fillRect(px, 11, 22, 10, 5, p.main)
  fillRect(px, 13, 23, 6, 3, p.dark)
  // stalk
  fillRect(px, 15, 12, 3, 11, p.dark)
  fillRect(px, 16, 12, 1, 11, p.mid)
  // eye orb
  const ey = 9 - stage
  fillCircle(px, 16, ey, 6 + Math.floor(stage / 2), p.main)
  fillCircle(px, 16, ey, 4, p.light)
  fillCircle(px, 16, ey, 2, C.void)
  set(px, 16, ey, p.glow)
  if (stage >= 1) {
    fillRect(px, 5, 12, 7, 4, p.dark)
    fillRect(px, 20, 12, 7, 4, p.dark)
    fillRect(px, 4, 13, 2, 2, p.glow)
    fillRect(px, 26, 13, 2, 2, p.glow)
  }
  if (stage >= 2) {
    fillRect(px, 9, 6, 3, 3, p.main)
    fillRect(px, 20, 6, 3, 3, p.main)
    set(px, 16, 2, p.glow)
    set(px, 14, 3, p.light)
    set(px, 18, 3, p.light)
  }
}

const ARCH_DRAW = {
  Sprinter: drawSprinter,
  Tank: drawTank,
  Toxic: drawToxic,
  Camouflage: drawCamouflage,
  Sentinel: drawSentinel,
}

function accent(px, id, p) {
  if (id.includes('skitter')) {
    fillRect(px, 7, 20, 2, 5, p.dark)
    fillRect(px, 10, 21, 2, 5, p.dark)
    fillRect(px, 20, 20, 2, 5, p.dark)
    fillRect(px, 23, 21, 2, 5, p.dark)
  }
  if (id.includes('razor') || id.includes('fin')) {
    fillRect(px, 21, 9, 5, 2, p.light)
    fillRect(px, 22, 12, 4, 2, p.glow)
    fillRect(px, 8, 11, 3, 2, p.light)
  }
  if (id.includes('shard') || id.includes('iron')) {
    set(px, 10, 11, C.cyan); set(px, 11, 11, C.cyan)
    set(px, 20, 15, C.cyan); set(px, 21, 15, C.cyan)
    fillRect(px, 14, 12, 4, 1, C.cream)
  }
  if (id.includes('blitz') || id.includes('acid') || id.includes('venom')) {
    fillRect(px, 13, 17, 6, 3, p.dark)
    fillRect(px, 14, 18, 4, 1, C.cream)
  }
  if (id.includes('wraith') || id.includes('phantom')) {
    fillRect(px, 5, 14, 3, 1, p.light)
    fillRect(px, 24, 15, 3, 1, p.light)
  }
  if (id.includes('radar')) {
    fillRect(px, 15, 3, 2, 3, p.glow)
  }
}

const MONSTERS = [
  { id: 'dashling', arch: 'Sprinter', strain: 'Alpha', stage: 0 },
  { id: 'riptor', arch: 'Sprinter', strain: 'Alpha', stage: 1 },
  { id: 'apexbolt', arch: 'Sprinter', strain: 'Alpha', stage: 2 },
  { id: 'skitter', arch: 'Sprinter', strain: 'Beta', stage: 0 },
  { id: 'razorfin', arch: 'Sprinter', strain: 'Beta', stage: 1 },
  { id: 'blitzmaw', arch: 'Sprinter', strain: 'Beta', stage: 2 },
  { id: 'hulker', arch: 'Tank', strain: 'Gamma', stage: 0 },
  { id: 'bastion', arch: 'Tank', strain: 'Gamma', stage: 1 },
  { id: 'colossus', arch: 'Tank', strain: 'Gamma', stage: 2 },
  { id: 'shardback', arch: 'Tank', strain: 'Delta', stage: 0 },
  { id: 'ironshell', arch: 'Tank', strain: 'Delta', stage: 1 },
  { id: 'sporeling', arch: 'Toxic', strain: 'Alpha', stage: 0 },
  { id: 'venomaw', arch: 'Toxic', strain: 'Alpha', stage: 1 },
  { id: 'plaguelord', arch: 'Toxic', strain: 'Alpha', stage: 2 },
  { id: 'sludgekit', arch: 'Toxic', strain: 'Omega', stage: 0 },
  { id: 'acidmaw', arch: 'Toxic', strain: 'Omega', stage: 1 },
  { id: 'shadekit', arch: 'Camouflage', strain: 'Beta', stage: 0 },
  { id: 'mimicrawl', arch: 'Camouflage', strain: 'Beta', stage: 1 },
  { id: 'phantomveil', arch: 'Camouflage', strain: 'Beta', stage: 2 },
  { id: 'glimmer', arch: 'Camouflage', strain: 'Gamma', stage: 0 },
  { id: 'wraith', arch: 'Camouflage', strain: 'Gamma', stage: 1 },
  { id: 'watcher', arch: 'Sentinel', strain: 'Delta', stage: 0 },
  { id: 'turretkin', arch: 'Sentinel', strain: 'Delta', stage: 1 },
  { id: 'overwatch', arch: 'Sentinel', strain: 'Delta', stage: 2 },
  { id: 'radarling', arch: 'Sentinel', strain: 'Alpha', stage: 0 },
  { id: 'sentry', arch: 'Sentinel', strain: 'Alpha', stage: 1 },
]

function genMonster(m) {
  const px = canvas()
  const p = STRAIN[m.strain]
  ARCH_DRAW[m.arch](px, p, m.stage)
  accent(px, m.id, p)
  outline(px)
  writeSprite('monsters', m.id, px)
}

function genWeapon(id, type) {
  const px = canvas()
  if (type === 'Pistol') {
    fillRect(px, 7, 13, 15, 6, C.steel)
    fillRect(px, 8, 14, 13, 4, C.steelDk)
    fillRect(px, 20, 11, 7, 5, C.steel)
    fillRect(px, 22, 12, 4, 3, C.cyan)
    fillRect(px, 10, 19, 5, 7, C.bone)
    fillRect(px, 12, 15, 3, 3, C.vein)
  } else if (type === 'SMG') {
    fillRect(px, 5, 12, 20, 6, C.steel)
    fillRect(px, 6, 13, 18, 4, C.steelDk)
    fillRect(px, 8, 18, 4, 8, C.bone)
    fillRect(px, 12, 18, 10, 3, C.vein)
    fillRect(px, 22, 10, 5, 4, C.steel)
    for (let i = 0; i < 4; i++) fillRect(px, 10 + i * 3, 14, 2, 2, C.vein)
  } else if (type === 'Shotgun') {
    fillRect(px, 4, 13, 22, 7, C.bone)
    fillRect(px, 6, 14, 18, 5, C.steelDk)
    fillRect(px, 8, 20, 6, 6, C.bone)
    fillRect(px, 22, 11, 6, 5, C.steel)
    fillRect(px, 12, 15, 4, 3, C.vein)
  } else if (type === 'Rifle') {
    fillRect(px, 2, 13, 26, 5, C.bone)
    fillRect(px, 4, 14, 22, 3, C.steelDk)
    fillRect(px, 10, 18, 5, 7, C.bone)
    fillRect(px, 18, 11, 4, 4, C.vein)
    if (id === 'hydra-rifle') {
      fillRect(px, 7, 9, 3, 4, C.vein)
      fillRect(px, 12, 9, 3, 4, C.vein)
      fillRect(px, 17, 9, 3, 4, C.purple)
      fillRect(px, 22, 9, 3, 4, C.toxic)
    } else {
      fillRect(px, 24, 12, 5, 3, C.steel)
      fillRect(px, 26, 13, 2, 1, C.cyan)
    }
  } else if (type === 'Grenade') {
    fillCircle(px, 16, 17, 8, C.toxic)
    fillCircle(px, 16, 16, 6, hex('#1a9030'))
    fillCircle(px, 14, 14, 2, hex('#7dff9a'))
    fillRect(px, 14, 7, 4, 4, C.steel)
    fillRect(px, 15, 5, 2, 3, C.steelDk)
    set(px, 11, 12, C.toxic); set(px, 21, 19, C.toxic); set(px, 13, 22, C.toxic)
  }
  outline(px)
  writeSprite('weapons', id, px)
}

function genArmor(id, slot, arch) {
  const px = canvas()
  const p = {
    Sprinter: STRAIN.Alpha, Tank: STRAIN.Gamma, Toxic: STRAIN.Omega,
    Camouflage: STRAIN.Beta, Sentinel: STRAIN.Delta,
  }[arch]

  if (slot === 'head') {
    if (id === 'gas-mask') {
      fillRect(px, 9, 9, 14, 14, p.dark)
      fillRect(px, 11, 11, 10, 8, p.mid)
      fillRect(px, 11, 13, 4, 4, p.glow)
      fillRect(px, 17, 13, 4, 4, p.glow)
      fillRect(px, 13, 18, 6, 6, C.steel)
      fillRect(px, 15, 21, 2, 4, p.main)
    } else {
      fillRect(px, 9, 7, 14, 12, p.main)
      fillRect(px, 11, 9, 10, 5, p.light)
      fillRect(px, 12, 14, 3, 3, C.void)
      fillRect(px, 17, 14, 3, 3, C.void)
      fillRect(px, 10, 18, 12, 4, p.dark)
      fillRect(px, 14, 5, 4, 3, p.glow)
    }
  } else if (slot === 'chest') {
    fillRect(px, 7, 7, 18, 18, p.main)
    fillRect(px, 9, 9, 14, 14, p.dark)
    fillRect(px, 11, 11, 10, 4, p.light)
    if (id === 'veil-shroud') {
      for (let y = 15; y < 23; y += 2)
        for (let x = 10; x < 22; x += 2) set(px, x, y, p.glow)
    } else {
      fillRect(px, 13, 16, 6, 7, C.bone)
      fillRect(px, 14, 17, 4, 2, p.glow)
    }
  } else if (slot === 'arms') {
    fillRect(px, 4, 9, 10, 14, p.main)
    fillRect(px, 18, 9, 10, 14, p.main)
    fillRect(px, 6, 11, 6, 10, p.dark)
    fillRect(px, 20, 11, 6, 10, p.dark)
    if (id === 'radar-bracers') {
      fillCircle(px, 9, 14, 3, p.glow)
      fillCircle(px, 23, 14, 3, p.glow)
      set(px, 9, 14, C.cream); set(px, 23, 14, C.cream)
    } else {
      fillRect(px, 6, 18, 6, 3, C.toxic)
      fillRect(px, 20, 18, 6, 3, C.toxic)
    }
  } else if (slot === 'legs') {
    fillRect(px, 8, 6, 6, 18, p.main)
    fillRect(px, 18, 6, 6, 18, p.main)
    fillRect(px, 9, 8, 4, 12, p.dark)
    fillRect(px, 19, 8, 4, 12, p.dark)
    fillRect(px, 7, 22, 8, 4, p.light)
    fillRect(px, 17, 22, 8, 4, p.light)
    if (id === 'colossus-treads') {
      fillRect(px, 6, 25, 10, 4, C.steel)
      fillRect(px, 16, 25, 10, 4, C.steel)
    }
  }
  outline(px)
  writeSprite('armor', id, px)
}

function genAccessory(id) {
  const px = canvas()
  if (id === 'stamina-charm') {
    fillRect(px, 15, 4, 2, 10, C.steel)
    fillCircle(px, 16, 20, 7, STRAIN.Alpha.main)
    fillCircle(px, 16, 20, 4, STRAIN.Alpha.glow)
    fillCircle(px, 16, 20, 2, C.cream)
  } else if (id === 'toxin-filter') {
    fillRect(px, 9, 11, 14, 12, STRAIN.Omega.dark)
    fillRect(px, 11, 13, 10, 8, STRAIN.Omega.main)
    for (let i = 0; i < 4; i++) fillRect(px, 12 + i * 2, 15, 1, 4, STRAIN.Omega.glow)
    fillRect(px, 13, 6, 6, 5, C.steel)
  } else if (id === 'optic-veil') {
    fillCircle(px, 16, 16, 9, STRAIN.Beta.dark)
    fillCircle(px, 16, 16, 6, STRAIN.Beta.main)
    fillCircle(px, 16, 16, 3, C.cyan)
    fillRect(px, 6, 15, 4, 2, STRAIN.Beta.light)
    fillRect(px, 22, 15, 4, 2, STRAIN.Beta.light)
  } else if (id === 'early-warning') {
    fillCircle(px, 16, 17, 8, hex('#a86840'))
    fillCircle(px, 16, 17, 5, STRAIN.Delta.main)
    fillCircle(px, 16, 17, 2, STRAIN.Delta.glow)
    fillRect(px, 15, 5, 2, 6, C.steel)
    fillRect(px, 14, 4, 4, 2, STRAIN.Delta.glow)
  } else if (id === 'adrenaline-core') {
    fillCircle(px, 16, 16, 9, STRAIN.Alpha.dark)
    fillCircle(px, 16, 16, 6, STRAIN.Alpha.main)
    fillRect(px, 14, 11, 4, 10, STRAIN.Alpha.glow)
    fillRect(px, 11, 14, 10, 3, STRAIN.Alpha.light)
  } else if (id === 'osseous-plate') {
    fillRect(px, 7, 9, 18, 16, C.bone)
    fillRect(px, 9, 11, 14, 12, hex('#9eae96'))
    fillRect(px, 11, 13, 10, 3, STRAIN.Gamma.main)
    fillRect(px, 13, 18, 6, 5, STRAIN.Gamma.glow)
  }
  outline(px)
  writeSprite('accessories', id, px)
}

let count = 0
for (const m of MONSTERS) { genMonster(m); count++ }
for (const [id, type] of [
  ['pulse-pistol', 'Pistol'], ['vein-smg', 'SMG'], ['rib-shotgun', 'Shotgun'],
  ['longbone-rifle', 'Rifle'], ['spore-grenade', 'Grenade'], ['hydra-rifle', 'Rifle'],
]) { genWeapon(id, type); count++ }
for (const [id, slot, arch] of [
  ['sprint-hood', 'head', 'Sprinter'], ['bastion-plate', 'chest', 'Tank'],
  ['gas-mask', 'head', 'Toxic'], ['veil-shroud', 'chest', 'Camouflage'],
  ['radar-bracers', 'arms', 'Sentinel'], ['stride-greaves', 'legs', 'Sprinter'],
  ['colossus-treads', 'legs', 'Tank'], ['acid-gauntlets', 'arms', 'Toxic'],
]) { genArmor(id, slot, arch); count++ }
for (const id of [
  'stamina-charm', 'toxin-filter', 'optic-veil',
  'early-warning', 'adrenaline-core', 'osseous-plate',
]) { genAccessory(id); count++ }

console.log(`Generated ${count} sprites → public/assets/sprites/`)
