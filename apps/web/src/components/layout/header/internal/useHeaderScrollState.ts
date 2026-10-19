import { useStore } from 'jotai'
import { useMotionValue } from 'motion/react'
import { useEffect, useState } from 'react'

import { pageScrollLocationAtom } from '~/providers/root/page-scroll-info-provider'

import type { HeaderPhase, HeaderScrollState } from './header-scroll'
import { resolveTopFade, stepHeaderScroll } from './header-scroll'

export const useHeaderScrollState = () => {
  const store = useStore()
  const [phase, setPhase] = useState<HeaderPhase>('top')
  const topOpacity = useMotionValue(1)
  const topShift = useMotionValue(0)
  const topVisibility = useMotionValue<'visible' | 'hidden'>('visible')

  useEffect(() => {
    const initialY = store.get(pageScrollLocationAtom)
    let scroll: HeaderScrollState = {
      phase: 'top',
      anchorY: initialY,
      lastY: initialY,
    }

    const apply = () => {
      const y = store.get(pageScrollLocationAtom)
      const fade = resolveTopFade(y)
      topOpacity.set(fade.opacity)
      topShift.set(fade.shift)
      topVisibility.set(fade.visible ? 'visible' : 'hidden')

      const next = stepHeaderScroll(scroll, y)
      if (next.phase !== scroll.phase) setPhase(next.phase)
      scroll = next
    }

    apply()
    return store.sub(pageScrollLocationAtom, apply)
  }, [store, topOpacity, topShift, topVisibility])

  return { phase, topOpacity, topShift, topVisibility }
}
