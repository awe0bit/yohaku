import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  announcePaperArrival,
  backLayerRole,
  paperEntranceMode,
  waitForPaperArrival,
} from './paper-swap'

describe('paperEntranceMode', () => {
  it('skips before hydration ends', () => {
    expect(paperEntranceMode({ hydrated: false, transition: null })).toBe(
      'skip',
    )
  })

  it('plays when no paper transition is running', () => {
    expect(paperEntranceMode({ hydrated: true, transition: null })).toBe('play')
  })

  it('waits for the view transition to be ready when shuffling forward', () => {
    expect(
      paperEntranceMode({ hydrated: true, transition: { mode: 'next' } }),
    ).toBe('await-ready')
  })

  it.each(['prev', 'peek', 'swap'] as const)(
    'leaves the arrival to the view transition during %s',
    (mode) => {
      expect(paperEntranceMode({ hydrated: true, transition: { mode } })).toBe(
        'skip',
      )
    },
  )
})

describe('waitForPaperArrival', () => {
  const previous = {} as HTMLElement
  const next = {} as HTMLElement

  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('navigates and resolves once a different paper mounts', async () => {
    const navigate = vi.fn()
    const arrival = waitForPaperArrival(previous, navigate, 600)
    expect(navigate).toHaveBeenCalledOnce()

    announcePaperArrival(next)
    await vi.advanceTimersByTimeAsync(0)

    await expect(arrival).resolves.toBe('mounted')
  })

  it('ignores the paper that was already on screen', async () => {
    const arrival = waitForPaperArrival(previous, () => {}, 600)

    announcePaperArrival(previous)
    await vi.advanceTimersByTimeAsync(600)

    await expect(arrival).resolves.toBe('timeout')
  })

  it('stops listening after it settles', async () => {
    const arrival = waitForPaperArrival(previous, () => {}, 600)
    await vi.advanceTimersByTimeAsync(600)
    await arrival

    const later = waitForPaperArrival(previous, () => {}, 600)
    announcePaperArrival(next)
    await vi.advanceTimersByTimeAsync(0)

    await expect(later).resolves.toBe('mounted')
  })
})

describe('backLayerRole', () => {
  it('treats the last backing layer as the sheet right under the front', () => {
    expect(backLayerRole(1, 2)).toBe('near')
    expect(backLayerRole(0, 1)).toBe('near')
  })

  it('treats earlier backing layers as deeper sheets', () => {
    expect(backLayerRole(0, 2)).toBe('deep')
  })
})
