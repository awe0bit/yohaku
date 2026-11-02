'use client'

import { useTranslations } from 'next-intl'
import type { FC } from 'react'
import { useEffect, useRef } from 'react'

import { usePathname } from '~/i18n/navigation'

import type { EggEnv } from './engine'
import { createEggEngine } from './engine'

export interface PaperEggProps {
  dark: boolean
  reduceMotion: boolean
  term: number
}

export const PaperEgg: FC<PaperEggProps> = ({ dark, reduceMotion, term }) => {
  const t = useTranslations('common')
  const pathname = usePathname()
  const exitLabel = t('paper_egg_exit')
  const envRef = useRef<EggEnv>({ dark, reduceMotion, term, exitLabel })
  const engineRef = useRef<ReturnType<typeof createEggEngine> | null>(null)

  useEffect(() => {
    const engine = createEggEngine(envRef.current)
    engineRef.current = engine
    return () => {
      engine.dispose()
      engineRef.current = null
    }
  }, [])

  useEffect(() => {
    envRef.current = { dark, reduceMotion, term, exitLabel }
    engineRef.current?.update(envRef.current)
  }, [dark, reduceMotion, term, exitLabel])

  useEffect(() => {
    engineRef.current?.forceEnd()
  }, [pathname])

  return null
}
