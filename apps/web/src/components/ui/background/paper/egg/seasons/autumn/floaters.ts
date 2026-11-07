import { lerp } from '~/lib/paper/season'

import type { Pressed } from './atlas'
import type { Water } from './geometry'
import { cl, ease, ease5, rnd } from './math'
import type { Pond } from './pond'
import { impulse, later, ring } from './pond'

export interface Pose {
  a: number
  ang: number
  grow: number
  lift: number
  shad: number
  sq: number
  sub: number
  wet: number
  x: number
  y: number
}

type FloaterState =
  | 'home'
  | 'wait'
  | 'rising'
  | 'detach'
  | 'falling'
  | 'float'
  | 'return'
  | 'gone'

export interface Floater {
  ang: number
  e: Pressed
  from: Pose
  landS: number
  landX: number
  lx: number
  lz: number
  mask: number
  nextBob: number
  ph: number
  pose: Pose | null
  role: 'fall' | 'rise' | 'stay'
  spin: number
  state: FloaterState
  t0: number
  tFall: number
  vx: number
  vz: number
  y0: number
}

const FALL_AT = [7.5, 11.5, 17, 25]

const angTo = (a: number, b: number) =>
  a + (((((b - a) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI)) - Math.PI)

export const createFloaters = (els: Pressed[], yL: number, w: number) => {
  const fallers = els
    .filter((e) => e.y < yL - 40 && e.y > 70 && e.x > 20 && e.x < w - 20)
    .sort((a, b) => b.size - a.size)
  const picked: Pressed[] = []
  for (const e of fallers) {
    if (picked.length >= 4) break
    if (picked.some((p) => Math.abs(p.x - e.x) < 160)) continue
    picked.push(e)
  }
  const fl = els.map((e): Floater => ({
    e,
    state: 'home',
    role: e.y > yL - 6 ? 'rise' : 'stay',
    tFall: 0,
    t0: 0,
    lx: 0,
    lz: 0,
    vx: 0,
    vz: 0,
    ang: e.rotation,
    spin: 0,
    ph: rnd(0, 6.28),
    nextBob: rnd(6, 20),
    mask: 0,
    pose: null,
    from: {
      a: 0,
      ang: 0,
      grow: 0,
      lift: 0,
      shad: 0,
      sq: 1,
      sub: 0,
      wet: 0,
      x: 0,
      y: 0,
    },
    landS: 0,
    landX: 0,
    y0: 0,
  }))
  picked.forEach((e, k) => {
    fl[e.i].role = 'fall'
    fl[e.i].tFall = FALL_AT[k]
  })
  return fl
}

const startFloat = (
  L: Floater,
  pond: Pond,
  water: Water,
  w: number,
  x: number,
  y: number,
) => {
  const { Nx, Ny } = water
  L.state = 'float'
  L.lx = (x / w) * Nx
  L.lz = cl(water.sOf(y - (pond.yW - water.yL)), 0.02, 0.97) * Ny
  L.vx = rnd(-0.2, 0.2)
  L.vz = 0
  const amp = -0.12 - 0.5 * cl((L.e.size - 8) / 30)
  impulse(pond, L.lx / Nx, L.lz / Ny, 1.1, amp)
  later(pond, 0.45, () =>
    impulse(pond, L.lx / Nx, cl(L.lz / Ny), 0.9, amp * 0.4),
  )
}

export const updateFloaters = (
  fl: Floater[],
  pond: Pond,
  water: Water,
  dt: number,
  w: number,
  dark: boolean,
  vis: number,
) => {
  const T = pond.time
  const { out } = pond
  const { Nx, Ny, yL } = water
  const wetA = dark ? 0.82 : 0.92
  const sqF = (lz: number) => 0.42 + 0.4 * water.rnOf(cl(lz / Ny))
  for (const L of fl) {
    const { e } = L
    const pressedA = 0.42 * e.alpha * vis
    let P: Pose | null = null
    if (!out) {
      if (L.state === 'home' && L.role === 'rise' && pond.yW < e.y - 4) {
        L.state = 'wait'
        L.t0 = T + rnd(0.5, 2.8)
      }
      if (L.state === 'wait' && T >= L.t0) L.state = 'rising'
      if (
        L.state === 'home' &&
        L.role === 'fall' &&
        T >= L.tFall &&
        pond.yW <= yL + 2
      ) {
        L.state = 'detach'
        L.t0 = T
      }
    }
    if (L.state === 'rising') {
      const u = cl((T - L.t0) / 2.4)
      const k = ease(u)
      L.mask = cl(u / 0.25)
      P = {
        x: e.x + 3 * Math.sin(u * 3 + L.ph) * k,
        y: e.y + 1.5 * Math.sin(u * Math.PI),
        ang: e.rotation + 0.15 * Math.sin(u * 2.4 + L.ph) * k,
        sq: lerp(1, sqF(water.sOf(e.y - (pond.yW - yL)) * Ny), k),
        a: lerp(pressedA, wetA, ease(cl(u / 0.7))),
        lift: 0,
        sub: 1 - k,
        wet: ease(cl(u * 1.4)),
        shad: k,
        grow: 0.05 * Math.sin(u * Math.PI),
      }
      if (u >= 1) {
        L.ang = P.ang
        startFloat(L, pond, water, w, P.x, P.y)
      }
    } else if (L.state === 'detach') {
      const u = cl((T - L.t0) / 0.9)
      L.mask = ease(u)
      P = {
        x: e.x,
        y: e.y - 2 * Math.sin(u * Math.PI * 0.5),
        ang: e.rotation + 0.05 * Math.sin(u * Math.PI * 3),
        sq: 1,
        a: lerp(pressedA, wetA, ease(u)),
        lift: 0,
        sub: 0,
        wet: ease(u),
        shad: 0,
        grow: 0.07 * ease(u),
      }
      if (u >= 1) {
        L.state = 'falling'
        L.t0 = T
        L.landX = cl(e.x + rnd(-70, 70), 40, w - 40)
        L.landS = rnd(0.08, 0.42)
        L.y0 = P.y
      }
    } else if (L.state === 'falling') {
      const u = cl((T - L.t0) / 3.6)
      const landY = water.yOf(L.landS) + (pond.yW - yL)
      const flip = u * 7 + L.ph
      P = {
        x:
          lerp(e.x, L.landX, ease(u)) + 26 * Math.sin(u * 5.5 + L.ph) * (1 - u),
        y: landY,
        ang: e.rotation + Math.sin(u * 4 + L.ph) * 0.8 * (1 - u) + u * 0.6,
        sq: lerp(
          0.22 + 0.78 * Math.abs(Math.cos(flip)),
          sqF(L.landS * Ny),
          u ** 3,
        ),
        a: wetA,
        lift: (landY - L.y0) * (1 - u ** 1.25),
        sub: 0,
        wet: 1,
        shad: 1,
        grow: 0.07 * (1 - u),
      }
      if (u >= 1) {
        L.ang = P.ang
        L.mask = 1
        startFloat(L, pond, water, w, P.x, landY)
      }
    }
    if (L.state === 'float') {
      const wind = pond.breeze
      const kv = Math.min(1, dt * 0.5)
      L.vx += (0.3 * wind + Math.sin(T * 0.21 + L.ph) * 0.17 - L.vx) * kv
      L.vz += (0.05 * wind * Math.sin(T * 0.13 + L.ph) - L.vz) * kv
      L.spin *= Math.exp(-dt * 0.6)
      L.lx += L.vx * dt
      L.lz += L.vz * dt
      L.ang += L.spin * dt
      if (L.lx < 4) L.vx = Math.abs(L.vx)
      if (L.lx > Nx - 4) L.vx = -Math.abs(L.vx)
      L.lz = cl(L.lz, 0.02 * Ny, 0.97 * Ny)
      if (!out && (L.nextBob -= dt) <= 0) {
        L.nextBob = rnd(15, 30)
        ring(
          pond,
          (L.lx / Nx) * w,
          (L.lz / Ny) * water.PL,
          (0.004 + 0.008 * cl((e.size - 8) / 30)) * pond.breeze,
        )
      }
      P = {
        x: (L.lx / Nx) * w,
        y:
          water.yOf(cl(L.lz / Ny)) +
          (pond.yW - yL) +
          0.5 * Math.sin(T * 1.1 + L.ph),
        ang: L.ang + Math.sin(T * 0.7 + L.ph) * 0.04,
        sq: sqF(L.lz),
        a: wetA,
        lift: 0,
        sub: 0,
        wet: 1,
        shad: 1,
        grow: 0,
      }
    }
    if (
      out &&
      L.state !== 'home' &&
      L.state !== 'gone' &&
      L.state !== 'return'
    ) {
      const q = P ?? L.pose
      if (L.state === 'wait' || !q) {
        L.state = 'home'
        L.mask = 0
      } else {
        L.state = 'return'
        L.t0 = T + rnd(0, 0.45)
        L.from = {
          ...q,
          y: q.y - q.lift,
          lift: 0,
          ang: angTo(e.rotation, q.ang),
        }
      }
    }
    if (L.state === 'return') {
      const f = L.from
      const u = cl((T - L.t0) / 1.7)
      const k = ease5(u)
      const v = cl((T - L.t0 - 1.7) / 0.4)
      P = {
        x: lerp(f.x, e.x, k),
        y: lerp(f.y, e.y, k) - 10 * Math.sin(u * Math.PI) * (f.y > e.y ? 0 : 1),
        ang: lerp(f.ang, e.rotation, k),
        sq: lerp(f.sq, 1, k),
        a: lerp(f.a, pressedA, ease(u)) * (1 - v),
        lift: 0,
        sub: f.sub * (1 - k),
        wet: f.wet * (1 - k),
        shad: f.shad * (1 - k),
        grow: f.grow * (1 - k),
      }
      L.mask = 1 - ease(v)
      if (v >= 1) {
        L.state = 'gone'
        L.mask = 0
        P = null
      }
    }
    L.pose = P
  }
}
