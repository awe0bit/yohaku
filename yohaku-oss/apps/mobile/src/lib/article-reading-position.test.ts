import { describe, expect, it } from 'vitest'

import {
  activeHeadingIndex,
  estimateReadingMinutes,
  readingMinutesLeft,
  readingProgress,
} from './article-reading-position'

describe('activeHeadingIndex', () => {
  const offsets = [400, 1200, null, 2600]

  it('is -1 before the first heading reaches the reading line', () => {
    expect(activeHeadingIndex(offsets, 0, 800)).toBe(-1)
  })

  it('picks the last heading at or above the reading line', () => {
    expect(activeHeadingIndex(offsets, 1150, 800)).toBe(1)
  })

  it('skips headings whose offsets are not measured yet', () => {
    expect(activeHeadingIndex(offsets, 2000, 800)).toBe(1)
  })

  it('lands on the heading a TOC jump scrolled to', () => {
    const jumpY = 2600 + 30 / 2 - 800 * 0.12
    expect(activeHeadingIndex(offsets, jumpY, 800)).toBe(3)
  })
})

describe('readingProgress', () => {
  it('is the scrolled share of the scrollable height', () => {
    expect(
      readingProgress({ contentHeight: 3000, viewportHeight: 1000, y: 500 }),
    ).toBe(0.25)
  })

  it('clamps overscroll at both ends', () => {
    expect(
      readingProgress({ contentHeight: 3000, viewportHeight: 1000, y: -80 }),
    ).toBe(0)
    expect(
      readingProgress({ contentHeight: 3000, viewportHeight: 1000, y: 2400 }),
    ).toBe(1)
  })

  it('is unread before the content is measured', () => {
    expect(
      readingProgress({ contentHeight: 0, viewportHeight: 0, y: 0 }),
    ).toBe(0)
  })

  it('treats content shorter than the viewport as read', () => {
    expect(
      readingProgress({ contentHeight: 600, viewportHeight: 1000, y: 0 }),
    ).toBe(1)
  })
})

describe('reading minutes', () => {
  it('estimates at least one minute', () => {
    expect(estimateReadingMinutes(0)).toBe(1)
    expect(estimateReadingMinutes(3000)).toBe(6)
  })

  it('rounds the remaining time up', () => {
    expect(readingMinutesLeft(6, 0.38)).toBe(4)
    expect(readingMinutesLeft(6, 1)).toBe(0)
  })
})
