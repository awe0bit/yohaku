import { cl, rnd } from './math'

export const NRING = 8
export const MAX_IMP = 24
export const RING_LIFE = 3.5

export type Impulse = [sx: number, sy: number, r: number, a: number]

interface Ring {
  a: number
  t0: number
  x: number
  z: number
}

interface Gust {
  k: number
  t0: number
  x: number
  z: number
}

export interface Pond {
  breeze: number
  gust: number
  gustAt: Gust | null
  imp: Impulse[]
  out: boolean
  rings: Ring[]
  sched: { at: number; fn: () => void }[]
  simUntil: number
  time: number
  yW: number
}

export const createPond = (yW: number): Pond => ({
  time: 0,
  yW,
  breeze: 0,
  out: false,
  imp: [],
  sched: [],
  rings: [],
  gust: rnd(14, 22),
  gustAt: null,
  simUntil: 0,
})

export const impulse = (
  p: Pond,
  sx: number,
  sy: number,
  r: number,
  a: number,
) => {
  if (p.imp.length >= MAX_IMP) return
  p.imp.push([sx, sy, r, a])
  p.simUntil = Math.max(p.simUntil, p.time + 2.5 + 4 * cl(Math.abs(a) / 1.5))
}

export const later = (p: Pond, dt: number, fn: () => void) => {
  p.sched.push({ at: p.time + dt, fn })
}

export const ring = (p: Pond, x: number, z: number, a: number) => {
  if (p.rings.length >= NRING) p.rings.shift()
  p.rings.push({ x, z, t0: p.time, a })
}

export const runDue = (p: Pond) => {
  for (let i = p.sched.length - 1; i >= 0; i--) {
    if (p.sched[i].at > p.time) continue
    const { fn } = p.sched[i]
    p.sched.splice(i, 1)
    fn()
  }
}

export const breezeTouches = (p: Pond, dt: number, w: number, PL: number) => {
  const b = p.breeze
  if (b <= 0 || p.out) return
  if (Math.random() < dt * b)
    ring(
      p,
      rnd(0, w),
      rnd(0.15, 1) * PL,
      rnd(0.006, 0.014) * (Math.random() < 0.5 ? -1 : 1) * b,
    )
  if ((p.gust -= dt) <= 0) {
    p.gust = rnd(21, 39)
    p.gustAt = {
      x: rnd(0.1, 0.7) * w,
      z: rnd(0.25, 0.8) * PL,
      t0: p.time,
      k: b,
    }
  }
}
