'use client'

import { useAtomValue } from 'jotai'
import { useEffect, useRef } from 'react'

import { paperTermAtom } from '~/atoms/paper'
import { ACCENT_STYLE_ID, accentCss } from '~/lib/paper/accent'
import type { Lab } from '~/lib/paper/oklab'
import { labToRgb } from '~/lib/paper/oklab'
import { accentLab, lerp3, rgbToHex } from '~/lib/paper/season'
import {
  msUntilNextLocalMidnight,
  solarTermForLocalDay,
} from '~/lib/paper/solar-term'
import { jotaiStore } from '~/lib/store'

const ACCENT_TRANSITION_MS = 10_000

const useSolarTermClock = () => {
  useEffect(() => {
    const sync = () =>
      jotaiStore.set(paperTermAtom, solarTermForLocalDay(new Date()))
    let timer = 0
    const arm = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(
        () => {
          sync()
          arm()
        },
        msUntilNextLocalMidnight(new Date()) + 1000,
      )
    }
    const wake = () => {
      if (document.visibilityState !== 'visible') return
      sync()
      arm()
    }
    sync()
    arm()
    document.addEventListener('visibilitychange', wake)
    window.addEventListener('focus', wake)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', wake)
      window.removeEventListener('focus', wake)
    }
  }, [])
}

const labsOf = (term: number): [Lab, Lab] => [
  accentLab(term, false),
  accentLab(term, true),
]

const accentStyles = () => [
  ...document.querySelectorAll<HTMLStyleElement>(`style#${ACCENT_STYLE_ID}`),
]

const cssOf = ([light, dark]: [Lab, Lab]) =>
  accentCss(labToRgb(light), labToRgb(dark))

const writeAccent = (labs: [Lab, Lab]) => {
  const styles = accentStyles()
  if (styles.length === 0) {
    const style = document.createElement('style')
    style.id = ACCENT_STYLE_ID
    document.head.append(style)
    styles.push(style)
  }
  const css = cssOf(labs)
  for (const style of styles) {
    style.textContent = css
    style.dataset.light = rgbToHex(labToRgb(labs[0]))
    style.dataset.dark = rgbToHex(labToRgb(labs[1]))
  }
}

const useSeasonalAccent = (term: number | null) => {
  const shownRef = useRef<[Lab, Lab] | null>(null)

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const shown = shownRef.current
      if (!shown) return
      const css = cssOf(shown)
      if (accentStyles().some((style) => style.textContent !== css))
        writeAccent(shown)
    })
    observer.observe(document.head, {
      characterData: true,
      childList: true,
      subtree: true,
    })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (term === null) return
    const target = labsOf(term)
    if (!shownRef.current) {
      const ssrTerm = Number(
        document.getElementById(ACCENT_STYLE_ID)?.dataset.term,
      )
      if (!Number.isInteger(ssrTerm)) writeAccent(target)
      shownRef.current = Number.isInteger(ssrTerm) ? labsOf(ssrTerm) : target
    }
    const from = shownRef.current
    if (from.flat().every((v, i) => v === target.flat()[i])) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const start = performance.now()
    let frame = 0
    const step = (now: number) => {
      const t = reduce ? 1 : Math.min(1, (now - start) / ACCENT_TRANSITION_MS)
      const k = t * t * (3 - 2 * t)
      const current: [Lab, Lab] = [
        lerp3(from[0], target[0], k),
        lerp3(from[1], target[1], k),
      ]
      shownRef.current = current
      writeAccent(current)
      if (t < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [term])
}

export const PaperSeason = () => {
  useSolarTermClock()
  useSeasonalAccent(useAtomValue(paperTermAtom))
  return null
}
