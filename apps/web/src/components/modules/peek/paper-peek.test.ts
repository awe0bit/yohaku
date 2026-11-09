import { describe, expect, it } from 'vitest'

import { loosePeekFrame } from './paper-peek'

describe('loosePeekFrame', () => {
  it('lines the sheet up with the note paper column', () => {
    expect(
      loosePeekFrame({ left: 300, width: 840 }, { height: 900 }),
    ).toMatchObject({ left: 300, width: 840 })
  })

  it('leaves room above for the header and below for the loose offset', () => {
    const frame = loosePeekFrame({ left: 300, width: 840 }, { height: 900 })
    expect(frame.top).toBe(64)
    expect(frame.height).toBe(900 - 64 - 52 - 32)
  })

  it('never collapses below a readable height', () => {
    expect(
      loosePeekFrame({ left: 0, width: 600 }, { height: 300 }).height,
    ).toBe(320)
  })
})
