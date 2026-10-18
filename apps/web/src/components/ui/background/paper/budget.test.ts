import { describe, expect, it } from 'vitest'

import { textureScale } from './budget'

describe('textureScale', () => {
  it('keeps 1 css px per texel on an ordinary laptop viewport', () => {
    expect(textureScale(1440, 900)).toBe(1)
  })

  it('shrinks large viewports to stay within the pixel budget', () => {
    const scale = textureScale(3840, 2160)
    expect(3840 * scale * 2160 * scale).toBeLessThanOrEqual(2_200_000)
    expect(3840 * scale).toBeLessThanOrEqual(2048)
  })
})
