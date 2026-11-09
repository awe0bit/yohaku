import { describe, expect, it } from 'vitest'

import {
  DEEPEST_BACK_POSE,
  isLateStackArrival,
  stackShiftFrames,
} from './paper-stack-motion'

describe('stackShiftFrames', () => {
  it('fades the deepest sheet in from one layer further back', () => {
    expect(stackShiftFrames(['deep', 'near'])[0]).toEqual([
      { opacity: 0, transform: DEEPEST_BACK_POSE },
      { opacity: 1, transform: 'deep' },
    ])
  })

  it('moves every other sheet up from the pose one layer deeper', () => {
    expect(stackShiftFrames(['deep', 'near'])[1]).toEqual([
      { opacity: 1, transform: 'deep' },
      { opacity: 1, transform: 'near' },
    ])
  })
})

describe('isLateStackArrival', () => {
  it('is late when sheets appear after rendering without any', () => {
    expect(isLateStackArrival({ renderedEmpty: true, count: 2 })).toBe(true)
  })

  it('is not late when sheets were there from the first render', () => {
    expect(isLateStackArrival({ renderedEmpty: false, count: 2 })).toBe(false)
  })

  it('is not late while there are still no sheets', () => {
    expect(isLateStackArrival({ renderedEmpty: true, count: 0 })).toBe(false)
  })
})
