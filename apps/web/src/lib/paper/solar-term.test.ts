import { describe, expect, it } from 'vitest'

import {
  msUntilNextLocalMidnight,
  solarTermAt,
  solarTermForLocalDay,
} from './solar-term'

describe('solarTermAt', () => {
  it('switches from 大寒 to 立春 around the 2026 立春 instant (Feb 3 20:02 UTC)', () => {
    expect(solarTermAt(new Date(Date.UTC(2026, 1, 3, 19, 0)))).toBe(23)
    expect(solarTermAt(new Date(Date.UTC(2026, 1, 3, 21, 0)))).toBe(0)
  })

  it('switches from 大雪 to 冬至 around the 2026 冬至 instant (Dec 21 20:50 UTC)', () => {
    expect(solarTermAt(new Date(Date.UTC(2026, 11, 21, 19, 30)))).toBe(20)
    expect(solarTermAt(new Date(Date.UTC(2026, 11, 21, 22, 0)))).toBe(21)
  })

  it('places mid-October 2026 in 寒露', () => {
    expect(solarTermAt(new Date(Date.UTC(2026, 9, 17, 12)))).toBe(16)
  })
})

describe('solarTermForLocalDay', () => {
  it('counts a term from the local day its instant falls on', () => {
    const dayBefore = new Date(2026, 9, 6, 9)
    const sameDay = new Date(2026, 9, 17, 0, 5)
    expect(solarTermForLocalDay(dayBefore)).toBe(15)
    expect(solarTermForLocalDay(sameDay)).toBe(16)
  })
})

describe('msUntilNextLocalMidnight', () => {
  it('returns the time left until the next local midnight', () => {
    const now = new Date(2026, 9, 17, 23, 59, 30)
    expect(msUntilNextLocalMidnight(now)).toBe(30_000)
  })
})
