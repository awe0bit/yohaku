import { describe, expect, it } from 'vitest'

import { moonAge } from './moon'

describe('moonAge', () => {
  it('is full around the 2026 mid-autumn moon', () => {
    expect(Math.abs(moonAge(Date.UTC(2026, 8, 25, 12)) - 0.5)).toBeLessThan(
      0.04,
    )
    expect(Math.abs(moonAge(Date.UTC(2026, 8, 26, 17)) - 0.5)).toBeLessThan(
      0.02,
    )
  })

  it('is new at the 2026-08-12 solar eclipse', () => {
    const age = moonAge(Date.UTC(2026, 7, 12, 17, 37))
    expect(Math.min(age, 1 - age)).toBeLessThan(0.02)
  })

  it('waxes through the first half of the cycle', () => {
    const age = moonAge(Date.UTC(2026, 7, 20))
    expect(age).toBeGreaterThan(0.2)
    expect(age).toBeLessThan(0.35)
  })
})
