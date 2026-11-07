import type { PointerInput } from '../types'
import { clamp, n1, smooth } from './math'

interface Breath {
  plan: number[]
  R: number
  spawned: number
  tau: number
  x: number
  y: number
}

export interface Drip {
  a: number
  age: number
  B: Breath | null
  dead: boolean
  el: number
  phi: number
  px: number
  py: number
  r: number
  rT: number
  seed: number
  st: number
  vy: number
  x: number
  y: number
}

export const MAX_CAPS = 16
export const MAX_DRIPS = 12
export const CAP_FLOATS = 7

export const createBreath = (w: number, h: number) => {
  const P = {
    x: 0,
    y: 0,
    has: false,
    ax: 0,
    ay: 0,
    still: 0,
    lastEv: 0,
    v: 9999,
    pending: [] as number[],
  }
  let B: Breath | null = null
  let drips: Drip[] = []
  let exitSpawns: { done: boolean; t: number }[] = []
  let exiting = false
  const caps: number[] = []
  const breathU = new Float32Array(4)
  const fogU = new Float32Array(4)

  const spawnDrip = (
    x: number,
    y: number,
    r: number,
    st: number,
    br: Breath | null,
    phi: number,
  ) => {
    if (drips.length >= MAX_DRIPS) return
    drips.push({
      x,
      y,
      px: x,
      py: y,
      r: st === 0 ? 1.5 : r,
      rT: r,
      st,
      age: 0,
      vy: 0,
      el: 0,
      a: 1,
      seed: Math.random() * 100,
      B: br,
      phi,
      dead: false,
    })
  }

  const pointer = ({ kind, x, y, now }: PointerInput) => {
    if (kind === 'leave') {
      P.has = false
      B = null
      return
    }
    if (kind !== 'move' || exiting) return
    if (P.has) {
      const dist = Math.hypot(x - P.x, y - P.y)
      const dtE = (now - P.lastEv) / 1000
      const speed = dist / Math.max(dtE, 0.004)
      if (dtE > 0.12) P.v = 9999
      else if (dtE > 0) P.v = P.v > 5000 ? speed : P.v * 0.55 + speed * 0.45
      if (P.v < 240 && dist > 0.2) P.pending.push(P.x, P.y, x, y, P.v)
    }
    P.x = x
    P.y = y
    P.lastEv = now
    if (!P.has) {
      P.has = true
      P.ax = P.x
      P.ay = P.y
    }
    if (Math.hypot(P.x - P.ax, P.y - P.ay) > 3) {
      P.ax = P.x
      P.ay = P.y
      P.still = 0
      B = null
    }
  }

  const step = (dt: number, exitT: number, thawR: number) => {
    caps.length = 0
    const egg = exitT < 0
    for (let i = 0; egg && i < P.pending.length; i += 5) {
      const v = P.pending[i + 4]
      const k = 1 - smooth(140, 240, v)
      if (k > 0.05 && caps.length < 6 * CAP_FLOATS)
        caps.push(
          P.pending[i],
          P.pending[i + 1],
          P.pending[i + 2],
          P.pending[i + 3],
          10 + 6 * (1 - Math.min(1, v / 240)),
          k,
          0.62,
        )
    }
    P.pending.length = 0
    breathU.fill(0)
    fogU.fill(0)
    if (egg && P.has && dt > 0) P.still += dt
    if (egg && P.has && P.still > 0.3 && !B) {
      const n = 1 + Math.floor(Math.random() * 3)
      B = {
        x: P.x,
        y: P.y,
        tau: 0,
        R: 0,
        plan: [46, 74, 98].slice(0, n),
        spawned: 0,
      }
    }
    if (B) {
      B.tau += dt
      const tt = B.tau
      B.R = tt < 0.25 ? 0 : 12 + 98 * (1 - Math.exp(-(tt - 0.25) / 1.7))
      breathU.set([B.x, B.y, B.R, tt > 0.25 ? 1 : 0])
      const ph = tt % 3.6
      const first = Math.floor(tt / 3.6) === 0
      if (ph < 0.32)
        fogU.set([
          B.x,
          B.y,
          (first ? 105 : 125) + B.R * 0.25,
          (first ? 1 : 0.3) * smooth(0, 0.26, ph),
        ])
      while (B.spawned < B.plan.length && B.R > B.plan[B.spawned]) {
        const phi = Math.PI / 2 + (Math.random() - 0.5) * 1.2
        spawnDrip(
          B.x + Math.cos(phi) * B.R * 0.86,
          B.y + Math.sin(phi) * B.R * 0.86,
          5.2 + Math.random() * 2.4,
          0,
          B,
          phi,
        )
        B.spawned++
      }
    }
    for (const s of exitSpawns)
      if (!s.done && exitT >= s.t) {
        s.done = true
        const R = thawR * 0.75
        const a = Math.random() * Math.PI * 2
        const rr = Math.sqrt(Math.random()) * R
        spawnDrip(
          clamp(w / 2 + Math.cos(a) * rr, 20, w - 20),
          clamp(h / 2 + Math.sin(a) * rr * 0.8, 20, h - 120),
          3.6 + Math.random() * 2.4,
          1,
          null,
          0,
        )
      }
    for (const d of drips) {
      d.age += dt
      if (d.st === 0 && d.B) {
        const R = d.B.R
        d.x = d.B.x + Math.cos(d.phi) * R * 0.86
        d.y = d.B.y + Math.sin(d.phi) * R * 0.86
        d.r = 1.5 + (d.rT - 1.5) * smooth(0, 1.1, d.age)
        if (d.age > 1.35) {
          d.st = 1
          d.px = d.x
          d.py = d.y
        }
      } else if (d.st === 1) {
        const stick = 0.12 + 0.88 * smooth(0.3, 0.6, n1(d.y * 0.028 + d.seed))
        const vt = (30 + 26 * (d.r - 3)) * stick
        d.vy += (vt - d.vy) * Math.min(1, dt * 5)
        const dy = d.vy * dt
        d.px = d.x
        d.py = d.y
        d.y += dy
        d.x += (n1(d.y * 0.05 + d.seed * 3) - 0.5) * dy * 0.35
        d.r -= dy * 0.0028
        d.el = Math.min(1.4, d.vy / 55)
        if (caps.length < MAX_CAPS * CAP_FLOATS)
          caps.push(d.px, d.py, d.x, d.y, d.r * 0.66, 1, 0.75)
        if (d.r < 2.4) d.st = 2
        if (d.y > h + 12) d.dead = true
      } else {
        d.el *= Math.exp(-dt * 3)
        d.r -= dt * 0.22
        if (d.r < 0.5) d.dead = true
      }
    }
    drips = drips.filter((d) => !d.dead)
  }

  return {
    breathU,
    caps,
    fogU,
    pointer,
    step,
    get drips() {
      return drips
    },
    ptr: P,
    exit: () => {
      exiting = true
      B = null
      exitSpawns = Array.from({ length: 7 }, () => ({
        t: 0.5 + Math.random() * 1.6,
        done: false,
      }))
    },
  }
}
