import { memo } from 'react'

import { seededRandom } from './constellation'

export const SkyBackdrop = memo(
  ({
    width,
    height,
    compact,
  }: {
    width: number
    height: number
    compact: boolean
  }) => {
    const cx = width / 2
    const cy = height * 1.9
    const reach = Math.hypot(width, height) * 0.75
    const rand = seededRandom(31)
    const dust = Array.from({ length: compact ? 90 : 240 }, () => ({
      x: cx + (rand() - 0.5) * reach * 2,
      y: height / 2 + (rand() - 0.5) * reach * 2,
      r: rand() < 0.12 ? 1.1 : 0.6,
      o: 0.3 + rand() * 0.7,
    }))

    return (
      <>
        {Array.from({ length: 7 }, (_, k) => (
          <circle
            cx={cx}
            cy={cy}
            fill="none"
            key={`ring-${k}`}
            r={height * 1.1 + ((k + 1) * height) / 7}
            stroke="currentColor"
            strokeOpacity={0.06}
          />
        ))}
        {Array.from({ length: 19 }, (_, k) => {
          const a = -Math.PI / 2 + (k - 9) * 0.11
          return (
            <line
              key={`meridian-${k}`}
              stroke="currentColor"
              strokeOpacity={0.06}
              x1={cx + Math.cos(a) * height * 1.1}
              x2={cx + Math.cos(a) * height * 3}
              y1={cy + Math.sin(a) * height * 1.1}
              y2={cy + Math.sin(a) * height * 3}
            />
          )
        })}
        {dust.map((d) => (
          <circle
            className="opacity-[0.28] dark:opacity-[0.42]"
            cx={d.x}
            cy={d.y}
            fill="currentColor"
            fillOpacity={d.o}
            key={`dust-${d.x.toFixed(2)}-${d.y.toFixed(2)}`}
            r={d.r}
          />
        ))}
      </>
    )
  },
)
SkyBackdrop.displayName = 'SkyBackdrop'
