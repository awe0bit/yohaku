'use client'

import { CodeShell } from './code-shell'
import { useHighlightedCode } from './use-highlighted-code'

export function PortableCodeBlock({
  code: source,
  fold = true,
  language,
  meta,
}: {
  code: string
  fold?: boolean
  language?: string
  meta?: string
}) {
  const { code, html } = useHighlightedCode(source, language, meta)

  return (
    <CodeShell code={code} fold={fold} language={language}>
      {html ? (
        <div dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <pre>
          <code>{code}</code>
        </pre>
      )}
    </CodeShell>
  )
}
