'use client'

import type { PropsWithChildren } from 'react'
import { createContext, use, useEffect, useState } from 'react'

import { useIsDark } from '~/hooks/common/use-is-dark'
import { usePathname } from '~/i18n/navigation'

import { bgmEngine, type BgmState } from './engine'
import { type BgmScene, resolveBgmScene } from './scene'

interface BgmContextValue extends BgmState {
  setEnabled: (enabled: boolean) => void
  setScene: (scene: BgmScene) => void
  toggle: () => void
}

const BgmContext = createContext<BgmContextValue | null>(null)

export const BgmProvider = ({ children }: PropsWithChildren) => {
  const [state, setState] = useState<BgmState>(() => bgmEngine.getState())
  const pathname = usePathname()
  const isDark = useIsDark()

  useEffect(() => bgmEngine.subscribe(setState), [])
  useEffect(() => {
    bgmEngine.setScene(resolveBgmScene(pathname, isDark))
  }, [pathname, isDark])

  return (
    <BgmContext
      value={{
        ...state,
        setEnabled: (enabled) => {
          void bgmEngine.setEnabled(enabled)
        },
        setScene: (scene) => {
          bgmEngine.setScene(scene)
        },
        toggle: () => {
          void bgmEngine.toggle()
        },
      }}
    >
      {children}
    </BgmContext>
  )
}

export const useBgm = () => {
  const value = use(BgmContext)
  if (!value) throw new Error('useBgm must be used inside BgmProvider')
  return value
}
