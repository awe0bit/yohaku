import type { LinkModel } from '@mx-space/api-client'
import type { RefObject } from 'react'
import { useLayoutEffect, useRef } from 'react'

import type { Body, layoutStars } from './constellation'
import {
  easeInOutCubic,
  mapPadding,
  seededRandom,
  SETTLE_MAX_MS,
  settleBodies,
  SKY_TURN_DEG,
  SKY_TURN_MS,
  stepBodies,
} from './constellation'

export type StarLayout = ReturnType<typeof layoutStars<LinkModel>>
export type StarTransition = {
  seed: number
  next: StarLayout
  stars: { link: LinkModel; phase: Body['phase'] }[]
}

export const buildTransition = (
  current: StarLayout,
  next: StarLayout,
  seed: number,
): StarTransition => {
  const nextIds = new Set(next.points.map((p) => p.link.id))
  const currentIds = new Set(current.points.map((p) => p.link.id))
  return {
    seed,
    next,
    stars: [
      ...current.points.map((p) => ({
        link: p.link,
        phase: nextIds.has(p.link.id) ? ('stay' as const) : ('leave' as const),
      })),
      ...next.points
        .filter((p) => !currentIds.has(p.link.id))
        .map((p) => ({ link: p.link, phase: 'enter' as const })),
    ],
  }
}

export const useStarTransition = ({
  transition,
  layout,
  size,
  compact,
  starElsRef,
  skyRef,
  onSettle,
}: {
  transition: StarTransition | null
  layout: StarLayout | null
  size: { width: number; height: number } | null
  compact: boolean
  starElsRef: RefObject<Map<string, HTMLAnchorElement>>
  skyRef: RefObject<SVGGElement | null>
  onSettle: (seed: number) => void
}) => {
  const skyAngleRef = useRef(0)

  // Keyed on the transition alone: it reads the layout it is leaving, and re-running on layout change would restart it.
  useLayoutEffect(() => {
    if (!transition || !layout || !size) return
    const rand = seededRandom(transition.seed * 977)
    const pad = mapPadding(compact)
    const from = new Map(layout.points.map((p) => [p.link.id, p]))
    const to = new Map(transition.next.points.map((p) => [p.link.id, p]))
    const bodies = transition.stars.map(({ link, phase }) => {
      const start = from.get(link.id)
      const end = to.get(link.id) ?? start!
      const body: Body = {
        x: start?.x ?? pad.x + rand() * (size.width - pad.x * 2),
        y: start?.y ?? pad.top + rand() * (size.height - pad.top - pad.bottom),
        vx: 0,
        vy: 0,
        tx: end.x,
        ty: end.y,
        alpha: phase === 'enter' ? 0 : 1,
        scale: phase === 'enter' ? 0.4 : 1,
        phase,
      }
      return { id: link.id, body }
    })
    const paint = () => {
      for (const { id, body } of bodies) {
        const el = starElsRef.current.get(id)
        if (!el) continue
        el.style.transform = `translate(${body.x}px, ${body.y}px) scale(${body.scale})`
        el.style.opacity = String(body.alpha)
      }
    }
    paint()

    const startAngle = skyAngleRef.current
    const startedAt = performance.now()
    let last = startedAt
    let raf = 0
    const frame = (now: number) => {
      const elapsed = now - startedAt
      const restless = stepBodies(
        bodies.map((b) => b.body),
        elapsed,
        Math.min(32, now - last) / 1000,
        rand,
        size,
      )
      last = now
      skyAngleRef.current =
        startAngle +
        SKY_TURN_DEG * easeInOutCubic(Math.min(1, elapsed / SKY_TURN_MS))
      skyRef.current?.setAttribute(
        'transform',
        `rotate(${skyAngleRef.current} ${size.width / 2} ${size.height / 2})`,
      )
      if (restless && elapsed < SETTLE_MAX_MS) {
        paint()
        raf = requestAnimationFrame(frame)
        return
      }
      settleBodies(bodies.map((b) => b.body))
      paint()
      for (const { id, body } of bodies) {
        if (body.phase !== 'leave') {
          starElsRef.current.get(id)?.style.removeProperty('opacity')
        }
      }
      onSettle(transition.seed)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [transition])
}
