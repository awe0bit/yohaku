'use client'

import type { CSSProperties } from 'react'
import { useCallback, useLayoutEffect, useRef } from 'react'

import { useViewport } from '~/atoms/hooks/viewport'
import { clsxm } from '~/lib/helper'

import { isLateStackArrival, playStackShift } from './paper-stack-motion'
import { PaperSheet } from './PaperSheet'

type PaperStackBackLayer = {
  tz: number
  tx: number
  ty?: number
  rot: number
  z: number
  ribbed?: boolean
}

/** Fixed height for backing layers — stays within the front sheet's bounds. */
const BACKING_LAYER_HEIGHT = 820

/**
 * Backing sheets own their final stack transform. `usePaperEntrance` reads it
 * inline and shifts each marked layer in from the pose one sheet deeper.
 */
export function PaperStackBackingLayers({
  layers,
}: {
  layers: readonly PaperStackBackLayer[]
}) {
  const stackDesktop = useViewport(useCallback((v) => v.lg && v.w !== 0, []))
  const effectiveLayers = stackDesktop ? layers : []
  const containerRef = useRef<HTMLDivElement>(null)
  const renderedEmptyRef = useRef(effectiveLayers.length === 0)

  useLayoutEffect(() => {
    const late = isLateStackArrival({
      count: effectiveLayers.length,
      renderedEmpty: renderedEmptyRef.current,
    })
    renderedEmptyRef.current = effectiveLayers.length === 0
    const container = containerRef.current
    if (!late || !container) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    // On a hard load the viewport is only measured after hydration, so the
    // sheets arrive after the paper entrance has already decided to skip.
    const animations = playStackShift(
      Array.from(
        container.querySelectorAll<HTMLElement>('[data-paper-stack-layer]'),
      ),
    )
    return () => animations.forEach((animation) => animation.cancel())
  }, [effectiveLayers.length])

  if (effectiveLayers.length === 0) return null

  return (
    <div
      aria-hidden
      ref={containerRef}
      className="pointer-events-none absolute inset-0 -z-10 [clip-path:inset(0_-100px_0_0)]"
    >
      {effectiveLayers.map(({ tz, tx, ty = 0, rot, z, ribbed }) => {
        const stacked = `translateZ(${tz}px) translateX(${tx}px) translateY(${ty}px) rotate(${rot}deg)`

        const style = {
          zIndex: z,
          height: `${BACKING_LAYER_HEIGHT}px`,
          maxHeight: '100%',
          transform: stacked,
          transformOrigin: 'top left',
        } satisfies CSSProperties

        return (
          <div
            aria-hidden
            data-paper-stack-layer
            key={`${tz}-${tx}-${rot}-${z}`}
            style={style}
            className={clsxm(
              'pointer-events-none absolute inset-x-0 top-0',
              'print:hidden!',
            )}
          >
            <PaperSheet className="h-full" />
            {ribbed ? (
              <div
                aria-hidden
                className={clsxm(
                  'absolute inset-0 opacity-[0.055]',
                  'dark:opacity-[0.1]',
                  '[background-image:repeating-linear-gradient(90deg,transparent_0_5px,rgba(0,0,0,0.055)_5px_6px)]',
                  'dark:[background-image:repeating-linear-gradient(90deg,transparent_0_5px,rgba(255,255,255,0.06)_5px_6px)]',
                )}
              />
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
