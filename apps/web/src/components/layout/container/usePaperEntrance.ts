'use client'

import type { RefObject } from 'react'
import { useLayoutEffect, useState } from 'react'

import { isHydrationEnded } from '~/components/common/HydrationEndDetector'

import { PAPER_EASING, playStackShift } from './paper-stack-motion'
import {
  getPaperTransition,
  notifyPaperMounted,
  paperEntranceMode,
} from './paper-swap'

const PAPER_SHIFT_DURATION_MS = 460

const FLAT_POSE = 'translateZ(0) translateX(0) translateY(0) rotate(0deg)'
const NEAREST_BACK_POSE =
  'translateZ(-8px) translateX(18px) translateY(5px) rotate(2.5deg)'

function airbornePaperShadow(isDark: boolean) {
  return isDark
    ? [
        '0 0 0 0.5px rgba(255,255,255,0.02)',
        '0 4px 12px 0 rgba(0,0,0,0.12)',
        '0 12px 28px 0 rgba(0,0,0,0.16)',
        '0 24px 54px -8px rgba(0,0,0,0.2)',
      ].join(', ')
    : [
        '0 0 0 0.5px rgba(0,0,0,0)',
        '0 4px 12px 0 rgba(0,0,0,0.035)',
        '0 12px 28px 0 rgba(0,0,0,0.05)',
        '0 24px 54px -8px rgba(0,0,0,0.08)',
      ].join(', ')
}

type Rider = {
  el: HTMLElement
  willChange: string
  transformOrigin: string
}

export function usePaperEntrance(ref: RefObject<HTMLElement | null>) {
  const [mode] = useState(() =>
    paperEntranceMode({
      hydrated: isHydrationEnded(),
      transition: getPaperTransition(),
    }),
  )

  useLayoutEffect(() => {
    const el = ref.current
    if (el) notifyPaperMounted(el)
    if (!el || mode === 'skip') return

    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    if (prefersReduced) return

    const stackLayers = Array.from(
      el.querySelectorAll<HTMLElement>('[data-paper-stack-layer]'),
    )
    const frontSheet = el.querySelector<HTMLElement>(
      '.note-layout-main > .paper-sheet-deckle',
    )
    const content = el.querySelector<HTMLElement>(
      '.note-layout-main > [data-paper-content]',
    )
    const stackFinalPoses = stackLayers.map((layer) => layer.style.transform)
    const frontStartPose = stackFinalPoses.at(-1) || NEAREST_BACK_POSE

    const riders: Rider[] = [frontSheet, content]
      .filter((node): node is HTMLElement => !!node)
      .map((node) => ({
        el: node,
        willChange: node.style.willChange,
        transformOrigin: node.style.transformOrigin,
      }))
    const animations: Animation[] = []
    const shiftTiming: KeyframeAnimationOptions = {
      duration: PAPER_SHIFT_DURATION_MS,
      easing: PAPER_EASING,
      fill: 'both',
    }

    riders.forEach(({ el: node }) => {
      node.style.transformOrigin = 'top left'
      node.style.willChange = 'transform'
    })

    if (frontSheet) {
      const finalShadow = getComputedStyle(frontSheet).boxShadow
      const isDark =
        document.documentElement.dataset.theme === 'dark' ||
        document.body.dataset.theme === 'dark'

      animations.push(
        frontSheet.animate(
          [
            {
              transform: frontStartPose,
              boxShadow: airbornePaperShadow(isDark),
            },
            { transform: FLAT_POSE, boxShadow: finalShadow },
          ],
          shiftTiming,
        ),
      )
    }

    if (content) {
      animations.push(
        content.animate(
          [{ transform: frontStartPose }, { transform: FLAT_POSE }],
          shiftTiming,
        ),
      )
    }

    animations.push(...playStackShift(stackLayers))

    if (mode === 'await-ready') {
      // Document time keeps running while a view transition's update callback
      // holds rendering; unpaused, the entrance would be half spent by `ready`.
      animations.forEach((animation) => animation.pause())
      void getPaperTransition()?.ready.then(() =>
        animations.forEach((animation) => animation.play()),
      )
    }

    let released = false
    const release = () => {
      if (released) return
      released = true

      animations.forEach((animation) => animation.cancel())
      riders.forEach(({ el: node, willChange, transformOrigin }) => {
        node.style.willChange = willChange
        node.style.transformOrigin = transformOrigin
      })
    }

    void Promise.all(
      animations.map((animation) => animation.finished.catch(() => undefined)),
    ).then(release)

    return release
  }, [ref, mode])
}
