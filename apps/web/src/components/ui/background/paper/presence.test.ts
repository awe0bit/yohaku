import { describe, expect, it } from 'vitest'

import {
  createPresence,
  leafClock,
  presenceGone,
  startPresence,
  stepPresence,
  TIMELINE,
} from './presence'

describe('presence', () => {
  it('starts every layer at zero so the first frame matches the page', () => {
    const p = createPresence(0)
    stepPresence(p, 0, false)
    expect(Object.values(p.v).every((v) => v === 0)).toBe(true)
  })

  it('brings layers in coarse to fine', () => {
    const p = createPresence(0)
    stepPresence(p, 600, false)
    expect(p.v.base).toBeGreaterThan(0)
    expect(p.v.sunago).toBe(0)
    expect(p.v.elem).toBe(0)
  })

  it('reaches full presence when the entrance ends', () => {
    const p = createPresence(0)
    const busy = stepPresence(p, TIMELINE.in.elem[1], false)
    expect(busy).toBe(false)
    expect(Object.values(p.v).every((v) => v === 1)).toBe(true)
  })

  it('exits from wherever the entrance was interrupted', () => {
    const p = createPresence(0)
    stepPresence(p, 800, false)
    const base = p.v.base
    startPresence(p, 'out', 800)
    stepPresence(p, 800, false)
    expect(p.v.base).toBeCloseTo(base)
    stepPresence(p, 800 + TIMELINE.out.base[1], false)
    expect(presenceGone(p)).toBe(true)
  })

  it('compresses everything into one short fade under reduced motion', () => {
    const p = createPresence(0)
    stepPresence(p, 200, true)
    expect(p.v.base).toBeCloseTo(p.v.elem)
    expect(stepPresence(p, 400, true)).toBe(false)
  })

  it('times the leaf fall from the start of its own window', () => {
    const p = createPresence(0)
    expect(leafClock(p, TIMELINE.in.elem[0] + 500)).toBeCloseTo(0.5)
    startPresence(p, 'out', 5000)
    expect(leafClock(p, 5250)).toBeCloseTo(0.25)
  })
})
