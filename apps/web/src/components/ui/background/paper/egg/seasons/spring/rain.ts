import type { ElementPlacement } from '../../../layout'
import type { Box, Glyph } from '../types'
import type { Drop, Pointer, RainState } from './drops'
import { landDrop, packDrops, stepDrops } from './drops'
import { rnd, smoothstep } from './math'
import type { PaintCell } from './petals'
import { createPetals } from './petals'
import { NF } from './shaders'

interface RainInput {
  boxes: Box[]
  dark: boolean
  elements: ElementPlacement[]
  elemVisibility: () => number
  glyphs: Glyph[]
  h: number
  paint: PaintCell
  w: number
}

const showcase = (
  g: Glyph[],
  img: Box | undefined,
  pressed: ElementPlacement[],
  w: number,
  h: number,
  land: (x: number, y: number, r: number, o: Partial<Drop>) => Drop,
): [number, () => unknown][] => {
  let bodySize = 0
  let topSize = 0
  const sizeCount = new Map<number, number>()
  for (const q of g) {
    const n = (sizeCount.get(q.size) ?? 0) + 1
    sizeCount.set(q.size, n)
    if (n > (sizeCount.get(bodySize) ?? 0)) bodySize = q.size
    topSize = Math.max(topSize, q.size)
  }
  const body = g.filter((q) => q.size === bodySize)
  const blocks = [...new Set(body.map((q) => q.block))]
  const first = body.filter((q) => q.block === blocks[0])
  const titles = topSize > bodySize ? g.filter((q) => q.size === topSize) : []
  const p1: Glyph | undefined =
    first[Math.floor(first.length * 0.45)] ?? g[Math.floor(g.length * 0.3)]
  const ttl: Glyph | undefined =
    titles[Math.floor(titles.length * 0.45)] ?? g[5]
  const p2: Glyph | undefined =
    body.filter((q) => q.block === blocks[1])[8] ??
    g[Math.floor(g.length * 0.5)]
  const cx = w / 2
  const inCol = pressed.filter(
    (e) => Math.abs(e.x - cx) < 330 && e.y > 140 && e.y < h - 260,
  )
  const eSit: ElementPlacement | undefined = inCol.sort(
    (a, b) => Math.abs(a.y - 330) - Math.abs(b.y - 330),
  )[0]
  const eSlide: ElementPlacement | undefined = inCol
    .filter((e) => e !== eSit && e.y < h - 320)
    .sort((a, b) => a.y - b.y)[0]
  return [
    [1, () => p1 && land(p1.x + p1.w / 2, p1.y + p1.h / 2, 18, { pin: 26 })],
    [
      2.3,
      () =>
        img &&
        land(img.x + img.w * 0.676, img.y + img.h * 0.355, 22, { pin: 32 }),
    ],
    [
      3.4,
      () =>
        ttl && land(ttl.x + ttl.w * 0.6, ttl.y + ttl.h * 0.55, 13, { pin: 18 }),
    ],
    [
      4.6,
      () =>
        img &&
        land(img.x + img.w * 0.28, img.y + img.h * 0.47, 16, { pin: 23 }),
    ],
    [5.6, () => p2 && land(p2.x, p2.y - 4, 15, { pin: 9 })],
    [6.6, () => eSit && land(eSit.x + 2, eSit.y + 1, 19, { pin: 40 })],
    [8.2, () => eSlide && land(eSlide.x + 3, eSlide.y - 70, 16, { pin: 10 })],
  ]
}

export const createRain = (input: RainInput) => {
  const { w, h, dark } = input
  const S: RainState = {
    acc: 0,
    cells: Array.from({ length: NF }, () => false),
    drops: [],
    exitT: 0,
    exiting: false,
    floaters: [],
    lifts: [],
    nextBlow: rnd(16, 24),
    rings: [],
    t: 0,
  }
  const P: Pointer = {
    fx: -999,
    fy: -999,
    t: 0,
    vx: 0,
    vy: 0,
    x: -999,
    y: -999,
  }

  const land = (x: number, y: number, r: number, o: Partial<Drop> = {}) =>
    landDrop(S, x, y, r, o)
  const randomSpot = (): [number, number] => {
    const cx = w / 2
    const x = Math.random() < 0.7 ? rnd(cx - 400, cx + 400) : rnd(10, w - 10)
    return [x, rnd(6, h - 6)]
  }
  const petals = createPetals({
    dark,
    elemVisibility: input.elemVisibility,
    elements: input.elements,
    h,
    land,
    paint: input.paint,
    randomSpot,
    state: S,
    w,
  })
  const schedule = showcase(
    input.glyphs,
    input.boxes[0],
    petals.pressed,
    w,
    h,
    land,
  )
  let next = 0

  const update = (dt: number) => {
    S.t += dt
    if (S.exiting) S.exitT += dt
    else {
      while (next < schedule.length && schedule[next][0] <= S.t)
        schedule[next++][1]()
      if (S.t > 0.6) {
        const gust =
          0.75 + 0.35 * Math.sin(S.t * 0.37) * Math.sin(S.t * 0.13 + 2)
        S.acc +=
          (0.5 + (dark ? 3.2 : 3.9) * smoothstep(1, 7.5, S.t)) * gust * dt
        while (S.acc >= 1) {
          S.acc -= 1
          const [x, y] = randomSpot()
          land(
            x,
            y,
            Math.random() < 0.16
              ? rnd(6.5, 12.5)
              : 1.3 + 6.2 * Math.random() ** 2.2,
          )
        }
      }
      if (S.t > S.nextBlow) {
        S.nextBlow = S.t + rnd(20, 30)
        petals.blow()
      }
    }
    stepDrops(S, P, dt, w, h)
    petals.step(dt)
  }

  return {
    state: S,
    update,
    pack: (data: Float32Array) => packDrops(S, data),
    get settled() {
      return (
        S.exiting &&
        S.exitT > 3.6 &&
        !S.drops.length &&
        !S.rings.length &&
        !S.floaters.length &&
        !S.lifts.length
      )
    },
    exit: () => {
      if (S.exiting) return
      S.exiting = true
      S.exitT = 0
    },
    move: (x: number, y: number, now: number) => {
      const dtE = Math.max(0.004, (now - P.t) / 1000)
      if (now - P.t < 120) {
        P.vx += ((x - P.x) / dtE - P.vx) * 0.55
        P.vy += ((y - P.y) / dtE - P.vy) * 0.55
      } else {
        P.fx = x
        P.fy = y
      }
      P.x = x
      P.y = y
      P.t = now
    },
    leave: () => {
      P.x = -999
      P.y = -999
      P.fx = -999
      P.fy = -999
      P.vx = 0
      P.vy = 0
    },
    drip: (x: number, y: number) => {
      if (S.exiting) return
      const r = rnd(16, 20)
      land(x, y, r, { pin: r * rnd(0.8, 1.25) })
    },
  }
}
