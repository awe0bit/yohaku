import type { ElemType } from '~/lib/paper/season'
import { ELEM_GROUPS, ELEM_SIZE, elemGroupIndex } from '~/lib/paper/season'

export const rng = (seed: number) => {
  let s = seed | 0
  return () => {
    s = (s + 0x6D2B79F5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296
  }
}

export const strHash = (str: string) => {
  let h = 2_166_136_261
  for (const ch of str) h = Math.imul(h ^ ch.codePointAt(0)!, 16_777_619)
  return h >>> 0
}

export interface ElementPlacement {
  alpha: number
  colorIndex: number
  family: string
  flip: boolean
  rotation: number
  seed: number
  size: number
  type: ElemType
  x: number
  y: number
}

const MIN_SPACING = 90

const positionPool = (w: number, h: number) => {
  const r = rng(211)
  const target = Math.round((w * h) / 40_000)
  const placed: [number, number][] = []
  for (let tries = 0; placed.length < target && tries < target * 20; tries++) {
    const x = r() * w
    const y = r() * h
    if (placed.some(([px, py]) => Math.hypot(px - x, py - y) < MIN_SPACING))
      continue
    placed.push([x, y])
  }
  return placed
}

const pickType = (mix: [ElemType, number][], slot: number) => {
  let best = -1
  let type = mix[0][0]
  for (const [candidate, weight] of mix) {
    const score =
      rng(strHash(candidate) ^ Math.imul(slot + 1, 2_654_435_761))() **
      (1 / weight)
    if (score > best) {
      best = score
      type = candidate
    }
  }
  return type
}

export const layoutElements = (
  w: number,
  h: number,
  term: number,
): ElementPlacement[] => {
  const { mix } = ELEM_GROUPS[elemGroupIndex(term)]
  return positionPool(w, h).map(([px, py], slot) => {
    const type = pickType(mix, slot)
    const family = type.split(':')[0]
    const seed = strHash(family) + slot * 7919
    const g = rng(seed)
    const [s0, s1] = ELEM_SIZE[type]
    return {
      type,
      family,
      seed,
      x: px + (g() - 0.5) * 50,
      y: py + (g() - 0.5) * 50,
      rotation: g() * Math.PI * 2,
      flip: g() < 0.5,
      alpha: 0.82 + g() * 0.15,
      colorIndex: g(),
      size: s0 + g() * (s1 - s0),
    }
  })
}
