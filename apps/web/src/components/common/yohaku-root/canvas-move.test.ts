import { describe, expect, it, vi } from 'vitest'

import { moveIntoCanvas } from './canvas-move'

const parts = (animations: unknown[]) => {
  const target = { contains: () => true }
  const frame = {
    offsetHeight: 2400,
    style: { height: '' },
    setAttribute: vi.fn(),
    removeAttribute: vi.fn(),
    insertBefore: vi.fn(),
  }
  const canvas = { append: vi.fn(), onpaint: null as unknown }
  const slot = {}
  return {
    frame,
    canvas,
    slot,
    target,
    animations: () => animations as Animation[],
  }
}

describe('moveIntoCanvas', () => {
  it('moves the slot in and freezes animations', () => {
    const pause = vi.fn()
    const p = parts([
      { animationName: 'spin', currentTime: 10, effect: { target: {} }, pause },
    ])
    const ok = moveIntoCanvas(p as never, vi.fn())
    expect(ok).toBe(true)
    expect(p.frame.style.height).toBe('2400px')
    expect(p.canvas.append).toHaveBeenCalledWith(p.slot)
    expect(typeof p.canvas.onpaint).toBe('function')
    expect(pause).toHaveBeenCalled()
  })

  it('puts the page back when freezing throws', () => {
    const p = parts([
      {
        animationName: 'spin',
        currentTime: 10,
        effect: { target: {} },
        pause: () => {
          throw new TypeError('progress-based')
        },
      },
    ])
    const ok = moveIntoCanvas(p as never, vi.fn())
    expect(ok).toBe(false)
    expect(p.frame.insertBefore).toHaveBeenCalledWith(p.slot, p.canvas)
    expect(p.frame.removeAttribute).toHaveBeenCalledWith('data-drawn')
    expect(p.frame.style.height).toBe('')
    expect(p.canvas.onpaint).toBeNull()
  })
})
