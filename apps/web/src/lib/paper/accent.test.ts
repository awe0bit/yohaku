import { describe, expect, it } from 'vitest'

import { accentVars, seasonalAccentCss } from './accent'
import { accentRgb, rgbToHex } from './season'

describe('accentVars', () => {
  it('uses the seasonal accent and tints the root background by 0.4% in light theme', () => {
    const vars = accentVars(accentRgb(16, false), false)
    expect(vars.accent).toBe(rgbToHex(accentRgb(16, false)))
    expect(vars.rootBg).not.toBe('#fefefb')
    expect(vars.rootBg.startsWith('#fe')).toBe(true)
  })

  it('tints the dark root background by 0.2%', () => {
    const vars = accentVars(accentRgb(16, true), true)
    expect(vars.rootBg).toBe('#1c1c1e')
  })
})

describe('seasonalAccentCss', () => {
  it('emits both theme blocks for a solar term', () => {
    const css = seasonalAccentCss(16)
    expect(css).toContain(`[data-theme='light']`)
    expect(css).toContain(`--color-accent: ${rgbToHex(accentRgb(16, false))}`)
    expect(css).toContain(`--color-accent: ${rgbToHex(accentRgb(16, true))}`)
  })
})
