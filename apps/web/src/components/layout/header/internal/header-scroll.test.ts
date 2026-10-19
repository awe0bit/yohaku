import { describe, expect, it } from 'vitest'

import type { HeaderScrollState } from './header-scroll'
import { resolveTopFade, stepHeaderScroll } from './header-scroll'

const at = (
  phase: HeaderScrollState['phase'],
  y: number,
): HeaderScrollState => ({ phase, anchorY: y, lastY: y })

const scrollThrough = (state: HeaderScrollState, ys: number[]) =>
  ys.reduce(stepHeaderScroll, state)

describe('stepHeaderScroll', () => {
  it('stays on the top layout above the reveal threshold', () => {
    expect(stepHeaderScroll(at('strip', 200), 120).phase).toBe('top')
  })

  it('hides once the page scrolls down past the threshold', () => {
    expect(stepHeaderScroll(at('top', 380), 400).phase).toBe('hidden')
  })

  it('shows the strip when scrolling up past the threshold', () => {
    expect(stepHeaderScroll(at('hidden', 620), 600).phase).toBe('strip')
  })

  it('hides the strip again when scrolling down', () => {
    expect(stepHeaderScroll(at('strip', 620), 640).phase).toBe('hidden')
  })

  it('ignores jitter within 3px', () => {
    expect(stepHeaderScroll(at('strip', 600), 602).phase).toBe('strip')
    expect(stepHeaderScroll(at('hidden', 600), 598).phase).toBe('hidden')
  })

  it('leaves the top layout for hidden on small moves past the threshold', () => {
    expect(stepHeaderScroll(at('top', 180), 181).phase).toBe('hidden')
  })

  it('accumulates slow upward scrolling until it reveals the strip', () => {
    expect(
      scrollThrough(at('hidden', 600), [599, 598, 597, 596, 595]).phase,
    ).toBe('strip')
  })

  it('accumulates slow downward scrolling until it hides the strip', () => {
    expect(
      scrollThrough(at('strip', 600), [601, 602, 603, 604, 605]).phase,
    ).toBe('hidden')
  })

  it('restarts the distance when the direction flips', () => {
    expect(
      scrollThrough(at('hidden', 600), [598, 597, 599, 601, 600, 599]).phase,
    ).toBe('hidden')
  })
})

describe('resolveTopFade', () => {
  it('is fully visible near the top', () => {
    expect(resolveTopFade(0)).toEqual({ opacity: 1, shift: 0, visible: true })
    expect(resolveTopFade(40).opacity).toBe(1)
  })

  it('fades out by 150px', () => {
    expect(resolveTopFade(150).opacity).toBe(0)
    expect(resolveTopFade(400).opacity).toBe(0)
  })

  it('stops being interactive once nearly transparent', () => {
    expect(resolveTopFade(100).visible).toBe(true)
    expect(resolveTopFade(148).visible).toBe(false)
  })

  it('drifts up at most 6px', () => {
    expect(resolveTopFade(75).shift).toBeCloseTo(-3)
    expect(resolveTopFade(1000).shift).toBeCloseTo(-6)
  })
})
