'use client'

import type { FC } from 'react'
import { useEffect, useMemo, useRef } from 'react'

import { useIsBackgroundEffectEnabled } from '~/atoms/hooks/background'
import { useIsMobile } from '~/atoms/hooks/viewport'
import { inkPairOf } from '~/lib/paper/image-ink'
import type { Rgb } from '~/lib/paper/oklab'
import { dyeLab, lerp3 } from '~/lib/paper/season'
import { useLexicalImageList } from '~/providers/article/LexicalImageRecordProvider'
import { useMarkdownImageList } from '~/providers/article/MarkdownImageRecordProvider'

import type { LabPair } from './dye'
import {
  dyeBands,
  dyeInput,
  PAPER_DYE_SCOPE_CLASS,
  resetDyeInput,
} from './dye-input'
import { pickFigure } from './figure-pick'

const FIGURE_REFRESH_MS = 500
const FRAME_MS = 33

const unwrapOptimized = (src: string) => {
  if (!src.includes('/_next/image')) return src
  try {
    return new URL(src, location.href).searchParams.get('url') ?? src
  } catch {
    return src
  }
}

const sourcesOf = (el: Element) =>
  [
    el.getAttribute('src'),
    el.getAttribute('data-zoom-src'),
    el.getAttribute('data-src'),
    el instanceof HTMLImageElement ? el.currentSrc : null,
  ]
    .filter((src): src is string => !!src && !src.startsWith('data:'))
    .map(unwrapOptimized)

export const PaperDyeSource: FC = () => {
  const lexicalImages = useLexicalImageList()
  const markdownImages = useMarkdownImageList()
  const images = useMemo(
    () => [...lexicalImages, ...markdownImages].filter((image) => image?.src),
    [lexicalImages, markdownImages],
  )
  const isMobile = useIsMobile()
  const isEnabled = useIsBackgroundEffectEnabled()
  const anchorRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!isEnabled || isMobile || images.length === 0) return
    const scope = anchorRef.current?.closest(`.${PAPER_DYE_SCOPE_CLASS}`)
    if (!scope) return

    const labs = new Map<number, LabPair>()
    const labsOf = (index: number) => {
      const cached = labs.get(index)
      if (cached) return cached
      const { top, bottom } = inkPairOf(images[index])
      const mid = lerp3(top, bottom, 0.5) as Rgb
      const pair: LabPair = [dyeLab(mid, false), dyeLab(mid, true)]
      labs.set(index, pair)
      return pair
    }

    const indexBySrc = new Map(images.map((image, i) => [image.src, i]))
    const imageIndexOf = (figure: Element) => {
      for (const el of figure.querySelectorAll('img, [data-src]')) {
        for (const src of sourcesOf(el)) {
          const index = indexBySrc.get(src)
          if (index !== undefined) return index
        }
      }
      return -1
    }

    let figures: { el: Element; image: number }[] = []
    let refreshedAt = Number.NEGATIVE_INFINITY
    let lastY = window.scrollY
    let lastAt = performance.now()
    let frame = 0
    const loop = (now: number) => {
      frame = requestAnimationFrame(loop)
      if (now - lastAt < FRAME_MS) return
      const refresh = now - refreshedAt > FIGURE_REFRESH_MS
      if (refresh) {
        figures = [...scope.querySelectorAll('figure')]
          .map((el) => ({ el, image: imageIndexOf(el) }))
          .filter((f) => f.image >= 0)
        refreshedAt = now
      }
      const y = window.scrollY
      const velocity = Math.abs(y - lastY) / ((now - lastAt) / 1000)
      lastY = y
      lastAt = now
      if (!refresh && velocity === 0 && dyeInput.velocity === 0) return
      const rects = figures.map((f) => f.el.getBoundingClientRect())
      dyeBands.clear()
      rects.forEach((r, i) =>
        dyeBands.set(String(figures[i].image), [r.top, r.bottom]),
      )
      const { index, weight } = pickFigure(rects, window.innerHeight)
      const known = index >= 0
      const image = known ? figures[index].image : -1
      dyeInput.key = known ? String(image) : null
      dyeInput.labs = known ? labsOf(image) : null
      dyeInput.weight = known ? weight : 0
      dyeInput.velocity = velocity
    }
    frame = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(frame)
      resetDyeInput()
    }
  }, [images, isEnabled, isMobile])

  return <span aria-hidden hidden ref={anchorRef} />
}
