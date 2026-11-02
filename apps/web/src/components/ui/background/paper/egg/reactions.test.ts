import { describe, expect, it } from 'vitest'

import {
  colorsOf,
  drawTypeOf,
  FALL_CAP,
  isFireflyTerm,
  LOOSE,
  nextStage,
  PETAL_OF,
  pickSinking,
} from './reactions'

describe('seasonal reactions', () => {
  it('walks a maple leaf one solar step at a time to dry', () => {
    expect(nextStage('maple:green')).toBe('maple:turning')
    expect(nextStage('maple:turning')).toBe('maple:red')
    expect(nextStage('maple:red')).toBe('maple:dry')
    expect(nextStage('maple:dry')).toBeNull()
  })

  it('walks ginkgo from turning to fallen', () => {
    expect(nextStage('ginkgo:turning')).toBe('ginkgo')
    expect(nextStage('ginkgo')).toBe('ginkgo:fallen')
    expect(nextStage('sakura')).toBeNull()
  })

  it('draws a dry maple with the red shape and its own browns', () => {
    expect(drawTypeOf('maple:dry')).toBe('maple:red')
    expect(colorsOf('maple:dry').length).toBeGreaterThan(0)
    expect(colorsOf('sakura')).toContain('#f1c6cf')
  })

  it('sheds petals only from flowers, and petals are loose', () => {
    expect(PETAL_OF.sakura).toBe('petal')
    expect(PETAL_OF.ume).toBe('roundPetal')
    expect(PETAL_OF['maple:red']).toBeUndefined()
    expect(LOOSE.has('petal')).toBe(true)
    expect(LOOSE.has('sakura')).toBe(false)
  })

  it('calls fireflies only in 夏至, 小暑 and 大暑', () => {
    expect([8, 9, 10, 11, 12].map(isFireflyTerm)).toEqual([
      false,
      true,
      true,
      true,
      false,
    ])
  })
})

describe('pickSinking', () => {
  const leaf = (born: number, extra = {}) => ({
    born,
    sinkAfter: born + 50_000,
    home: false,
    falling: false,
    sinkT: 0,
    ...extra,
  })

  it('sinks the oldest floaters beyond the cap', () => {
    const floating = Array.from({ length: FALL_CAP + 2 }, (_, i) =>
      leaf(1000 - i),
    )
    const sunk = pickSinking(floating, 2000)
    expect(sunk.map((s) => s.born)).toEqual([
      1000 - FALL_CAP - 1,
      1000 - FALL_CAP,
    ])
  })

  it('sinks a floater whose time is up', () => {
    const old = leaf(0)
    expect(pickSinking([old, leaf(40_000)], 60_000)).toEqual([old])
  })

  it('never sinks home sprites, falling ones or ones already sinking', () => {
    const items = [
      leaf(0, { home: true }),
      leaf(0, { falling: true }),
      leaf(0, { sinkT: 5 }),
    ]
    expect(pickSinking(items, 999_999)).toEqual([])
  })
})
