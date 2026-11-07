import type { ElemType } from '~/lib/paper/season'

import type { ElementPlacement } from '../../../layout'
import type { Live } from '../types'
import { rnd, smoothstep } from './math'
import { MAX_FLIES } from './shaders'

type Mode = 'in' | 'land' | 'landed' | 'seek' | 'wander'

interface Spot {
  x: number
  y: number
}

interface Fly {
  a: number
  attr: number
  b: number
  born: number
  fade: number
  ft: number
  h: number
  hd: number
  hT: number
  land: number
  landDur: number
  landT: number
  mode: Mode
  oph: [number, number]
  ow: [number, number]
  per: number
  s: [number, number, number, number, number]
  soft: number
  sp: number
  tg: Spot
  th: number
  vx: number
  vy: number
  x: number
  y: number
}

const SUMMER_COUNTS: Record<number, number> = {
  6: 3,
  7: 5,
  8: 9,
  9: 12,
  10: 13,
  11: 14,
}

export const fireflyCount = (term: number) => SUMMER_COUNTS[term] ?? 12

const ELEM_PREF: Partial<Record<ElemType, number>> = {
  ajisai: 1,
  lotus: 1.2,
  wisteria: 0.8,
  'maple:green': 0.25,
}

const flash = (ft: number) =>
  ft < 0
    ? 0
    : ft < 0.32
      ? smoothstep(0, 0.32, ft)
      : Math.exp(-(ft - 0.32) / 0.42)

export const createSwarm = (
  live: Pick<Live, 'boxes' | 'glyphs' | 'h' | 'season' | 'w'>,
) => {
  const { w: W, h: H } = live
  const count = fireflyCount(live.season.term)
  const ptr = { x: 0, y: 0, on: false, moved: false, lastMove: 0 }
  const pouch = { a: 0, th: 0, w: 0, sx: 0, sy: 0, vx: 0, vy: 0, init: false }
  let glow = 0
  let nIn = 0
  let nextLand = rnd(8, 11)
  let nextBurst = rnd(16, 22)
  let burst: { t0: number; x: number; y: number } | null = null

  const makeFly = (i: number): Fly => {
    const side = Math.random()
    let x: number
    let y: number
    if (side < 0.5) {
      x = rnd(60, W - 60)
      y = H + 16
    } else if (side < 0.75) {
      x = -16
      y = rnd(H * 0.3, H * 0.9)
    } else {
      x = W + 16
      y = rnd(H * 0.3, H * 0.9)
    }
    const th = Math.atan2(
      rnd(H * 0.25, H * 0.7) - y,
      W * 0.5 + rnd(-300, 300) - x,
    )
    const sp = rnd(18, 34)
    return {
      x,
      y,
      h: rnd(40, 150),
      hT: 80,
      vx: Math.cos(th) * sp,
      vy: Math.sin(th) * sp,
      th,
      sp,
      mode: 'wander',
      a: rnd(-0.4, 0.2),
      attr: rnd(0.12, 0.34),
      born: 1.6 + i * rnd(0.35, 0.6) * (12 / Math.max(count, 6)),
      fade: 0,
      ft: rnd(0, 4),
      per: rnd(2.4, 6),
      b: 0,
      s: [rnd(0, 9), rnd(0, 9), rnd(0, 9), rnd(0, 9), rnd(0, 9)],
      ow: [rnd(0.7, 1.5), rnd(0.8, 1.7)],
      oph: [rnd(0, 6.3), rnd(0, 6.3)],
      tg: { x: 0, y: 0 },
      landT: 0,
      landDur: 0,
      hd: th,
      land: 0,
      soft: 0,
    }
  }
  const flies = Array.from({ length: count }, (_, i) => makeFly(i))

  const inStage = (x: number, y: number, pad = 0) =>
    x > pad && x < W - pad && y > 40 && y < H - 90

  const pickGlyph = (f: Fly): Spot | null => {
    const cands = live.glyphs.filter(
      (g) => inStage(g.x, g.y) && inStage(g.x + g.w, g.y + g.h),
    )
    if (!cands.length) return null
    let best = cands[0]
    let bs = -1
    for (let k = 0; k < 40; k++) {
      const g = cands[Math.floor(Math.random() * cands.length)]
      const d = Math.hypot(g.x + g.w / 2 - f.x, g.y + g.h / 2 - f.y)
      const s = (g.size / 17) * (1 / (1 + d / 260)) * rnd(0.6, 1.4)
      if (s > bs) {
        bs = s
        best = g
      }
    }
    return { x: best.x + best.w * 0.5, y: best.y + best.h * 0.52 }
  }

  const pickElement = (f: Fly): Spot | null => {
    let best: ElementPlacement | null = null
    let bs = -1
    for (const el of live.season.elements) {
      const pref = ELEM_PREF[el.type]
      if (!pref || !inStage(el.x, el.y, 30)) continue
      const covered =
        live.boxes.some(
          (b) =>
            el.x > b.x - 12 &&
            el.x < b.x + b.w + 12 &&
            el.y > b.y - 12 &&
            el.y < b.y + b.h + 12,
        ) ||
        live.glyphs.some(
          (g) =>
            el.x > g.x - 8 &&
            el.x < g.x + g.w + 8 &&
            el.y > g.y - 8 &&
            el.y < g.y + g.h + 8,
        )
      if (covered) continue
      const d = Math.hypot(el.x - f.x, el.y - f.y)
      const s = pref * (1 / (1 + d / 300)) * rnd(0.5, 1.5)
      if (s > bs) {
        bs = s
        best = el
      }
    }
    if (!best) return null
    const a = rnd(0, Math.PI * 2)
    const r = best.size * 0.42
    return { x: best.x + Math.cos(a) * r, y: best.y + Math.sin(a) * r }
  }

  const escape = (
    f: Fly,
    pg: { ax: number; ay: number; nx: number; ny: number },
  ) => {
    f.mode = 'wander'
    f.x = pg.nx
    f.y = pg.ny
    f.th = Math.atan2(-pg.ay, -pg.ax) + rnd(-0.9, 0.9)
    const sp = rnd(40, 70)
    f.vx = Math.cos(f.th) * sp
    f.vy = Math.sin(f.th) * sp
    f.hT = rnd(80, 150)
    f.soft = 0
  }

  const step = (dt: number, T: number, dawnP: number | null) => {
    const dawn = dawnP !== null
    const fadeAll = 1 - smoothstep(0, 0.75, dawnP ?? 0)

    const pouchOn = ptr.on && !dawn
    pouch.a += ((pouchOn ? 1 : 0) - pouch.a) * Math.min(1, dt * 3)
    if (dt > 0) {
      if (!pouch.init) {
        pouch.sx = ptr.x
        pouch.sy = ptr.y
        pouch.init = true
      }
      const nvx = (ptr.x - pouch.sx) / dt
      const nvy = (ptr.y - pouch.sy) / dt
      pouch.sx = ptr.x
      pouch.sy = ptr.y
      const k = Math.min(1, dt * 18)
      const svx = pouch.vx + (nvx - pouch.vx) * k
      const svy = pouch.vy + (nvy - pouch.vy) * k
      const accx = (svx - pouch.vx) / dt
      const accy = (svy - pouch.vy) / dt
      pouch.vx = svx
      pouch.vy = svy
      const acc =
        -((1500 + accy) * Math.sin(pouch.th) + accx * Math.cos(pouch.th)) / 36 -
        3.2 * pouch.w
      pouch.w += Math.min(400, Math.max(-400, acc)) * dt
      pouch.th = Math.min(1.1, Math.max(-1.1, pouch.th + pouch.w * dt))
    }
    if (ptr.moved) {
      ptr.lastMove = T
      ptr.moved = false
    }
    const still = T - ptr.lastMove
    const ax = Math.sin(pouch.th)
    const ay = Math.cos(pouch.th)
    const pg = {
      cx: ptr.x + ax * 44,
      cy: ptr.y + ay * 44,
      nx: ptr.x + ax * 13,
      ny: ptr.y + ay * 13,
      ax,
      ay,
    }

    if (!dawn && T > nextBurst && count >= 5) {
      const src = flies.filter((f) => f.fade > 0.5)
      if (src.length) {
        const o = src[Math.floor(Math.random() * src.length)]
        burst = { t0: T, x: o.x, y: o.y }
      }
      nextBurst = T + rnd(18, 30)
    }
    if (!dawn && T > nextLand) {
      nextLand = T + rnd(6, 11)
      const landed = flies.filter(
        (f) => f.mode === 'land' || f.mode === 'landed',
      ).length
      const free = flies.filter(
        (f) =>
          f.mode === 'wander' &&
          f.fade > 0.9 &&
          f.a < 0.6 &&
          f.x > 0 &&
          f.x < W &&
          f.y > 0 &&
          f.y < H,
      )
      if (landed < Math.max(1, Math.round(count / 6)) && free.length) {
        const f = free[Math.floor(Math.random() * free.length)]
        const tg =
          Math.random() < 0.45 ? pickElement(f) || pickGlyph(f) : pickGlyph(f)
        if (tg) {
          f.mode = 'land'
          f.tg = tg
        }
      }
    }

    let inPouch = 0
    for (const f of flies) {
      if (T < f.born) continue
      f.fade = Math.min(1, f.fade + dt / 1.6)
      const [s0, s1, s2, s3, s4] = f.s

      if (pouchOn && f.mode === 'wander') {
        const d = Math.hypot(pg.cx - f.x, pg.cy - f.y)
        f.a += dt * f.attr * (0.6 + 220 / (d + 120))
        if (f.a > 1) f.mode = 'seek'
      }
      if (!pouchOn && (f.mode === 'seek' || f.mode === 'in')) {
        if (f.mode === 'in') escape(f, pg)
        f.mode = 'wander'
        f.a = -0.5
      }

      let dvx = 0
      let dvy = 0
      let hT = f.hT
      let rate = 1.3
      if (f.mode === 'wander') {
        f.th +=
          (Math.sin(T * 0.71 + s0) * 0.9 +
            Math.sin(T * 1.33 + s1) * 0.6 +
            Math.sin(T * 0.23 + s2) * 0.8) *
          dt *
          1.3
        const half = Math.min(W * 0.5 - 70, 520)
        if (
          f.x < W * 0.5 - half ||
          f.x > W * 0.5 + half ||
          f.y < 70 ||
          f.y > H - 90
        ) {
          const da = Math.atan2(H * 0.5 - f.y, W * 0.5 - f.x) - f.th
          f.th += Math.atan2(Math.sin(da), Math.cos(da)) * Math.min(1, dt * 1.2)
        }
        const sp = f.sp * (0.45 + 0.55 * (0.5 + 0.5 * Math.sin(T * 0.37 + s3)))
        dvx = Math.cos(f.th) * sp
        dvy = Math.sin(f.th) * sp
        hT =
          16 +
          95 *
            (0.5 + 0.5 * Math.sin(T * 0.11 + s4)) *
            (0.6 + 0.4 * Math.sin(T * 0.07 + s0))
      } else if (f.mode === 'seek') {
        const dx = pg.cx - f.x
        const dy = pg.cy - f.y
        const d = Math.hypot(dx, dy) || 1
        const sp = Math.min(80, 22 + d * 0.45)
        const wob = Math.sin(T * 2.6 + s0) * 0.5
        dvx = (dx / d + (-dy / d) * wob) * sp
        dvy = (dy / d + (dx / d) * wob) * sp
        f.th = Math.atan2(dvy, dvx)
        hT = 52
        rate = 2.2
        if (d < 18 && Math.abs(f.h - 52) < 30) {
          f.mode = 'in'
          f.soft = 0
        }
      } else if (f.mode === 'land') {
        const dx = f.tg.x - f.x
        const dy = f.tg.y - f.y
        const d = Math.hypot(dx, dy) || 1
        const sp = Math.min(55, 10 + d * 0.9)
        dvx = (dx / d) * sp
        dvy = (dy / d) * sp
        f.th = Math.atan2(dvy, dvx)
        hT = d < 70 ? 7 : 46
        rate = 2.5
        if (d < 4 && f.h < 14) {
          f.mode = 'landed'
          f.landT = T
          f.landDur = rnd(6, 10)
          f.hd = f.th + rnd(-0.4, 0.4)
        }
      }

      if (f.mode === 'in') {
        inPouch++
        const ox =
          Math.sin(T * f.ow[0] + f.oph[0]) * 13 + Math.sin(T * 2.3 + s1) * 1.5
        const oy = Math.sin(T * f.ow[1] + f.oph[1]) * 14 + 3
        const tx = pg.cx + ox * pg.ay + oy * pg.ax
        const ty = pg.cy - ox * pg.ax + oy * pg.ay
        const k = Math.min(1, dt * 7)
        f.vx = ((tx - f.x) / Math.max(dt, 1e-3)) * k
        f.vy = ((ty - f.y) / Math.max(dt, 1e-3)) * k
        f.x += (tx - f.x) * k
        f.y += (ty - f.y) * k
        f.h += (52 + Math.sin(T * 1.1 + s2) * 5 - f.h) * Math.min(1, dt * 3)
        f.soft = Math.min(0.2, f.soft + dt * 1.5)
        if (
          still > 5 &&
          nIn > Math.min(3, count - 1) &&
          Math.random() < dt * 0.06
        ) {
          escape(f, pg)
          f.a = -2.6
          nIn--
        }
      } else if (f.mode === 'landed') {
        f.vx *= 0.8
        f.vy *= 0.8
        f.x += (f.tg.x - f.x) * Math.min(1, dt * 4)
        f.y += (f.tg.y - f.y) * Math.min(1, dt * 4)
        f.h += (4.5 - f.h) * Math.min(1, dt * 3)
        if (T - f.landT > f.landDur || dawn) {
          f.mode = 'wander'
          f.a = -1
          f.th = f.hd + Math.PI + rnd(-1, 1)
          f.hT = 120
          f.vx = Math.cos(f.th) * 10
          f.vy = Math.sin(f.th) * 10
        }
      } else {
        f.vx += (dvx - f.vx) * Math.min(1, dt * rate)
        f.vy += (dvy - f.vy) * Math.min(1, dt * rate)
        f.x += f.vx * dt
        f.y += f.vy * dt
        f.h += (hT - f.h) * Math.min(1, dt * (f.mode === 'land' ? 1.6 : 0.5))
        f.soft = Math.max(0, f.soft - dt * 2)
      }
      f.land += ((f.mode === 'landed' ? 1 : 0) - f.land) * Math.min(1, dt * 3)

      f.ft += dt
      if (f.ft > f.per) {
        f.ft = 0
        f.per = f.mode === 'in' ? rnd(1.6, 3.2) : rnd(2.6, 6.5)
      }
      let base = 0.05
      let amp = 1
      if (f.mode === 'in') {
        base = 0.34 + 0.08 * Math.sin(T * 1.7 + s3)
        amp = 0.75
      }
      let b = base + flash(f.ft) * amp
      if (f.mode === 'landed' || (f.mode === 'land' && f.land > 0.01)) {
        const u = 0.5 - 0.5 * Math.cos(((T - f.landT) / 2.7) * Math.PI * 2)
        b = 0.1 + 0.7 * u ** 1.4 * f.land + (1 - f.land) * b
      }
      if (burst && f.mode !== 'in') {
        const loc =
          T - burst.t0 - Math.hypot(f.x - burst.x, f.y - burst.y) / 520
        for (let k = 0; k < 3; k++) b = Math.max(b, flash(loc - k * 0.9) * 1.05)
      }
      f.b = b * f.fade * fadeAll
    }
    if (burst && T - burst.t0 > 6) burst = null
    glow = 0
    for (const f of flies) if (f.mode === 'in') glow += f.b
    nIn = inPouch
    return fadeAll
  }

  const pack = (T: number, F: Float32Array, G: Float32Array) => {
    let n = 0
    for (const f of flies) {
      if (n >= MAX_FLIES || T < f.born || f.b <= 0) continue
      const o = n * 4
      F[o] = f.x
      F[o + 1] = f.y
      F[o + 2] = f.h
      F[o + 3] = f.b
      G[o] = f.mode === 'in' ? 1 : 0
      G[o + 1] = f.hd
      G[o + 2] = f.land
      G[o + 3] = f.soft * 1.3
      n++
    }
    return n
  }

  return {
    ptr,
    pouch,
    get glow() {
      return glow
    },
    pack,
    step,
  }
}
