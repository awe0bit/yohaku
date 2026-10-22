export interface CodeLineDecoration {
  classes: string[]
  words: string[]
}

export interface CodeNotation {
  code: string
  lines: CodeLineDecoration[]
  preClasses: string[]
}

interface LineRecord extends CodeLineDecoration {
  removed: boolean
  text: string
}

interface TrailingComment {
  body: string
  close: string
  open: string
  start: number
}

const LINE_NOTATIONS: Record<string, { line: string; pre: string }> = {
  '++': { line: 'diff add', pre: 'has-diff' },
  '--': { line: 'diff remove', pre: 'has-diff' },
  highlight: { line: 'highlighted', pre: 'has-highlighted' },
  hl: { line: 'highlighted', pre: 'has-highlighted' },
}

const RE_LINE_NOTATION = /#?\s*\[!code (\+\+|--|highlight|hl)(:\d+)?\]/gi
const RE_WORD_NOTATION = /\s*\[!code word:((?:\\.|[^:\]])+)(:\d+)?\]/
const RE_NOTATION_START = /\[!code\b/i
const RE_COMMENT_OPEN = /\{\s*\/\*|<!--|\/\*|\/\/|(?<=^|\s)(?:#|--|;{1,2}|%{1,2})/g
const RE_END_COMMENT_PREFIX = /(?:\/\/|#|;{1,2}|%{1,2}|--)(\s*)$/
const RE_META_LINES = /\{([\d,-]+)\}/
const RE_UNESCAPE = /\\(.)/g

const BLOCK_CLOSERS: Record<string, RegExp> = {
  '/*': /^(.*?)(\*\/)\s*$/,
  '{/*': /^(.*?)(\*\/\s*\})\s*$/,
  '<!--': /^(.*?)(-->)\s*$/,
}

function findTrailingComment(line: string): TrailingComment | null {
  const notationAt = line.search(RE_NOTATION_START)
  if (notationAt === -1) return null

  let opener: RegExpExecArray | null = null
  for (const match of line.slice(0, notationAt).matchAll(RE_COMMENT_OPEN)) {
    opener = match
  }
  if (!opener) return null

  const open = opener[0]
  const rest = line.slice(opener.index + open.length)
  const blockKey = open.startsWith('{') ? '{/*' : open
  const closer = BLOCK_CLOSERS[blockKey]
  if (closer) {
    const closed = closer.exec(rest)
    if (!closed) return null
    return { start: opener.index, open, body: closed[1], close: closed[2] }
  }
  return { start: opener.index, open, body: rest, close: '' }
}

function parseMetaLines(meta: string | undefined): number[] {
  const match = meta?.match(RE_META_LINES)
  if (!match) return []
  return match[1].split(',').flatMap((part) => {
    const [from, to] = part.split('-').map((n) => Number.parseInt(n, 10))
    if (to === undefined) return [from]
    return Array.from({ length: to - from + 1 }, (_, i) => from + i)
  })
}

function applyComment(
  records: LineRecord[],
  index: number,
  preClasses: Set<string>,
) {
  const record = records[index]
  const comment = findTrailingComment(record.text)
  if (!comment) return

  const marks: Array<{ kind: string; span?: number; word?: string }> = []
  let body = comment.body.replaceAll(
    RE_LINE_NOTATION,
    (_, kind: string, range?: string) => {
      marks.push({
        kind: kind.toLowerCase(),
        span: range ? Number.parseInt(range.slice(1), 10) : 1,
      })
      return ''
    },
  )
  body = body.replace(RE_WORD_NOTATION, (_, word: string, range?: string) => {
    marks.push({
      kind: 'word',
      span: range ? Number.parseInt(range.slice(1), 10) : undefined,
      word: word.replaceAll(RE_UNESCAPE, '$1'),
    })
    return ''
  })
  if (marks.length === 0) return

  const before = record.text.slice(0, comment.start)
  const standalone = before.trim() === '' && body.trim() === ''
  const target = standalone ? index + 1 : index

  for (const mark of marks) {
    const span = mark.span ?? records.length - target
    const end = Math.min(target + span, records.length)
    for (let i = target; i < end; i++) {
      if (mark.word) {
        records[i].words.push(mark.word)
      } else {
        records[i].classes.push(LINE_NOTATIONS[mark.kind].line)
      }
    }
    if (!mark.word) preClasses.add(LINE_NOTATIONS[mark.kind].pre)
  }

  const prefix = body.match(RE_END_COMMENT_PREFIX)
  if (prefix && prefix[1].trim() === '') {
    body = body.slice(0, prefix.index).trimEnd()
  }

  if (standalone) {
    record.removed = true
  } else if (body.trim() === '') {
    record.text = before.trimEnd()
  } else {
    record.text = `${before}${comment.open}${body}${comment.close}`.trimEnd()
  }
}

export function parseCodeNotation(code: string, meta?: string): CodeNotation {
  const records: LineRecord[] = code
    .split('\n')
    .map((text) => ({ text, classes: [], words: [], removed: false }))
  const preClasses = new Set<string>()

  for (const line of parseMetaLines(meta)) {
    records[line - 1]?.classes.push('highlighted')
  }
  for (let i = 0; i < records.length; i++) {
    applyComment(records, i, preClasses)
  }

  const kept = records.filter((record) => !record.removed)
  return {
    code: kept.map((record) => record.text).join('\n'),
    lines: kept.map(({ classes, words }) => ({
      classes: [...new Set(classes.flatMap((c) => c.split(' ')))],
      words,
    })),
    preClasses: [...preClasses],
  }
}
