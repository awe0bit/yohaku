import { describe, expect, it } from 'vitest'

import { layoutElements } from './layout'

const W = 1440
const H = 900

describe('layoutElements', () => {
  it('lays out about one element per 40 000 px²', () => {
    const items = layoutElements(W, H, 16)
    expect(items.length).toBeGreaterThan(25)
    expect(items.length).toBeLessThanOrEqual(Math.round((W * H) / 40_000))
  })

  it('is identical for two terms in the same element group', () => {
    expect(layoutElements(W, H, 16)).toEqual(layoutElements(W, H, 17))
  })

  it('keeps a family in place and only recolors it when the variant changes', () => {
    const before = layoutElements(W, H, 18)
    const after = layoutElements(W, H, 19)
    const turning = before.filter((e) => e.type === 'maple:turning')
    expect(turning.length).toBeGreaterThan(0)
    const recolored = turning.filter((e) => {
      const next = after[before.indexOf(e)]
      return (
        next.type === 'maple:red' &&
        next.x === e.x &&
        next.y === e.y &&
        next.rotation === e.rotation
      )
    })
    expect(recolored.length).toBeGreaterThan(turning.length / 2)
  })

  it('moves a different family off the old spot', () => {
    const before = layoutElements(W, H, 3)
    const after = layoutElements(W, H, 4)
    const swapped = before.findIndex((e, i) => e.family !== after[i].family)
    expect(swapped).toBeGreaterThanOrEqual(0)
    const a = before[swapped]
    const b = after[swapped]
    expect(a.x !== b.x || a.y !== b.y).toBe(true)
  })
})
