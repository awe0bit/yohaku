'use client'

import { useState } from 'react'

import { CodeLanguageMark, CodeShell } from './code-shell'
import { useHighlightedCode } from './use-highlighted-code'

export interface CodeSnippetFile {
  code: string
  filename: string
  language?: string
}

export function YohakuCodeSnippet({ files }: { files: CodeSnippetFile[] }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const active = files[activeIndex] ?? files[0]
  const { code, html } = useHighlightedCode(
    active?.code ?? '',
    active?.language,
  )

  if (!active) return null

  const tabs = (
    <div className="yohaku-code__tabs">
      {files.map((file, index) => (
        <button
          className={
            index === activeIndex
              ? 'yohaku-code__tab yohaku-code__tab--active'
              : 'yohaku-code__tab'
          }
          key={file.filename}
          type="button"
          onClick={() => setActiveIndex(index)}
        >
          <CodeLanguageMark language={file.language} />
          {file.filename}
        </button>
      ))}
    </div>
  )

  return (
    <CodeShell
      code={code}
      footerName={active.filename}
      header={tabs}
      language={active.language}
    >
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
