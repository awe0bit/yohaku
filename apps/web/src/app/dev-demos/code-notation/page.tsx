'use client'

import { Markdown } from '~/components/ui/markdown/Markdown'
import { useIsClient } from '~/hooks/common/use-is-client'

import type { NotationCase, NotationGroup } from './_fixtures/cases'
import { notationCases } from './_fixtures/cases'

const GROUPS: { id: NotationGroup; label: string }[] = [
  { id: 'diff', label: 'notationDiff' },
  { id: 'highlight', label: 'notationHighlight' },
  { id: 'word', label: 'notationWordHighlight' },
  { id: 'meta', label: 'metaHighlight' },
  { id: 'syntax', label: 'Comment syntax & edges' },
]

function fence(item: NotationCase) {
  return `\`\`\`${item.lang}${item.meta ? ` ${item.meta}` : ''}\n${item.source}\n\`\`\``
}

function CaseRow({ item }: { item: NotationCase }) {
  return (
    <article className="space-y-3" data-case-key={item.key}>
      <header className="space-y-1">
        <div className="flex items-baseline gap-3">
          <h3 className="text-base font-medium">{item.label}</h3>
          <code className="text-caption-12 text-neutral-6">{item.key}</code>
        </div>
        <p className="text-sm text-neutral-7">{item.description}</p>
      </header>
      <div className="grid gap-6 lg:grid-cols-2">
        <pre className="overflow-x-auto bg-neutral-2 p-4 font-mono text-caption-12 leading-relaxed text-neutral-8">
          {fence(item)}
        </pre>
        <div className="prose min-w-0">
          <Markdown value={fence(item)} />
        </div>
      </div>
    </article>
  )
}

export default function CodeNotationDemoPage() {
  const isClient = useIsClient()
  if (!isClient) return null

  return (
    <div className="mx-auto max-w-6xl space-y-16 px-4 py-16">
      <header className="space-y-3">
        <div className="text-caption-10 tracking-[0.18em] text-neutral-7 uppercase">
          dev · code notation
        </div>
        <h1 className="text-3xl font-semibold">Shiki transformer 覆盖矩阵</h1>
        <p className="text-sm text-neutral-7">
          左为 Markdown 源，右为 @pierre/highlights 渲染结果。规则对齐 shiki
          transformers 之 v3 匹配：行尾注释、独占行作用于下一行、:n 范围、meta
          行号按原始源码计。复制按钮所复制者为剥除 notation 后之代码。
        </p>
      </header>

      {GROUPS.map((group) => {
        const cases = notationCases.filter((item) => item.group === group.id)
        return (
          <section className="space-y-10" key={group.id}>
            <h2 className="text-caption-12 tracking-[0.12em] text-neutral-7 uppercase">
              {group.label}
            </h2>
            {cases.map((item) => (
              <CaseRow item={item} key={item.key} />
            ))}
          </section>
        )
      })}
    </div>
  )
}
