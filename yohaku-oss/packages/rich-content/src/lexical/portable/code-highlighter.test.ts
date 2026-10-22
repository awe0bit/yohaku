import { describe, expect, it } from 'vitest'

import { highlightToHtml, resolveLanguage } from './code-highlighter'
import { parseCodeNotation } from './code-notation'

describe('resolveLanguage', () => {
  it.each([
    ['ts', 'ts'],
    ['py', 'py'],
    ['bash', 'bash'],
    ['c++', 'c++'],
    ['c#', 'c#'],
    ['objc', 'objc'],
    ['dockerfile', 'dockerfile'],
  ])('accepts the %s fence tag', (tag, expected) => {
    expect(resolveLanguage(tag)).toBe(expected)
  })

  it.each(['ini', 'properties', 'INI'])(
    'borrows the toml lexer for %s',
    (tag) => {
      expect(resolveLanguage(tag)).toBe('toml')
    },
  )

  it('is case-insensitive', () => {
    expect(resolveLanguage('TS')).toBe('ts')
    expect(resolveLanguage('Bash')).toBe('bash')
  })

  it('returns null for unsupported and empty tags', () => {
    expect(resolveLanguage('brainfuck')).toBeNull()
    expect(resolveLanguage(undefined)).toBeNull()
    expect(resolveLanguage('')).toBeNull()
  })
})

describe('highlightToHtml', () => {
  it('colors tokens for both themes', () => {
    const html = highlightToHtml('const a = 1', 'ts')
    expect(html).toMatch(/^<pre class="highlights" style="background-color:/)
    expect(html).toContain('--hls-dark:')
    expect(html).toContain('<span class="line">')
  })

  it('escapes markup and falls back to plain text for unknown languages', () => {
    const html = highlightToHtml('<b>x</b>', 'brainfuck')
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;')
    expect(html).not.toContain('<b>')
  })

  it('renders notation classes on lines and the pre', () => {
    const notation = parseCodeNotation('a // [!code ++]\nb')
    const html = highlightToHtml(notation.code, 'ts', notation)
    expect(html).toMatch(/^<pre class="highlights has-diff"/)
    expect(html).toContain('<span class="line diff add">')
    expect(html).not.toContain('[!code')
  })

  it('wraps highlighted words across token boundaries', () => {
    const notation = parseCodeNotation('// [!code word:= 1]\nconst a = 1')
    const html = highlightToHtml(notation.code, 'ts', notation)
    const words = [...html.matchAll(/class="highlighted-word"[^>]*>([^<]*)</g)]
    expect(words.map((m) => m[1]).join('')).toBe('= 1')
  })
})
