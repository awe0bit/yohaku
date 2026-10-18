import { describe, expect, it } from 'vitest'

import { lightAt } from './light'

describe('lightAt', () => {
  it('puts the noon sun above the middle of the page', () => {
    const noon = lightAt(12)
    expect(noon.src[0]).toBeCloseTo(0.5, 5)
    expect(noon.src[1]).toBeLessThan(0)
  })

  it('uses the warm desk lamp at night', () => {
    const night = lightAt(23)
    expect(night.src).toEqual([0.84, 0.1])
    expect(night.radius).toBeCloseTo(0.6, 5)
  })

  it('changes continuously across dusk', () => {
    const a = lightAt(17.49)
    const b = lightAt(17.51)
    expect(Math.abs(a.bokashi[0] - b.bokashi[0])).toBeLessThan(0.01)
  })
})
