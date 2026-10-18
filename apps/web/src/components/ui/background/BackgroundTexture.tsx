'use client'

import { useAtomValue } from 'jotai'
import { useReducedMotion } from 'motion/react'
import { useState } from 'react'

import { useIsBackgroundEffectEnabled } from '~/atoms/hooks/background'
import {
  useIsImmersiveReadingEnabled,
  useIsInReading,
} from '~/atoms/hooks/reading'
import { useIsMobile, useViewport } from '~/atoms/hooks/viewport'
import { paperTermAtom } from '~/atoms/paper'
import { useIsHydrationEnded } from '~/components/common/HydrationEndDetector'
import { useIsDark } from '~/hooks/common/use-is-dark'

import { PaperBackground } from './paper/PaperBackground'
import { PaperSeason } from './paper/PaperSeason'

const isMeasured = (v: { w: number }) => v.w !== 0

const PaperLayer = () => {
  const isDark = useIsDark()
  const isMobile = useIsMobile()
  const isInReading = useIsInReading()
  const isImmersive = useIsImmersiveReadingEnabled()
  const reduceMotion = useReducedMotion() ?? false
  const isHydrationEnded = useIsHydrationEnded()
  const isEnabled = useIsBackgroundEffectEnabled()
  const isMeasuredViewport = useViewport(isMeasured)
  const term = useAtomValue(paperTermAtom)
  const wanted =
    isEnabled && isMeasuredViewport && !isMobile && isHydrationEnded
  const [mounted, setMounted] = useState(false)
  if (wanted && !mounted) setMounted(true)

  if (!mounted || term === null) return null

  return (
    <PaperBackground
      dark={isDark}
      page={isImmersive ? 'immersive' : isInReading ? 'read' : 'browse'}
      reduceMotion={reduceMotion}
      term={term}
      visible={wanted}
      onExited={() => setMounted(false)}
    />
  )
}

export const BackgroundTexture = () => (
  <>
    <PaperSeason />
    <PaperLayer />
  </>
)
