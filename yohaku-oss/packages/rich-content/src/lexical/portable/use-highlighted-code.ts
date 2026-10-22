'use client'

import { useEffect, useMemo, useState } from 'react'

import { parseCodeNotation } from './code-notation'

export function useHighlightedCode(
  source: string,
  language?: string,
  meta?: string,
): { code: string; html: string | null } {
  const notation = useMemo(
    () => parseCodeNotation(source ?? '', meta),
    [source, meta],
  )
  const [html, setHtml] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setHtml(null)
    import('./code-highlighter')
      .then(({ highlightToHtml }) => {
        if (!cancelled) {
          setHtml(highlightToHtml(notation.code, language, notation))
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [notation, language])

  return { code: notation.code, html }
}
