import type { AggregateTop } from '@mx-space/api-client'
import { describe, expect, it } from 'vitest'

import { fillPlaceholderRows, mergeAndSortTopEntries } from './rows'

describe('fillPlaceholderRows', () => {
  it('pads short lists with null placeholders', () => {
    expect(fillPlaceholderRows(['a', 'b'], 5)).toEqual([
      'a',
      'b',
      null,
      null,
      null,
    ])
  })

  it('renders all placeholders while loading', () => {
    expect(fillPlaceholderRows(undefined, 3)).toEqual([null, null, null])
  })

  it('caps long lists at the row count', () => {
    expect(fillPlaceholderRows([1, 2, 3, 4, 5, 6], 5)).toEqual([1, 2, 3, 4, 5])
  })
})

describe('mergeAndSortTopEntries', () => {
  const top = {
    posts: [
      {
        id: 'p1',
        title: 'Post 1',
        createdAt: '2026-10-09T00:00:00Z',
        slug: 'p1',
        category: { slug: 'tech' },
      },
    ],
    notes: [
      { id: 'n1', nid: 11, title: 'Note 1', createdAt: '2026-10-17T00:00:00Z' },
      { id: 'n2', nid: 12, title: 'Note 2', createdAt: '2026-10-01T00:00:00Z' },
    ],
  } as unknown as AggregateTop

  it('merges posts and notes newest first', () => {
    expect(mergeAndSortTopEntries(top).map((entry) => entry.id)).toEqual([
      'n1',
      'p1',
      'n2',
    ])
  })

  it('keeps at most five entries', () => {
    const many = {
      posts: [],
      notes: Array.from({ length: 8 }, (_, i) => ({
        id: `n${i}`,
        nid: i,
        title: `Note ${i}`,
        createdAt: `2026-10-${String(10 + i).padStart(2, '0')}T00:00:00Z`,
      })),
    } as unknown as AggregateTop
    expect(mergeAndSortTopEntries(many)).toHaveLength(5)
  })
})
