import { describe, expect, it } from 'vitest'

import { parseCodeNotation } from './code-notation'

const classesOf = (code: string, meta?: string) =>
  parseCodeNotation(code, meta).lines.map((line) => line.classes)

describe('diff notation', () => {
  it('marks the line and strips the trailing comment', () => {
    const result = parseCodeNotation(
      'const a = 1 // [!code ++]\nconst b = 2 // [!code --]\nconst c = 3',
    )
    expect(result.code).toBe('const a = 1\nconst b = 2\nconst c = 3')
    expect(result.lines.map((l) => l.classes)).toEqual([
      ['diff', 'add'],
      ['diff', 'remove'],
      [],
    ])
    expect(result.preClasses).toEqual(['has-diff'])
  })

  it('keeps the rest of a comment that carries a notation', () => {
    const result = parseCodeNotation('run() // inject tags // [!code ++]')
    expect(result.code).toBe('run() // inject tags')
  })

  it('keeps comment text written before the notation', () => {
    expect(parseCodeNotation('run() // keep me [!code ++]').code).toBe(
      'run() // keep me',
    )
  })

  it('applies a comment-only line to the next line and drops it', () => {
    const result = parseCodeNotation('a\n  // [!code ++]\nb\nc')
    expect(result.code).toBe('a\nb\nc')
    expect(result.lines.map((l) => l.classes)).toEqual([
      [],
      ['diff', 'add'],
      [],
    ])
  })

  it('spans a range of lines', () => {
    expect(classesOf('a // [!code --:2]\nb\nc')).toEqual([
      ['diff', 'remove'],
      ['diff', 'remove'],
      [],
    ])
  })

  it.each([
    ['# [!code ++]', 'echo hi # [!code ++]', 'echo hi'],
    ['-- [!code ++]', 'select 1 -- [!code ++]', 'select 1'],
    ['/* */', 'color: red; /* [!code ++] */', 'color: red;'],
    ['<!-- -->', '<p>hi</p> <!-- [!code ++] -->', '<p>hi</p>'],
    ['{/* */}', '<Foo /> {/* [!code ++] */}', '<Foo />'],
  ])('reads %s comments', (_, input, output) => {
    const result = parseCodeNotation(input)
    expect(result.code).toBe(output)
    expect(result.lines[0].classes).toEqual(['diff', 'add'])
  })

  it('ignores # and -- glued to code', () => {
    expect(parseCodeNotation('x--[!code ++]').code).toBe('x--[!code ++]')
  })
})

describe('highlight notation', () => {
  it('accepts highlight and hl', () => {
    const result = parseCodeNotation('a // [!code highlight]\nb // [!code hl]')
    expect(result.code).toBe('a\nb')
    expect(result.lines.map((l) => l.classes)).toEqual([
      ['highlighted'],
      ['highlighted'],
    ])
    expect(result.preClasses).toEqual(['has-highlighted'])
  })
})

describe('word highlight notation', () => {
  it('highlights the word on every following line by default', () => {
    const result = parseCodeNotation('// [!code word:Hello]\nHello\nsay Hello')
    expect(result.code).toBe('Hello\nsay Hello')
    expect(result.lines.map((l) => l.words)).toEqual([['Hello'], ['Hello']])
    expect(result.preClasses).toEqual([])
  })

  it('limits the word to a range', () => {
    const result = parseCodeNotation('// [!code word:a:1]\na\na')
    expect(result.lines.map((l) => l.words)).toEqual([['a'], []])
  })

  it('unescapes the word', () => {
    const result = parseCodeNotation(String.raw`// [!code word:a\:b]` + '\na:b')
    expect(result.lines[0].words).toEqual(['a:b'])
  })
})

describe('meta highlight', () => {
  it('highlights {n} lines counted on the source before notation lines drop', () => {
    expect(classesOf('a\n// [!code ++]\nb\nc', '{1,3-4} filename="x.ts"')).toEqual([
      ['highlighted'],
      ['highlighted', 'diff', 'add'],
      ['highlighted'],
    ])
  })

  it('ignores meta without a line list', () => {
    expect(classesOf('a', 'filename="x.ts"')).toEqual([[]])
  })
})

it('leaves code without notations untouched', () => {
  const code = 'const url = "https://x.dev" // plain\n# heading'
  expect(parseCodeNotation(code)).toEqual({
    code,
    lines: [
      { classes: [], words: [] },
      { classes: [], words: [] },
    ],
    preClasses: [],
  })
})
