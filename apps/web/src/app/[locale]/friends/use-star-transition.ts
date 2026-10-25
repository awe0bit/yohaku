import type { LinkModel } from '@mx-space/api-client'
import type { RefObject } from 'react'
import { useLayoutEffect, useRef } from 'react'

import type { Body, StarMap, StepTiming } from './constellation'
import {
  easeInOutCubic,
  GENESIS_TIMING,
  mapPadding,
  seededRandom,
  SETTLE_MAX_MS,
  settleBodies,
  SKY_TURN_DEG,
  SKY_TURN_MS,
  stepBodies,
} from './constellation'

export type StarLayout = StarMap<LinkModel>
export type StarTransition = {
  seed: number
  next: StarLayout
  /** Spawn points keyed by link id, used by the cold-start entrance instead of
   *  the stars' previous positions. */
  spawn?: Record<string, { x: number; y: number }>
  /** Physics pacing; defaults to the reshuffle timing. */
  timing?: StepTiming
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

/** Share of the map's short side the cold-start cloud occupies. */
export const GENESIS_CLOUD_RATIO = 0.16

/**
 * First paint starts as a hot, dense cloud at the map's centre: every star is
 * an `enter`, so it ignites in the core and the existing thermal step carries
 * it out into its constellation slot.
 */
export const buildGenesisTransition = (
  layout: StarLayout,
  size: { width: number; height: number },
  seed: number,
): StarTransition => {
  const rand = seededRandom(seed * 7919 + 13)
  const cx = size.width / 2
  const cy = size.height / 2
  const spread = Math.min(size.width, size.height) * GENESIS_CLOUD_RATIO
  const spawn: Record<string, { x: number; y: number }> = {}
  for (const p of layout.points) {
    spawn[p.link.id] = {
      x: cx + (rand() - 0.5) * spread,
      y: cy + (rand() - 0.5) * spread,
    }
  }
  return {
    seed,
    next: layout,
    spawn,
    timing: GENESIS_TIMING,
    stars: layout.points.map((p) => ({
      link: p.link,
      phase: 'enter' as const,
    })),
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
      const spawn = transition.spawn?.[link.id]
      const body: Body = {
        x: spawn?.x ?? start?.x ?? pad.x + rand() * (size.width - pad.x * 2),
        y:
          spawn?.y ??
          start?.y ??
          pad.top + rand() * (size.height - pad.top - pad.bottom),
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
        // Position through the `translate` property, never `transform`: the
        // hover affordance animates `scale`, which composes on top of
        // `transform` and would multiply the translate (stars jumped on hover).
        el.style.translate = `calc(${body.x}px - 50%) calc(${body.y}px - 50%)`
        el.style.scale = String(body.scale)
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
        transition.timing,
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
        if (body.phase === 'leave') continue
        const el = starElsRef.current.get(id)
        // Hand `scale` back to CSS so `hover:scale-*` can take over.
        el?.style.removeProperty('opacity')
        el?.style.removeProperty('scale')
      }
      onSettle(transition.seed)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [transition])
}
