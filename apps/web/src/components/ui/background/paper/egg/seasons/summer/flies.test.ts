import { describe, expect, it } from 'vitest'

import { SOLAR_TERMS } from '~/lib/paper/season'

import { fireflyCount } from './flies'
import { MAX_FLIES } from './shaders'

const term = (name: (typeof SOLAR_TERMS)[number]) => SOLAR_TERMS.indexOf(name)

describe('fireflyCount', () => {
  it('starts with a few early fireflies at 立夏 and swarms by 大暑', () => {
    expect(fireflyCount(term('立夏'))).toBe(3)
    expect(fireflyCount(term('大暑'))).toBe(14)
  })

  it('grows through summer and stays within the shader limit', () => {
    const counts = SOLAR_TERMS.map((_, i) => fireflyCount(i)).slice(
      term('立夏'),
      term('大暑') + 1,
    )
    expect(counts).toEqual([3, 5, 9, 12, 13, 14])
    for (const c of counts) expect(c).toBeLessThanOrEqual(MAX_FLIES)
  })

  it('falls back to a full swarm for terms outside summer', () => {
    expect(fireflyCount(term('立春'))).toBe(12)
  })
})
