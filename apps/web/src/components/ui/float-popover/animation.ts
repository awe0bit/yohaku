import type { MotionProps, TargetAndTransition } from 'motion/react'

const POPOVER_EASING = [0.22, 1, 0.36, 1] as const
const SLIDE_DISTANCE = 4

type PlacementDirection = 'top' | 'bottom' | 'left' | 'right'

const originMap: Record<PlacementDirection, string> = {
  bottom: 'center top',
  top: 'center bottom',
  right: 'left center',
  left: 'right center',
}

const offsetMap: Record<PlacementDirection, { x: number; y: number }> = {
  bottom: { x: 0, y: -SLIDE_DISTANCE },
  top: { x: 0, y: SLIDE_DISTANCE },
  right: { x: -SLIDE_DISTANCE, y: 0 },
  left: { x: SLIDE_DISTANCE, y: 0 },
}

export function getPopoverAnimationConfig(placement: string): MotionProps & {
  style: { transformOrigin: string }
} {
  const dir = (placement.split('-')[0] || 'bottom') as PlacementDirection
  const offset = offsetMap[dir] ?? offsetMap.bottom

  const initial: TargetAndTransition = { ...offset, opacity: 0 }
  const animate: TargetAndTransition = { x: 0, y: 0, opacity: 1 }
  const exit: TargetAndTransition = {
    ...offset,
    opacity: 0,
    transition: { duration: 0.15, ease: POPOVER_EASING },
  }

  return {
    initial,
    animate,
    exit,
    transition: { duration: 0.22, ease: POPOVER_EASING },
    style: { transformOrigin: originMap[dir] ?? originMap.bottom },
  }
}
