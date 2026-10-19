import { memo } from 'react'

import { ErrorBoundary } from '~/components/common/ErrorBoundary'
import { LocaleSuggestionPill } from '~/components/modules/locale-suggestion/LocaleSuggestionPill'

import { DesktopHeader } from './internal/DesktopHeader'
import { HeaderDataConfigureProvider } from './internal/HeaderDataConfigureProvider'
import { HeaderStrip } from './internal/HeaderStrip'
import { MobileHeader } from './internal/MobileHeader'
import { useHeaderScrollState } from './internal/useHeaderScrollState'

export const Header = () => (
  <ErrorBoundary>
    <HeaderDataConfigureProvider>
      <MemoedHeader />
    </HeaderDataConfigureProvider>
  </ErrorBoundary>
)

const MemoedHeader = memo(() => {
  const { phase, topOpacity, topShift, topVisibility } = useHeaderScrollState()

  return (
    <>
      <MobileHeader />
      <DesktopHeader
        opacity={topOpacity}
        shift={topShift}
        visibility={topVisibility}
      />
      <HeaderStrip visible={phase === 'strip'} />
      <LocaleSuggestionPill />
    </>
  )
})

MemoedHeader.displayName = 'MemoedHeader'
