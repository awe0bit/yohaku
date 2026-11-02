import type { SpriteType } from './reactions'
import {
  colorsOf,
  isFireflyTerm,
  keepsParentColor,
  PETAL_OF,
  pickSinking,
} from './reactions'
import type { SpriteWorld } from './sprites'
import { clamp01, makeSprite } from './sprites'

const pick = <T>(list: T[]) => list[Math.floor(Math.random() * list.length)]

const spawnFall = (world: SpriteWorld, now: number) => {
  if (!world.placements.length) return
  const o = pick(world.placements)
  const colors = colorsOf(o.type)
  let type: SpriteType = o.type
  let color = colors[Math.floor(o.colorIndex * colors.length)]
  let size = o.size
  const petal = PETAL_OF[o.type]
  if (petal && Math.random() < 0.65) {
    type = petal
    if (!keepsParentColor(o.type)) color = pick(colorsOf(petal))
    size = o.size * 0.55
  }
  const x = 60 + Math.random() * (world.w - 120)
  const y = 50 + Math.random() * (world.h - 150)
  const s = makeSprite(
    world,
    {
      type,
      color,
      size,
      seed: Math.floor(Math.random() * 1e9),
      x,
      y,
      rot: Math.random() * Math.PI * 2,
      flip: Math.random() < 0.5,
      alpha: o.alpha,
    },
    true,
  )
  s.fall = {
    t0: now,
    dur: 2.4 + Math.random() * 1.4,
    x,
    y,
    ph: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 3,
    sway: 26 + Math.random() * 22,
  }
  s.born = now
  s.sinkAfter = now + (35 + Math.random() * 30) * 1000
  world.sprites.push(s)
}

export const stepFalls = (world: SpriteWorld, now: number, active: boolean) => {
  if (!active) return
  if (now >= world.nextFallAt) {
    spawnFall(world, now)
    if (Math.random() < 0.25) spawnFall(world, now)
    world.nextFallAt = now + 2200 + Math.random() * 4200
  }
  const floaters = world.sprites.map((s) => ({
    s,
    born: s.born,
    sinkAfter: s.sinkAfter,
    home: s.home,
    falling: s.fall !== null,
    sinkT: s.sinkT,
  }))
  for (const { s } of pickSinking(floaters, now)) s.sinkT = now
}

export const stepFireflies = (
  world: SpriteWorld,
  dt: number,
  now: number,
  term: number,
) => {
  const p = world.pointer
  const still = p !== null && now - p.stillAt > 1100
  const { fireflies } = world
  if (
    isFireflyTerm(term) &&
    still &&
    fireflies.length < 9 &&
    Math.random() < dt * 3
  ) {
    const a = Math.random() * Math.PI * 2
    const r = 160 + Math.random() * 120
    fireflies.push({
      x: p.x + Math.cos(a) * r,
      y: p.y + Math.sin(a) * r,
      vx: 0,
      vy: 0,
      ph: Math.random() * Math.PI * 2,
      life: 0,
      seed: Math.random() * 100,
    })
  }
  for (let i = fireflies.length - 1; i >= 0; i--) {
    const f = fireflies[i]
    const tx = (p ? p.x : f.x) + Math.cos(now / 1300 + f.seed) * 46
    const ty = (p ? p.y : f.y) + Math.sin(now / 1100 + f.seed * 1.3) * 32
    const go = still ? 1 : -1
    f.vx += ((tx - f.x) * 0.6 * go + (Math.random() - 0.5) * 80) * dt
    f.vy += ((ty - f.y) * 0.6 * go + (Math.random() - 0.5) * 80) * dt
    f.vx *= Math.exp(-dt * 1.2)
    f.vy *= Math.exp(-dt * 1.2)
    f.x += f.vx * dt
    f.y += f.vy * dt
    f.life = clamp01(f.life + (still ? dt * 0.8 : -dt * 0.6))
    if (!still && f.life <= 0) fireflies.splice(i, 1)
  }
}
