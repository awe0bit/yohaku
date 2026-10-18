import { describe, expect, it } from 'vitest'

import { pickFigure } from './figure-pick'

const rect = (top: number, height: number) => ({ top, height })

describe('pickFigure', () => {
  it('returns no figure when none overlaps the viewport', () => {
    expect(pickFigure([rect(1200, 300), rect(-600, 300)], 900)).toEqual({
      index: -1,
      weight: 0,
    })
  })

  it('prefers the figure closest to the viewport center at full weight', () => {
    const picked = pickFigure([rect(-250, 300), rect(300, 300)], 900)
    expect(picked.index).toBe(1)
    expect(picked.weight).toBeCloseTo(1, 5)
  })

  it('fades the weight as a figure leaves the viewport', () => {
    const picked = pickFigure([rect(820, 300)], 900)
    expect(picked.index).toBe(0)
    expect(picked.weight).toBeLessThan(0.1)
  })
})
