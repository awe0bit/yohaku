import { describe, expect, it } from 'vitest'

import { resolveBgmScene } from './scene'

describe('resolveBgmScene', () => {
  it('treats article and note detail pages as reading', () => {
    expect(resolveBgmScene('/posts/hello', false)).toBe('reading')
    expect(resolveBgmScene('/notes/2026/01/01/hello', false)).toBe('reading')
    expect(resolveBgmScene('/thinking/hello', false)).toBe('reading')
    expect(resolveBgmScene('/en/posts/hello', false)).toBe('reading')
  })

  it('leaves index pages on the home scene', () => {
    expect(resolveBgmScene('/', false)).toBe('home')
    expect(resolveBgmScene('/posts', false)).toBe('home')
    expect(resolveBgmScene('/notes', false)).toBe('home')
  })

  it('uses the night scene in dark mode unless reading', () => {
    expect(resolveBgmScene('/', true)).toBe('night')
    expect(resolveBgmScene('/posts/hello', true)).toBe('reading')
  })
})
