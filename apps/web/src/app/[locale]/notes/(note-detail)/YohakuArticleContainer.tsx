'use client'

import type { PropsWithChildren } from 'react'

import { useYohakuArticleRef } from '~/components/modules/yohaku/YohakuArticleShell'
import { PAPER_DYE_SCOPE_CLASS } from '~/components/ui/background/paper/dye-input'
import { PaperDyeSource } from '~/components/ui/background/paper/PaperDyeSource'

import { IndentArticleContainer } from './[id]/pageExtra'

export function YohakuArticleContainer({
  children,
  prose = true,
}: PropsWithChildren<{ prose?: boolean }>) {
  const articleRef = useYohakuArticleRef()
  return (
    <IndentArticleContainer
      className={PAPER_DYE_SCOPE_CLASS}
      prose={prose}
      ref={articleRef}
    >
      <PaperDyeSource />
      {children}
    </IndentArticleContainer>
  )
}
