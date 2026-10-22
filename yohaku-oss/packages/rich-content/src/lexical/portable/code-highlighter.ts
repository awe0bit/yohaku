import type { Lang, ThemedToken } from '@pierre/highlights'
import { codeToTokens, isSupportedLanguage } from '@pierre/highlights'
import githubDark from '@pierre/highlights/themes/github-dark'
import githubLight from '@pierre/highlights/themes/github-light'

import type { CodeLineDecoration, CodeNotation } from './code-notation'

const themes = { light: githubLight, dark: githubDark }
const fallbackLanguages: Record<string, Lang> = {
  ini: 'toml',
  properties: 'toml',
}

export function resolveLanguage(language: string | undefined): Lang | null {
  if (!language) return null
  const id = language.toLowerCase()
  const lang = fallbackLanguages[id] ?? id
  return isSupportedLanguage(lang) ? lang : null
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function styleOf(token: ThemedToken): string {
  return Object.entries(token.htmlStyle ?? {})
    .map(([property, value]) => `${property}:${value}`)
    .join(';')
}

function renderToken(token: ThemedToken, content: string, className = '') {
  const style = styleOf(token)
  const attrs = [
    className && `class="${className}"`,
    style && `style="${escapeHtml(style).replaceAll('"', '&quot;')}"`,
  ].filter(Boolean)
  return `<span${attrs.length ? ` ${attrs.join(' ')}` : ''}>${escapeHtml(content)}</span>`
}

function wordRanges(text: string, words: string[]): boolean[] {
  const marked = Array.from({ length: text.length }, () => false)
  for (const word of words) {
    if (!word) continue
    for (let at = text.indexOf(word); at !== -1; at = text.indexOf(word, at + 1)) {
      marked.fill(true, at, at + word.length)
    }
  }
  return marked
}

function renderLine(tokens: ThemedToken[], decoration?: CodeLineDecoration) {
  const classes = ['line', ...(decoration?.classes ?? [])].join(' ')
  const words = decoration?.words ?? []
  let inner: string

  if (words.length === 0) {
    inner = tokens.map((token) => renderToken(token, token.content)).join('')
  } else {
    const marked = wordRanges(tokens.map((t) => t.content).join(''), words)
    let offset = 0
    inner = tokens
      .map((token) => {
        const parts: string[] = []
        let start = 0
        for (let i = 1; i <= token.content.length; i++) {
          const boundary =
            i === token.content.length ||
            marked[offset + i] !== marked[offset + start]
          if (!boundary) continue
          parts.push(
            renderToken(
              token,
              token.content.slice(start, i),
              marked[offset + start] ? 'highlighted-word' : '',
            ),
          )
          start = i
        }
        offset += token.content.length
        return parts.join('')
      })
      .join('')
  }

  return `<span class="${classes}">${inner}</span>`
}

export function highlightToHtml(
  code: string,
  language?: string,
  notation?: Pick<CodeNotation, 'lines' | 'preClasses'>,
): string {
  const { tokens, fg, bg } = codeToTokens(code, {
    lang: resolveLanguage(language) ?? 'text',
    themes,
  })
  const preClass = ['highlights', ...(notation?.preClasses ?? [])].join(' ')
  const lines = tokens.map((line, i) => renderLine(line, notation?.lines[i]))
  return `<pre class="${preClass}" style="background-color:${bg};color:${fg}"><code>${lines.join('\n')}</code></pre>`
}
