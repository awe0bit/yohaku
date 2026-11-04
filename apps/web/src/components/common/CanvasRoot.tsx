'use client'

import type { PropsWithChildren } from 'react'
import { useLayoutEffect, useRef } from 'react'

import { mountCanvasRoot } from '~/lib/html-in-canvas'

export const CanvasRoot = ({ children }: PropsWithChildren) => {
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const mounted = mountCanvasRoot(ref.current)
    return () => mounted?.dispose()
  }, [])

  return (
    <div data-theme id="root" ref={ref}>
      {children}
    </div>
  )
}
