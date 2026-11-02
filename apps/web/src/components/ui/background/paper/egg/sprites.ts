import type { ElementPlacement } from '../layout'
import type { Drop, Fluid } from './fluid'
import { dropVelocity, sampleField } from './fluid'
import type { SpriteType } from './reactions'
import {
  colorsOf,
  familyOf,
  keepsParentColor,
  LOOSE,
  nextStage,
  PETAL_OF,
} from './reactions'
import type { SpriteArt } from './sprite-art'
import { makeSpriteArt } from './sprite-art'

const SINK_MS = 4800
const ease = (t: number) => {
  const c = Math.min(1, Math.max(0, t))
  return c * c * (3 - 2 * c)
}
export const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const pick = <T>(list: T[]) => list[Math.floor(Math.random() * list.length)]

export interface Fall {
  dur: number
  ph: number
  spin: number
  sway: number
  t0: number
  x: number
  y: number
}

export interface Sprite {
  alpha: number
  art: SpriteArt
  born: number
  color: string
  fall: Fall | null
  flip: number
  flipPh: number
  flipV: number
  glow: number
  h: number
  home: boolean
  hrot: number
  hue: number
  hueTo: number
  hx: number
  hy: number
  lastShed: number
  lastSplit: number
  melt: number
  oldArt: SpriteArt | null
  rot: number
  seed: number
  shed: number
  sinkAfter: number
  sinkT: number
  size: number
  splits: number
  swapT: number
  type: SpriteType
  vr: number
  vx: number
  vy: number
  x: number
  y: number
}

export interface Ripple {
  alpha: number
  ecc: number
  life: number
  R: number
  rings: { delay: number; gain: number }[]
  t0: number
  tilt: number
  x: number
  y: number
}

export interface Firefly {
  life: number
  ph: number
  seed: number
  vx: number
  vy: number
  x: number
  y: number
}

export interface Pointer {
  stillAt: number
  x: number
  y: number
}

export interface SpriteWorld {
  dark: boolean
  dpr: number
  dust: {
    c: string
    t0: number
    vx: number
    vy: number
    x: number
    y: number
  }[]
  fireflies: Firefly[]
  h: number
  nextFallAt: number
  placements: ElementPlacement[]
  pointer: Pointer | null
  ripples: Ripple[]
  sprites: Sprite[]
  w: number
}

export const createSpriteWorld = (): SpriteWorld => ({
  sprites: [],
  ripples: [],
  dust: [],
  fireflies: [],
  placements: [],
  pointer: null,
  nextFallAt: 0,
  dark: false,
  dpr: 1,
  w: 0,
  h: 0,
})

export const clearSpriteWorld = (world: SpriteWorld) => {
  world.sprites.length = 0
  world.ripples.length = 0
  world.dust.length = 0
  world.fireflies.length = 0
  world.nextFallAt = 0
}

interface SpriteSeed {
  alpha: number
  color: string
  flip: boolean
  rot: number
  seed: number
  size: number
  type: SpriteType
  x: number
  y: number
}

export const makeSprite = (
  world: SpriteWorld,
  o: SpriteSeed,
  loose = false,
): Sprite => ({
  type: o.type,
  color: o.color,
  size: o.size,
  seed: o.seed,
  art: makeSpriteArt(o.type, o.color, o.size, o.seed, world.dpr, world.dark),
  hx: o.x,
  hy: o.y,
  x: o.x,
  y: o.y,
  vx: 0,
  vy: 0,
  rot: o.rot,
  hrot: o.rot,
  vr: 0,
  flip: o.flip ? -1 : 1,
  flipPh: 0,
  flipV: 0,
  alpha: o.alpha,
  hue: 0,
  hueTo: 0,
  melt: 0,
  glow: 0,
  shed: 0,
  splits: 0,
  lastShed: 0,
  lastSplit: 0,
  oldArt: null,
  swapT: 1,
  home: !loose,
  born: performance.now(),
  fall: null,
  h: 0,
  sinkAfter: Number.POSITIVE_INFINITY,
  sinkT: 0,
})

export const liftSprites = (world: SpriteWorld) => {
  clearSpriteWorld(world)
  for (const p of world.placements) {
    const colors = colorsOf(p.type)
    world.sprites.push(
      makeSprite(world, {
        type: p.type,
        color: colors[Math.floor(p.colorIndex * colors.length)],
        size: p.size,
        seed: p.seed,
        x: p.x,
        y: p.y,
        rot: p.rotation,
        flip: p.flip,
        alpha: p.alpha,
      }),
    )
  }
}

const recolor = (world: SpriteWorld, s: Sprite, type: SpriteType) => {
  s.oldArt = s.art
  s.type = type
  s.color = pick(colorsOf(type))
  s.art = makeSpriteArt(type, s.color, s.size, s.seed, world.dpr, world.dark)
  s.swapT = 0
}

const spawnLoose = (
  world: SpriteWorld,
  parent: Sprite,
  type: SpriteType,
  color: string,
  size: number,
) => {
  const s = makeSprite(
    world,
    {
      type,
      color,
      size,
      seed: Math.floor(Math.random() * 1e9),
      x: parent.x,
      y: parent.y,
      rot: Math.random() * Math.PI * 2,
      flip: Math.random() < 0.5,
      alpha: parent.alpha,
    },
    true,
  )
  s.vx = parent.vx + (Math.random() - 0.5) * 80
  s.vy = parent.vy + (Math.random() - 0.5) * 80
  s.vr = (Math.random() - 0.5) * 4
  s.splits = 3
  s.shed = 5
  world.sprites.push(s)
}

const nearest = (
  world: SpriteWorld,
  x: number,
  y: number,
  pred: (s: Sprite) => boolean,
  radius: number,
) => {
  let best: Sprite | null = null
  let bd = radius
  for (const s of world.sprites) {
    if (!pred(s)) continue
    const d = Math.hypot(s.x - x, s.y - y)
    if (d < bd) {
      bd = d
      best = s
    }
  }
  return best
}

export const clickSprites = (world: SpriteWorld, x: number, y: number) => {
  const aj = nearest(world, x, y, (s) => familyOf(s.type) === 'ajisai', 60)
  if (aj) {
    for (const s of world.sprites)
      if (
        familyOf(s.type) === 'ajisai' &&
        Math.hypot(s.x - aj.x, s.y - aj.y) < 170
      )
        s.hueTo += 70
    return true
  }
  const leaf = nearest(world, x, y, (s) => nextStage(s.type) !== null, 50)
  if (leaf) {
    recolor(world, leaf, nextStage(leaf.type)!)
    leaf.flipV += 9
    return true
  }
  return false
}

const landFall = (
  world: SpriteWorld,
  s: Sprite,
  drops: Drop[],
  now: number,
) => {
  const f = s.fall!
  s.fall = null
  s.h = 0
  s.flipPh = 0
  s.vx = Math.cos(f.ph) * 14
  s.vy = Math.sin(f.ph) * 14
  drops.push({
    x: s.x,
    y: s.y,
    t0: now,
    q: (1600 + s.size * 60) * (0.6 + Math.random() * 0.8),
  })
  if (drops.length > 8) drops.shift()
  const rings: Ripple['rings'] = []
  const n = 1 + Math.floor(Math.random() * 3)
  for (let i = 0; i < n; i++)
    rings.push({
      delay: i === 0 ? 0 : rings[i - 1].delay + 0.12 + Math.random() * 0.25,
      gain: i === 0 ? 1 : 0.35 + Math.random() * 0.4,
    })
  world.ripples.push({
    x: s.x,
    y: s.y,
    t0: now,
    R: (10 + Math.random() * 18) * (0.7 + s.size / 60),
    life: 0.9 + Math.random() * 0.8,
    ecc: 0.85 + Math.random() * 0.15,
    tilt: Math.random() * Math.PI,
    alpha: 0.5 + Math.random() * 0.4,
    rings,
  })
  if (world.ripples.length > 16) world.ripples.shift()
}

const stepFalling = (
  world: SpriteWorld,
  s: Sprite,
  drops: Drop[],
  dt: number,
  now: number,
) => {
  const f = s.fall!
  const t = clamp01((now - f.t0) / 1000 / f.dur)
  const h = 1 - t
  s.x = f.x + Math.sin(t * 5.2 + f.ph) * f.sway * h
  s.y = f.y - 8 * h + Math.cos(t * 3.1 + f.ph) * 6 * h
  s.rot += f.spin * dt * (0.3 + h)
  s.flipPh = Math.sin(t * 7 + f.ph) * 1.2 * h
  s.h = h
  if (t >= 1) landFall(world, s, drops, now)
}

const stepReactions = (
  world: SpriteWorld,
  s: Sprite,
  speed: number,
  dt: number,
  now: number,
) => {
  const fam = familyOf(s.type)
  const petal = PETAL_OF[s.type]
  if (petal && speed > 520 && s.shed < 5 && now - s.lastShed > 160) {
    s.lastShed = now
    s.shed++
    spawnLoose(
      world,
      s,
      petal,
      keepsParentColor(s.type) ? s.color : pick(colorsOf(petal)),
      s.size * (s.type === 'lotus' ? 0.6 : 0.5),
    )
  }
  if (fam === 'osmanthus') {
    if (speed > 380 && s.splits < 3 && now - s.lastSplit > 300) {
      s.lastSplit = now
      s.splits++
      spawnLoose(world, s, 'osmanthus', s.color, s.size * 0.62)
    }
    if (speed > 160 && Math.random() < 0.5)
      world.dust.push({
        x: s.x,
        y: s.y,
        vx: s.vx * 0.3 + (Math.random() - 0.5) * 30,
        vy: s.vy * 0.3 + (Math.random() - 0.5) * 30,
        t0: now,
        c: s.color,
      })
  }
  const p = world.pointer
  if (fam === 'snow') {
    const near = p && Math.hypot(p.x - s.x, p.y - s.y) < 80
    s.melt = clamp01(s.melt + (near ? dt * 1.3 : -dt * 0.35))
  }
  if (fam === 'wintersweet') {
    const near = p && Math.hypot(p.x - s.x, p.y - s.y) < 110
    s.glow += ((near ? 1 : 0) - s.glow) * Math.min(1, dt * 3)
  }
}

const flock = (s: Sprite, loose: Sprite[], dt: number) => {
  for (const o of loose) {
    if (o === s) continue
    const dx = o.x - s.x
    const dy = o.y - s.y
    const d = Math.hypot(dx, dy)
    if (d < 60 && d > s.size * 0.7) {
      s.vx += (dx / d) * 66 * dt
      s.vy += (dy / d) * 66 * dt
    }
  }
}

const stepFloating = (
  world: SpriteWorld,
  s: Sprite,
  fluid: Fluid,
  drops: Drop[],
  loose: Sprite[],
  dt: number,
  now: number,
  settle: number,
) => {
  if (s.sinkT) {
    const k = clamp01((now - s.sinkT) / SINK_MS) * 0.05
    s.vx *= 1 - k
    s.vy *= 1 - k
  }
  const [dvx, dvy] = dropVelocity(drops, s.x, s.y, now)
  const wu = sampleField(fluid, fluid.U, s.x, s.y) + dvx
  const wv = sampleField(fluid, fluid.V, s.x, s.y) + dvy
  const speed = Math.hypot(wu, wv)
  const fam = familyOf(s.type)
  const isLoose = LOOSE.has(s.type)
  const drag = 1 - Math.exp(-dt * (isLoose ? 4 : 2.4))
  s.vx += (wu - s.vx) * drag
  s.vy += (wv - s.vy) * drag
  if (s.home) {
    s.vx += (s.hx - s.x) * 0.25 * dt
    s.vy += (s.hy - s.y) * 0.25 * dt
  }
  if (isLoose && speed < 120) flock(s, loose, dt)
  if (settle > 0) {
    const k = ease(settle)
    const pull = Math.min(1, k * 0.25 + dt * 3 * k)
    s.x += (s.hx - s.x) * pull
    s.y += (s.hy - s.y) * pull
    s.rot += (s.hrot - s.rot) * Math.min(1, dt * 4 * k)
    s.flipPh *= 1 - Math.min(1, dt * 5 * k)
  } else {
    s.x += s.vx * dt
    s.y += s.vy * dt
  }
  const curl =
    (sampleField(fluid, fluid.V, s.x + 20, s.y) -
      sampleField(fluid, fluid.V, s.x - 20, s.y) -
      sampleField(fluid, fluid.U, s.x, s.y + 20) +
      sampleField(fluid, fluid.U, s.x, s.y - 20)) /
    40
  s.vr += (curl * 0.9 - s.vr) * (1 - Math.exp(-dt * 2))
  if ((fam === 'lotus' || isLoose) && speed > 40) {
    const target = Math.atan2(wv, wu) + Math.PI / 2
    const tau = 2 * Math.PI
    const dA = ((((target - s.rot + Math.PI) % tau) + tau) % tau) - Math.PI
    s.vr += dA * Math.min(1, speed / 400) * dt * 2
  }
  if (settle === 0) s.rot += s.vr * dt
  if (
    (fam === 'maple' || fam === 'ginkgo' || isLoose) &&
    speed > 260 &&
    Math.abs(s.flipV) < 3
  )
    s.flipV += (speed / 260) * (Math.random() < 0.5 ? -1 : 1) * 4
  s.flipPh += s.flipV * dt
  s.flipV *= Math.exp(-dt * 1.6)
  if (Math.abs(s.flipV) < 0.6) {
    const rest = Math.round(s.flipPh / Math.PI) * Math.PI
    s.flipPh += (rest - s.flipPh) * Math.min(1, dt * 3)
  }
  if (settle === 0) stepReactions(world, s, speed, dt, now)
  s.hue += (s.hueTo - s.hue) * Math.min(1, dt * 2.2)
  s.swapT = Math.min(1, s.swapT + dt * 1.6)
}

export const stepSprites = (
  world: SpriteWorld,
  fluid: Fluid,
  drops: Drop[],
  dt: number,
  now: number,
  settle: number,
) => {
  const { sprites, w, h } = world
  for (let i = sprites.length - 1; i >= 0; i--)
    if (sprites[i].sinkT && now - sprites[i].sinkT > SINK_MS)
      sprites.splice(i, 1)
  const loose = sprites.filter((s) => LOOSE.has(s.type) && !s.fall)
  for (const s of sprites) {
    if (s.fall) stepFalling(world, s, drops, dt, now)
    else stepFloating(world, s, fluid, drops, loose, dt, now, settle)
  }
  for (let i = sprites.length - 1; i >= 0; i--) {
    const s = sprites[i]
    if (s.x < -80 || s.x > w + 80 || s.y < -80 || s.y > h + 80)
      sprites.splice(i, 1)
  }
}

export const sinkProgress = (s: Sprite, now: number) =>
  s.sinkT ? clamp01((now - s.sinkT) / SINK_MS) : 0
