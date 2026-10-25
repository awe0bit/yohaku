'use client'

import { m } from 'motion/react'
import { useId } from 'react'

const EASE_OUT = [0.16, 1, 0.3, 1] as const

/**
 * Thermodynamic cold start: a hot core flashes, its diffusion fronts run out
 * across the sky and the heat thins to nothing while the star cloud cools into
 * the constellation behind it. Runs once per mount; unmounts on `onDone`.
 */
export const HeatBloom = ({
  width,
  height,
  onDone,
}: {
  width: number
  height: number
  onDone: () => void
}) => {
  const id = useId().replaceAll(':', '')
  const cx = width / 2
  const cy = height / 2
  const reach = Math.min(width, height)
  const fronts = [
    { delay: 0.03, to: reach * 0.46, warm: true, duration: 0.95 },
    { delay: 0.12, to: reach * 0.66, warm: false, duration: 1.15 },
    { delay: 0.22, to: reach * 0.88, warm: false, duration: 1.35 },
  ]

  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[5] size-full text-accent"
      viewBox={`0 0 ${width} ${height}`}
    >
      <defs>
        <radialGradient id={`${id}-core`}>
          <stop offset="0%" stopColor="#fffdf7" stopOpacity="0.98" />
          <stop offset="26%" stopColor="#ffc98a" stopOpacity="0.82" />
          <stop
            offset="58%"
            stopColor="color-mix(in oklab, #ff9d5c 62%, var(--color-accent))"
            stopOpacity="0.44"
          />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-haze`}>
          <stop
            offset="0%"
            stopColor="color-mix(in oklab, #ff9d5c 48%, var(--color-accent))"
            stopOpacity="0.3"
          />
          <stop
            offset="70%"
            stopColor="var(--color-accent)"
            stopOpacity="0.07"
          />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Residual heat: the halo lingers past the flash, then radiates away. */}
      <m.circle
        animate={{ opacity: [0, 1, 0.18, 0], scale: 1 }}
        cx={cx}
        cy={cy}
        fill={`url(#${id}-haze)`}
        initial={{ opacity: 0, scale: 0.5 }}
        r={reach * 0.92}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
        transition={{
          duration: 1.6,
          ease: [0.22, 1, 0.36, 1],
          times: [0, 0.12, 0.5, 1],
        }}
        onAnimationComplete={onDone}
      />

      {/* The ignition itself: hot core blooming outward. */}
      <m.circle
        animate={{ opacity: [0, 1, 0], scale: 1 }}
        cx={cx}
        cy={cy}
        fill={`url(#${id}-core)`}
        initial={{ opacity: 0, scale: 0.06 }}
        r={reach * 0.5}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
        transition={{ duration: 1.15, ease: EASE_OUT, times: [0, 0.16, 1] }}
      />

      {fronts.map((front) => (
        <m.circle
          animate={{ opacity: 0, r: front.to, strokeWidth: 0.5 }}
          cx={cx}
          cy={cy}
          fill="none"
          initial={{ opacity: front.warm ? 0.5 : 0.34, r: reach * 0.045 }}
          key={front.delay}
          stroke={front.warm ? '#f0a45b' : 'currentColor'}
          transition={{
            delay: front.delay,
            duration: front.duration,
            ease: EASE_OUT,
          }}
        />
      ))}
    </svg>
  )
}
