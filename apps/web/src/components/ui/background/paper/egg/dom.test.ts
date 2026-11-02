import { describe, expect, it, vi } from 'vitest'

import { isFocusBusy, preservePageState, swallowExitKey } from './dom'

vi.mock('~/components/layout/bgm/engine', () => ({
  bgmEngine: { getState: () => ({ enabled: false }) },
}))

describe('page state around the egg', () => {
  it('puts scroll and focus back on restore', () => {
    const scrollTo = vi.fn()
    const focus = vi.fn()
    const win = { scrollX: 0, scrollY: 600, scrollTo }
    const doc = { activeElement: { focus } as unknown as Element }
    const restore = preservePageState(win, doc)
    win.scrollY = 1400
    restore()
    expect(scrollTo).toHaveBeenCalledWith(0, 600)
    expect(focus).toHaveBeenCalledWith({ preventScroll: true })
  })

  it('swallows the exit key so it cannot scroll the hidden page', () => {
    const e = { preventDefault: vi.fn(), stopPropagation: vi.fn() }
    const leave = vi.fn()
    swallowExitKey(e, leave)
    expect(e.preventDefault).toHaveBeenCalled()
    expect(e.stopPropagation).toHaveBeenCalled()
    expect(leave).toHaveBeenCalled()
  })

  it('treats a focused embed or text field as busy', () => {
    expect(isFocusBusy({ tagName: 'IFRAME' })).toBe(true)
    expect(isFocusBusy({ tagName: 'TEXTAREA' })).toBe(true)
    expect(isFocusBusy({ tagName: 'DIV', isContentEditable: true })).toBe(true)
    expect(isFocusBusy({ tagName: 'BODY' })).toBe(false)
    expect(isFocusBusy(null)).toBe(false)
  })
})
