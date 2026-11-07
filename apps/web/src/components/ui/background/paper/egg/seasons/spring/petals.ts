import type { ElemType } from '~/lib/paper/season'

import type { ElementPlacement } from '../../../layout'
import type { Drop, RainState } from './drops'
import { clamp, rnd, TAU } from './math'
import { NF } from './shaders'

export interface Lift {
  a: number
  r: number
  x: number
  y: number
}

export interface Floater {
  a: number
  aMax: number
  born: number
  cell: number
  drop: Drop | null
  lift: Lift | null
  ox: number
  oy: number
  rot: number
  soak: number
  spin: number
  under: number
  x: number
  y: number
}

export type PaintCell = (
  cell: number,
  type: ElemType,
  colorIndex: number,
  size: number,
  seed: number,
  flip: boolean,
) => void

interface PetalsInput {
  dark: boolean
  elements: ElementPlacement[]
  elemVisibility: () => number
  h: number
  land: (x: number, y: number, r: number, o: Partial<Drop>) => Drop
  paint: PaintCell
  randomSpot: () => [number, number]
  state: RainState
  w: number
}

const MAX_AFLOAT = 5

export const createPetals = (input: PetalsInput) => {
  const { state: S, w, h, dark, paint } = input
  const pressed = input.elements
    .filter(
      (e) =>
        e.type !== 'snow' &&
        e.x > -20 &&
        e.x < w + 20 &&
        e.y > -20 &&
        e.y < h + 20,
    )
    .map((e) => ({ ...e, lifted: false }))

  const weights = new Map<ElemType, number>()
  for (const e of pressed)
    weights.set(e.type, (weights.get(e.type) ?? 0) + 1 / e.size)
  let blowType: ElemType = 'petal'
  let blowWeight = 0
  for (const [type, weight] of weights)
    if (weight > blowWeight) {
      blowType = type
      blowWeight = weight
    }

  const freeCell = () => {
    if (S.lifts.length >= NF) return -1
    const i = S.cells.indexOf(false)
    if (i >= 0) S.cells[i] = true
    return i
  }

  const afloat = () => S.floaters.filter((f) => f.drop).length

  const lift = (e: (typeof pressed)[number], d: Drop) => {
    const cell = freeCell()
    if (cell < 0) return
    e.lifted = true
    paint(cell, e.type, e.colorIndex, e.size, e.seed, e.flip)
    const hole = { x: e.x, y: e.y, r: e.size * 0.8 + 9, a: 0 }
    S.lifts.push(hole)
    S.floaters.push({
      cell,
      drop: d,
      x: e.x,
      y: e.y,
      ox: clamp(e.x - d.x, -d.r * 0.5, d.r * 0.5),
      oy: clamp(e.y - d.y, -d.r * 0.5, d.r * 0.5),
      rot: e.rotation,
      spin: rnd(-0.25, 0.25),
      a: 0,
      aMax: e.alpha,
      soak: 0,
      under: 0,
      born: S.t,
      lift: hole,
    })
  }

  const blow = () => {
    if (afloat() >= MAX_AFLOAT) return
    const cell = freeCell()
    if (cell < 0) return
    const [x, y] = input.randomSpot()
    const d = input.land(x, Math.min(y, h * 0.72), rnd(17, 21), { pin: 45 })
    paint(
      cell,
      blowType,
      Math.random(),
      rnd(11, 15),
      Math.floor(rnd(0, 1e6)),
      Math.random() < 0.5,
    )
    S.floaters.push({
      cell,
      drop: d,
      x,
      y,
      ox: rnd(-2, 2),
      oy: rnd(-2, 2),
      rot: rnd(0, TAU),
      spin: rnd(-0.3, 0.3),
      a: 0,
      aMax: 0.95,
      soak: 0.6,
      under: 0,
      born: S.t,
      lift: null,
    })
  }

  const ride = (f: Floater, d: Drop, dt: number) => {
    const lim = Math.max(1, d.r * 0.42)
    const ol = Math.hypot(f.ox, f.oy)
    if (ol > lim) {
      f.ox *= lim / ol
      f.oy *= lim / ol
    }
    const drift = Math.exp(-dt * 0.35)
    f.ox *= drift
    f.oy *= drift
    const sp = Math.hypot(d.vx, d.vy)
    const tx = d.x + f.ox - (sp > 1 ? (d.vx / sp) * d.r * 0.25 : 0)
    const ty = d.y + f.oy - (sp > 1 ? (d.vy / sp) * d.r * 0.25 : 0)
    const k = Math.min(1, dt * 7)
    f.x += (tx - f.x) * k
    f.y += (ty - f.y) * k
    f.rot += (f.spin * Math.sin((S.t - f.born) * 0.6) + d.vx * 0.004) * dt
    f.soak = Math.min(1, f.soak + dt / 1.2)
    f.under = 0
  }

  const step = (dt: number) => {
    if (!S.exiting && input.elemVisibility() > 0.6)
      for (const d of S.drops) {
        if (d.age < 0.15 || d.r < 6 || afloat() >= MAX_AFLOAT) continue
        for (const e of pressed) {
          if (e.lifted) continue
          const dx = e.x - d.x
          const dy = e.y - d.y
          const rr = d.r * 0.85 + e.size * 0.25
          if (dx * dx + dy * dy < rr * rr) {
            lift(e, d)
            break
          }
        }
      }
    for (const f of S.floaters) {
      if (f.drop?.dead) f.drop = null
      if (S.exiting) f.a = Math.max(0, f.a - dt / 2.2)
      else {
        if (f.drop) ride(f, f.drop, dt)
        else {
          f.soak = Math.max(0, f.soak - dt / 5)
          if (f.soak < 0.35) f.under = 1
        }
        const flat = f.aMax * (dark ? 0.4 : 0.44)
        const target = f.drop
          ? f.aMax * (0.5 + 0.38 * f.soak)
          : flat * (1 + 0.6 * f.soak)
        f.a += (target - f.a) * Math.min(1, dt * (f.a < flat ? 5 : 1.5))
        if (f.lift) f.lift.a = Math.min(1, f.lift.a + dt / 0.25)
      }
      if (f.x < -40 || f.x > w + 40 || f.y > h + 40) f.a = 0
    }
    S.floaters = S.floaters.filter((f) => {
      const keep = f.a > 0.001 || (!S.exiting && S.t - f.born < 0.5)
      if (!keep) S.cells[f.cell] = false
      return keep
    })
    if (S.exiting) {
      for (const l of S.lifts) l.a = Math.max(0, l.a - dt / 2.2)
      S.lifts = S.lifts.filter((l) => l.a > 0)
    }
  }

  return { pressed, blow, step }
}
