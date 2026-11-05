import { describe, expect, it, vi } from 'vitest'

import { recordAnimations, restoreAnimations } from './freeze'

const node = (parent?: object) => {
  const self = {
    parent,
    contains(other: { parent?: object } | null): boolean {
      for (let n: any = other; n; n = n.parent) if (n === self) return true
      return false
    },
  }
  return self
}

const anim = (
  target: object,
  name: string,
  time: number,
  pseudoElement: string | null = null,
) => ({
  animationName: name,
  currentTime: time as number | null,
  effect: { target, pseudoElement },
  pause: vi.fn(),
})

describe('animation freeze', () => {
  const root = node()
  const inside = node(root)
  const outside = node()

  it('records css animations inside the scope, pseudo-elements included', () => {
    const list = [
      anim(inside, 'spin', 3349),
      anim(outside, 'spin', 10),
      anim(inside, 'glow', 20, '::before'),
      { currentTime: 5, effect: { target: inside, pseudoElement: null } },
    ]
    expect(recordAnimations(list as never, root as never)).toEqual([
      { target: inside, pseudo: null, name: 'spin', time: 3349 },
      { target: inside, pseudo: '::before', name: 'glow', time: 20 },
    ])
  })

  it('puts the recorded time back on the re-created animation and pauses it', () => {
    const saved = [{ target: inside, pseudo: null, name: 'spin', time: 3349 }]
    const fresh = anim(inside, 'spin', 0)
    const stranger = anim(outside, 'spin', 0)
    restoreAnimations(
      [fresh, stranger] as never,
      root as never,
      saved as never,
      true,
    )
    expect(fresh.currentTime).toBe(3349)
    expect(fresh.pause).toHaveBeenCalledOnce()
    expect(stranger.currentTime).toBe(0)
    expect(stranger.pause).not.toHaveBeenCalled()
  })

  it('leaves the animation running when not asked to pause', () => {
    const saved = [{ target: inside, pseudo: null, name: 'spin', time: 1200 }]
    const fresh = anim(inside, 'spin', 0)
    restoreAnimations([fresh] as never, root as never, saved as never, false)
    expect(fresh.currentTime).toBe(1200)
    expect(fresh.pause).not.toHaveBeenCalled()
  })

  it('pauses in-scope animations that have no recorded time', () => {
    const fresh = anim(inside, 'late', 0)
    restoreAnimations([fresh] as never, root as never, [], true)
    expect(fresh.currentTime).toBe(0)
    expect(fresh.pause).toHaveBeenCalledOnce()
  })

  it('finishes a completed entrance animation that restarted with no record', () => {
    const fresh = {
      ...anim(inside, 'fade-in', 0),
      finish: vi.fn(),
      effect: {
        target: inside,
        pseudoElement: null,
        getComputedTiming: () => ({ endTime: 300 }),
      },
    }
    restoreAnimations([fresh] as never, root as never, [], true)
    expect(fresh.finish).toHaveBeenCalledOnce()
    expect(fresh.pause).not.toHaveBeenCalled()
  })

  it('freezes pseudo-element animations by target and pseudo', () => {
    const before = anim(inside, 'glow', 900, '::before')
    const saved = recordAnimations([before] as never, root as never)
    expect(saved).toEqual([
      { target: inside, pseudo: '::before', name: 'glow', time: 900 },
    ])
    const fresh = anim(inside, 'glow', 0, '::before')
    const plain = anim(inside, 'glow', 0)
    restoreAnimations([fresh, plain] as never, root as never, saved, true)
    expect(fresh.currentTime).toBe(900)
    expect(plain.currentTime).toBe(0)
  })

  it('leaves progress-based animations alone', () => {
    const scroll = {
      ...anim(inside, 'hero-exit', 0),
      currentTime: { value: 40, unit: 'percent' },
    }
    expect(recordAnimations([scroll] as never, root as never)).toEqual([])
    expect(() =>
      restoreAnimations(
        [scroll] as never,
        root as never,
        [{ target: inside as never, pseudo: null, name: 'hero-exit', time: 3 }],
        true,
      ),
    ).not.toThrow()
    expect(scroll.pause).not.toHaveBeenCalled()
  })
})
