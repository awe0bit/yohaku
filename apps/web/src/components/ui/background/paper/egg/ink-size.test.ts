import { describe, expect, it } from 'vitest'

import { inkScale, sourceRect } from './ink-size'

describe('inkScale', () => {
  it('follows the screen up to 2x and never drops below 1x', () => {
    expect(inkScale(2)).toBe(2)
    expect(inkScale(3)).toBe(2)
    expect(inkScale(1.5)).toBe(1.5)
    expect(inkScale(1)).toBe(1)
    expect(inkScale(0)).toBe(1)
  })
})

describe('sourceRect', () => {
  const viewport = { width: 1280, height: 800 }

  it('takes the viewport slice of a scrolled root', () => {
    expect(sourceRect(-1500, 9000, viewport, 2)).toEqual({
      sx: 0,
      sy: 1500,
      swidth: 1280,
      sheight: 800,
      width: 2560,
      height: 1600,
    })
  })

  it('starts at the top when the root is not scrolled', () => {
    expect(sourceRect(0, 9000, viewport, 1).sy).toBe(0)
    expect(sourceRect(24, 9000, viewport, 1).sy).toBe(0)
  })

  it('never reads past the bottom of a short root', () => {
    expect(sourceRect(0, 600, viewport, 2)).toEqual({
      sx: 0,
      sy: 0,
      swidth: 1280,
      sheight: 600,
      width: 2560,
      height: 1200,
    })
    const tail = sourceRect(-1500, 2000, viewport, 1)
    expect(tail.sy).toBe(1500)
    expect(tail.sheight).toBe(500)
    expect(tail.height).toBe(500)
  })
})
