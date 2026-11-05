import { afterEach, describe, expect, it, vi } from 'vitest'

import { fadeFloating } from './float'

const el = (name: string, style: Record<string, string> = {}) =>
  ({
    name,
    style: { opacity: '', pointerEvents: '', transition: '', ...style },
  }) as unknown as HTMLElement & { name: string }

const host = (children: HTMLElement[]) => {
  let push: ((added: HTMLElement[]) => void) | null = null
  const stop = vi.fn()
  return {
    children,
    observe: (cb: (added: HTMLElement[]) => void) => {
      push = cb
      return stop
    },
    add: (added: HTMLElement[]) => push?.(added),
    stop,
  }
}

describe('fadeFloating', () => {
  afterEach(() => vi.useRealTimers())

  it('fades every child that is not kept', () => {
    const fab = el('fab')
    const root = el('root')
    const h = host([fab, root])
    fadeFloating(h, (e) => e === root)
    expect(fab.style.opacity).toBe('0')
    expect(fab.style.pointerEvents).toBe('none')
    expect(fab.style.transition).toContain('opacity 600ms')
    expect(root.style).toEqual({
      opacity: '',
      pointerEvents: '',
      transition: '',
    })
  })

  it('fades portals that mount during the egg', () => {
    const h = host([])
    fadeFloating(h, () => false)
    const toast = el('toast')
    h.add([toast])
    expect(toast.style.opacity).toBe('0')
  })

  it('restores the original inline styles and stops observing', () => {
    vi.useFakeTimers()
    const fab = el('fab', {
      opacity: '0.8',
      pointerEvents: 'auto',
      transition: 'transform 1s',
    })
    const h = host([fab])
    const fade = fadeFloating(h, () => false)
    fade.restore()
    expect(fab.style.opacity).toBe('0.8')
    expect(fab.style.pointerEvents).toBe('auto')
    expect(h.stop).toHaveBeenCalledOnce()
    vi.advanceTimersByTime(600)
    expect(fab.style.transition).toBe('transform 1s')
  })
})
