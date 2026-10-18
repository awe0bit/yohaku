'use client'

import { clsx } from 'clsx'
import type { PropsWithChildren } from 'react'

import { useYohakuArticleRef } from '~/components/modules/yohaku/YohakuArticleShell'
import { PAPER_DYE_SCOPE_CLASS } from '~/components/ui/background/paper/dye-input'
import { PaperDyeSource } from '~/components/ui/background/paper/PaperDyeSource'

export function YohakuPostArticleContainer({
  children,
  prose,
  fadeTail,
}: PropsWithChildren<{ prose: boolean; fadeTail?: boolean }>) {
  const articleRef = useYohakuArticleRef()
  return (
    <article
      ref={articleRef}
      className={clsx(
        prose && 'prose',
        PAPER_DYE_SCOPE_CLASS,
        fadeTail &&
          '[mask-image:linear-gradient(to_bottom,#000_calc(100%-6rem),transparent)]',
      )}
    >
      <PaperDyeSource />
      {children}
    </article>
  )
}
