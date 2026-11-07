import { clamp, rnd, smoothstep, TAU } from './math'
import type { Floater, Lift } from './petals'

export interface Drop {
  age: number
  cool: number
  dead: boolean
  jig: number
  jigA: number
  jigPh: number
  nextRes: number
  noMerge: number
  pin: number
  push: number
  r: number
  seed: number
  trail: number
  vx: number
  vy: number
  x: number
  y: number
}

interface Ring {
  amp: number
  life: number
  r0: number
  t: number
  x: number
  y: number
}

export interface RainState {
  acc: number
  cells: boolean[]
  drops: Drop[]
  exiting: boolean
  exitT: number
  floaters: Floater[]
  lifts: Lift[]
  nextBlow: number
  rings: Ring[]
  t: number
}

export interface Pointer {
  fx: number
  fy: number
  t: number
  vx: number
  vy: number
  x: number
  y: number
}

export const MAX_POINTS = 1024
const MAX_DROPS = 320

const mkDrop = (
  x: number,
  y: number,
  r: number,
  o: Partial<Drop> = {},
): Drop => ({
  x,
  y,
  r,
  vx: 0,
  vy: 0,
  age: 0,
  pin: rnd(8, 12),
  seed: Math.random(),
  jig: 0,
  jigA: rnd(0, TAU),
  jigPh: 0,
  noMerge: 0,
  cool: 0,
  trail: 0,
  nextRes: rnd(6, 16),
  push: 0,
  dead: false,
  ...o,
})

export const landDrop = (
  S: RainState,
  x: number,
  y: number,
  r: number,
  o: Partial<Drop> = {},
) => {
  const d = mkDrop(x, y, r, o)
  S.drops.push(d)
  if (r > 2)
    S.rings.push({
      x,
      y,
      r0: r,
      t: 0,
      life: 0.16 + r * 0.009,
      amp: Math.min(0.45, 0.12 + r * 0.02),
    })
  const satellites =
    r < 2.6 ? (Math.random() < 0.35 ? 1 : 0) : Math.round(rnd(2, 3 + r * 0.3))
  if (S.drops.length < MAX_DROPS)
    for (let i = 0; i < satellites; i++) {
      const a = rnd(0, TAU)
      const dist = r * rnd(1.35, 2.3) + rnd(1, 3 + r * 0.3)
      S.drops.push(
        mkDrop(
          x + Math.cos(a) * dist,
          y + Math.sin(a) * dist,
          rnd(0.55, 0.8 + Math.min(1.1, r * 0.08)),
          { noMerge: 0.3, age: -rnd(0.02, 0.07) },
        ),
      )
    }
  return d
}

const split = (S: RainState, d: Drop, P: Pointer, sp: number) => {
  const V = d.r ** 3
  const r1 = Math.cbrt(V * 0.58)
  const r2 = Math.cbrt(V * 0.42)
  const ux = P.vx / sp
  const uy = P.vy / sp
  d.r = r1
  S.drops.push(
    mkDrop(d.x + ux * (r1 + r2) * 0.95, d.y + uy * (r1 + r2) * 0.95, r2, {
      vx: P.vx * 0.55,
      vy: P.vy * 0.55,
      noMerge: 0.5,
      cool: 0.7,
      jig: 0.3,
      jigA: Math.atan2(uy, ux),
      age: 0.3,
      push: 0.4,
      pin: d.pin,
    }),
  )
  d.x -= ux * r2 * 0.35
  d.y -= uy * r2 * 0.35
  d.vx = P.vx * 0.08
  d.vy = P.vy * 0.08
  d.noMerge = 0.5
  d.cool = 0.7
  d.jig = 0.3
  d.jigA = Math.atan2(uy, ux)
  d.jigPh = 0
  for (let i = 0; i < 2; i++) {
    const t = rnd(0.3, 0.7)
    S.drops.push(
      mkDrop(
        d.x + ux * (r1 + r2) * t + rnd(-1.5, 1.5),
        d.y + uy * (r1 + r2) * t + rnd(-1.5, 1.5),
        rnd(0.6, 1.3),
        { noMerge: 0.6 },
      ),
    )
  }
}

const coalesce = (S: RainState) => {
  const { drops } = S
  const n = drops.length
  for (let i = 0; i < n; i++) {
    const a = drops[i]
    if (a.dead || a.age < 0) continue
    for (let j = i + 1; j < n; j++) {
      const b = drops[j]
      if (b.dead || b.age < 0) continue
      if (a.noMerge > 0 && b.noMerge > 0) continue
      const dx = b.x - a.x
      const dy = b.y - a.y
      const rr = (a.r + b.r) * 0.84
      if (dx * dx + dy * dy > rr * rr) continue
      const [big, sm] = a.r >= b.r ? [a, b] : [b, a]
      const Vb = big.r ** 3
      const Vs = sm.r ** 3
      const V = Vb + Vs
      big.x = (big.x * Vb + sm.x * Vs) / V
      big.y = (big.y * Vb + sm.y * Vs) / V
      big.vx = (big.vx * Vb + sm.vx * Vs) / V
      big.vy = (big.vy * Vb + sm.vy * Vs) / V
      big.r = Math.cbrt(V)
      big.jig = Math.min(0.32, big.jig + 0.06 + (0.3 * sm.r) / big.r)
      big.jigA = Math.atan2(sm.y - big.y, sm.x - big.x)
      big.jigPh = 0
      big.pin = Math.max(Math.min(big.pin, sm.pin), big.pin * 0.94)
      big.age = Math.max(big.age, 0.6)
      sm.dead = true
      for (const f of S.floaters)
        if (f.drop === sm) {
          f.ox = f.x - big.x
          f.oy = f.y - big.y
          f.drop = big
        }
      if (sm === a) break
    }
  }
}

export const stepDrops = (
  S: RainState,
  P: Pointer,
  dt: number,
  w: number,
  h: number,
) => {
  const { drops } = S
  const pf = Math.exp(-dt * 10)
  P.vx *= pf
  P.vy *= pf
  const psp = Math.hypot(P.vx, P.vy)
  const sx = P.x - P.fx
  const sy = P.y - P.fy
  const sl = sx * sx + sy * sy
  for (const d of drops) {
    d.age += dt
    if (d.age < 0) continue
    d.noMerge -= dt
    d.cool -= dt
    d.push -= dt
    if (S.exiting) d.r = d.r * Math.exp(-dt * 0.7) - dt * 0.6
    else d.r -= dt * (d.r < 1.5 ? 0.07 : 0.008)
    if (d.r < 0.32) {
      d.dead = true
      continue
    }
    if (!S.exiting) {
      const u =
        sl > 0 ? clamp(((d.x - P.fx) * sx + (d.y - P.fy) * sy) / sl, 0, 1) : 1
      const dx = d.x - (P.fx + sx * u)
      const dy = d.y - (P.fy + sy * u)
      const dist = Math.hypot(dx, dy)
      if (dist < d.r + 3) {
        if (psp > 260 && d.r > 5 && d.cool <= 0 && dist < d.r * 0.75)
          split(S, d, P, psp)
        else if (psp > 25) {
          const k = Math.min(1, dt * (psp > 260 ? 3 : 14))
          d.vx += (P.vx * 0.85 - d.vx) * k
          d.vy += (P.vy * 0.85 - d.vy) * k
          d.push = 0.3
        }
        if (psp < 260 && dist > 0.01) {
          const out = (d.r + 3 - dist) * Math.min(1, dt * 10)
          d.x += (dx / dist) * out
          d.y += (dy / dist) * out
        }
      }
    }
    if (!S.exiting && d.age > 0.6 && d.r > d.pin && d.push <= 0) {
      const rough = clamp(
        0.62 +
          0.42 * Math.sin(d.y * 0.083 + d.seed * 9) +
          0.28 * Math.sin(d.y * 0.029 + d.seed * 4),
        0.06,
        1.3,
      )
      const vT = Math.min(150, 18 + 13 * (d.r - d.pin)) * rough
      d.vy += (vT - d.vy) * Math.min(1, dt * 2.5)
      const vxT =
        d.vy *
        (0.34 * Math.sin(d.y * 0.047 + d.seed * TAU) +
          0.17 * Math.sin(d.y * 0.12 + d.seed * 2.1))
      d.vx += (vxT - d.vx) * Math.min(1, dt * 3)
      d.r -= dt * 0.22
    } else if (d.push <= 0) {
      const f = Math.exp(-dt * 6)
      d.vx *= f
      d.vy *= f
    }
    d.x += d.vx * dt
    d.y += d.vy * dt
    const sp = Math.hypot(d.vx, d.vy)
    if (sp > 6 && d.r > 3 && !S.exiting) {
      d.trail += sp * dt
      if (d.trail > d.nextRes) {
        d.trail = 0
        d.nextRes = rnd(6, 17)
        if (Math.random() < 0.55 && drops.length < MAX_DROPS) {
          const rr = rnd(0.6, Math.min(2, d.r * 0.2))
          d.r = Math.cbrt(Math.max(1, d.r ** 3 - rr ** 3))
          const ux = d.vx / sp
          const uy = d.vy / sp
          const side = rnd(-0.6, 0.6) * d.r
          drops.push(
            mkDrop(
              d.x - ux * (d.r * 1.1 + rr) - uy * side,
              d.y - uy * (d.r * 1.1 + rr) + ux * side,
              rr,
              { noMerge: 0.8 },
            ),
          )
        }
      }
    }
    d.jigPh += dt * TAU * 8 * Math.sqrt(6 / (d.r + 3))
    d.jig *= Math.exp(-dt * 4.5)
    if (d.y - d.r > h + 30 || d.x < -40 || d.x > w + 40) d.dead = true
  }
  P.fx = P.x
  P.fy = P.y
  coalesce(S)
  S.drops = drops.filter((d) => !d.dead)
  for (const r of S.rings) r.t += dt
  S.rings = S.rings.filter((r) => r.t < r.life)
}

const dropHeight = (r: number) =>
  Math.min(9, r * (0.56 - 0.14 * smoothstep(3, 16, r)))

export const packDrops = (S: RainState, data: Float32Array) => {
  let k = 0
  const put = (
    x: number,
    y: number,
    R: number,
    H: number,
    ang: number,
    tail: number,
    sq: number,
    kind: number,
  ) => {
    if (k >= MAX_POINTS) return
    const o = k * 8
    data[o] = x
    data[o + 1] = y
    data[o + 2] = R
    data[o + 3] = H
    data[o + 4] = ang
    data[o + 5] = tail
    data[o + 6] = sq
    data[o + 7] = kind
    k++
  }
  for (const d of S.drops) {
    if (d.age < 0) continue
    const e = clamp(d.age / 0.15, 0, 1)
    const ee = 1 - (1 - e) ** 3
    const R = d.r * (1 + 0.3 * (1 - ee))
    const H = dropHeight(d.r) * (0.25 + 0.75 * ee)
    const sp = Math.hypot(d.vx, d.vy)
    const sq = clamp(d.jig * Math.sin(d.jigPh), -0.35, 0.35)
    if (sp > 3 && d.r > 1.2) {
      const tail = 1 + Math.min(0.75, sp / 90)
      put(d.x, d.y, R / tail ** 0.32, H, Math.atan2(d.vy, d.vx), tail, sq, 0)
    } else put(d.x, d.y, R, H, d.jigA, 1, sq, 0)
  }
  for (const r of S.rings) {
    const e = r.t / r.life
    put(
      r.x,
      r.y,
      r.r0 * (1 + 1.25 * (1 - (1 - e) ** 2)),
      r.amp * (1 - e) ** 1.5,
      0,
      0.6 + r.r0 * 0.06 * (1 + e),
      0,
      1,
    )
  }
  return k
}
