import { describe, expect, it } from 'vitest'

import { supportsDrawable } from './html-in-canvas'

describe('supportsDrawable', () => {
  it('is true only when the 2D context can draw elements', () => {
    expect(supportsDrawable({ drawElementImage() {} })).toBe(true)
    expect(supportsDrawable({})).toBe(false)
    expect(supportsDrawable(undefined)).toBe(false)
  })
})
