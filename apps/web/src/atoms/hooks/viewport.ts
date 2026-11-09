import type { ExtractAtomValue } from 'jotai'
import { useMemo, useSyncExternalStore } from 'react'

import { jotaiStore } from '~/lib/store'

import { viewportAtom } from '../viewport'

type Viewport = ExtractAtomValue<typeof viewportAtom>

const subscribeViewport = (onChange: () => void) =>
  jotaiStore.sub(viewportAtom, onChange)

const memoizeBySource = <T>(
  read: () => Viewport,
  selector: (value: Viewport) => T,
) => {
  let source: Viewport | undefined
  let selected: T
  return () => {
    const next = read()
    if (next !== source) {
      source = next
      selected = selector(next)
    }
    return selected
  }
}

// EventProvider measures the window in a layout effect, which commits before
// late Suspense boundaries hydrate. Reading the store there would diverge from
// the unmeasured server HTML, so hydration reads the atom's initial value and
// React re-renders with the measured one right after.
export const useViewport = <T>(
  selector: (value: Viewport) => T,
  deps: React.DependencyList = [],
): T => {
  const [getSnapshot, getServerSnapshot] = useMemo(
    () => [
      memoizeBySource(() => jotaiStore.get(viewportAtom), selector),
      memoizeBySource(() => viewportAtom.init, selector),
    ],
    deps,
  )
  return useSyncExternalStore(subscribeViewport, getSnapshot, getServerSnapshot)
}

export const useIsMobile = () => useViewport(isMobile)

const isMobile = (v: ExtractAtomValue<typeof viewportAtom>) =>
  v.w !== 0 && v.w <= 1024
export const getViewport = () => jotaiStore.get(viewportAtom)

export const usePageScrollElement = () => document.documentElement
