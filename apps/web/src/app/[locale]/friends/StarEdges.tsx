import { useEffect, useRef } from 'react'

import { clsxm } from '~/lib/helper'

import type { StarLayout } from './use-star-transition'

export const StarEdges = ({
  layout,
  seed,
  hidden,
  drawKey,
}: {
  layout: StarLayout | null
  seed: number
  hidden: boolean
  drawKey: number
}) => {
  const groupRef = useRef<SVGGElement>(null)

  useEffect(() => {
    if (!drawKey || !groupRef.current) return
    groupRef.current.querySelectorAll('path').forEach((path, i) => {
      const timing: KeyframeAnimationOptions = {
        duration: 620,
        delay: 80 + i * 45,
        easing: 'cubic-bezier(.2,.7,.2,1)',
        fill: 'backwards',
      }
      if (path.dataset.faint) {
        path.animate([{ opacity: 0 }, { opacity: 1 }], timing)
      } else {
        path.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], timing)
      }
    })
  }, [drawKey])

  const points = layout?.points ?? []
  return (
    <g
      ref={groupRef}
      className={clsxm(
        'transition-opacity duration-200',
        hidden && 'opacity-0',
      )}
    >
      {layout?.edges.map((e) => {
        const a = points[e.from]
        const b = points[e.to]
        const mx = (a.x + b.x) / 2 + (a.y - b.y) * 0.08
        const my = (a.y + b.y) / 2 + (b.x - a.x) * 0.08
        return (
          <path
            d={`M${a.x} ${a.y} Q${mx} ${my} ${b.x} ${b.y}`}
            data-faint={e.faint || undefined}
            fill="none"
            key={`${seed}-${e.from}-${e.to}`}
            pathLength={e.faint ? undefined : 1}
            stroke="currentColor"
            strokeDasharray={e.faint ? '2 5' : '1'}
            strokeOpacity={e.faint ? 0.13 : 0.22}
          />
        )
      })}
    </g>
  )
}
