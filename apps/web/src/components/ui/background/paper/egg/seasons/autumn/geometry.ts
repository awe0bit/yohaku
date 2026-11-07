import type { Glyph } from '../types'
import { cl } from './math'

export const A = 0.15
export const B = 0.225
export const CELL = 6
export const MOON_R = 46

export interface Water {
  D: number
  Nx: number
  Ny: number
  PL: number
  rnOf: (s: number) => number
  sOf: (y: number) => number
  yL: number
  yOf: (s: number) => number
}

export const waterOf = (glyphs: Glyph[], w: number, h: number): Water => {
  const lines = new Map<number, { bot: number; top: number }>()
  for (const g of glyphs) {
    const l = lines.get(g.line) ?? { top: 1e9, bot: -1e9 }
    l.top = Math.min(l.top, g.y)
    l.bot = Math.max(l.bot, g.y + g.h)
    lines.set(g.line, l)
  }
  const want = h * 0.53
  let yL = want
  let best = 1e9
  for (const l of lines.values()) {
    const y = l.bot + 3
    if (y < h * 0.48 || y > h * 0.58) continue
    if ([...lines.values()].some((o) => o.top < y + 2 && o.bot > y - 2))
      continue
    if (Math.abs(y - want) < best) {
      best = Math.abs(y - want)
      yL = y
    }
  }
  const D = h - yL
  const PL = D / (A + B)
  return {
    yL,
    D,
    PL,
    Nx: Math.round(w / CELL),
    Ny: Math.round(PL / CELL),
    sOf: (y) => {
      const q = cl((y - yL) / D) * (A + B)
      return (-A + Math.sqrt(A * A + 4 * B * q)) / (2 * B)
    },
    yOf: (s) => yL + (D * (A * s + B * s * s)) / (A + B),
    rnOf: (s) => (A + 2 * B * s) / (A + 2 * B),
  }
}

export const moonSpot = (glyphs: Glyph[], w: number, fromRight: boolean) => {
  if (!glyphs.length) return { x: w - MOON_R - 60, y: 90 }
  const top = glyphs.reduce((a, g) => (g.y < a.y ? g : a))
  const head = glyphs.filter((g) => g.y < top.y + top.h * 0.5)
  const right = Math.max(...head.map((g) => g.x + g.w))
  const left = Math.min(...head.map((g) => g.x))
  const bottom = Math.max(...head.map((g) => g.y + g.h))
  return {
    x: fromRight
      ? Math.min(w - MOON_R - 24, right + 4)
      : Math.max(MOON_R + 24, left - 4),
    y: bottom + MOON_R * 0.55,
  }
}
