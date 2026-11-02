import { describe, expect, it } from 'vitest'

import { viewportSize } from './capture'

describe('viewportSize', () => {
  it('measures the layout viewport without the scrollbar', () => {
    const doc = { documentElement: { clientWidth: 1269, clientHeight: 800 } }
    expect(viewportSize(doc)).toEqual({ width: 1269, height: 800 })
  })
})
