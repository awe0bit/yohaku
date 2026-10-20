import { describe, expect, it } from 'vitest'

import { rgbToLab } from './oklab'
import {
  accentRgb,
  elemGroupIndex,
  goldness,
  paperColor,
  SOLAR_TERMS,
  sunagoDensity,
} from './season'

describe('season tables', () => {
  it('names all 24 solar terms starting from 立春', () => {
    expect(SOLAR_TERMS).toHaveLength(24)
    expect(SOLAR_TERMS[0]).toBe('立春')
    expect(SOLAR_TERMS[16]).toBe('寒露')
  })

  it('maps every solar term to exactly one element group', () => {
    for (let i = 0; i < 24; i++)
      expect(elemGroupIndex(i)).toBeGreaterThanOrEqual(0)
    expect(elemGroupIndex(2)).not.toBe(elemGroupIndex(3))
  })

  it('peaks sunago density at 冬至 and thins it at 夏至', () => {
    expect(sunagoDensity(21)).toBeCloseTo(2, 5)
    expect(sunagoDensity(9)).toBeCloseTo(0.35, 5)
  })

  it('makes 霜降 the most golden term', () => {
    expect(goldness(17)).toBeCloseTo(1, 5)
  })

  it('anchors the light paper color at 秋分', () => {
    const [r, g, b] = paperColor(15, false)
    expect(r).toBeCloseTo(0.967, 3)
    expect(g).toBeCloseTo(0.955, 3)
    expect(b).toBeCloseTo(0.929, 3)
  })

  it('keeps accent lightness constant across seasons', () => {
    const lightness = [0, 3, 9, 16, 21].map(
      (i) => rgbToLab(accentRgb(i, false))[0],
    )
    for (const l of lightness) expect(l).toBeCloseTo(0.56, 2)
    expect(rgbToLab(accentRgb(16, true))[0]).toBeCloseTo(0.74, 2)
  })
})
