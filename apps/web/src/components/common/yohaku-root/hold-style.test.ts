import { describe, expect, it } from 'vitest'

import { holdStyle } from './hold-style'

describe('holdStyle', () => {
  const css = holdStyle('egg-enter', 150)
  const rules = css.split('\n').filter((l) => l.includes('::view-transition'))

  it('scopes every view-transition rule to its own transition type', () => {
    expect(rules.length).toBe(2)
    for (const r of rules)
      expect(r.startsWith('html:active-view-transition-type(egg-enter)')).toBe(
        true,
      )
  })

  it('keeps the old snapshot opaque and hides the new one for the hold', () => {
    const old = rules.find((r) => r.includes('view-transition-old(root)'))!
    const fresh = rules.find((r) => r.includes('view-transition-new(root)'))!
    const frames = (r: string) => r.match(/animation: ([\w-]+) 150ms/)![1]
    expect(css).toContain(
      `@keyframes ${frames(old)} { from, to { opacity: 1; } }`,
    )
    expect(css).toContain(
      `@keyframes ${frames(fresh)} { from, to { opacity: 0; } }`,
    )
  })
})
