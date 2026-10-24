import type { LinkModel } from '@mx-space/api-client'
import { m } from 'motion/react'

import { clsxm } from '~/lib/helper'

import type { StarPoint } from './constellation'
import { linkDomain, matchesQuery } from './constellation'

export const StarLabels = ({
  points,
  seed,
  width,
  compact,
  query,
  staggered,
}: {
  points: StarPoint<LinkModel>[]
  seed: number
  width: number
  compact: boolean
  query: string
  staggered: boolean
}) => {
  const half = compact ? 52 : 74

  return points.map((p, i) => (
    <m.div
      animate={{ opacity: matchesQuery(p.link, query) ? 1 : 0.2 }}
      initial={{ opacity: 0 }}
      key={`${seed}-${p.link.id}`}
      transition={{ delay: staggered ? 0.12 + i * 0.03 : 0 }}
      className={clsxm(
        'pointer-events-none absolute text-center',
        compact ? '-ml-12 w-24' : '-ml-[70px] w-[140px]',
      )}
      style={{
        left: Math.min(Math.max(p.x, half), width - half),
        top: p.y + 26,
      }}
    >
      <div className="truncate text-label-12 font-medium text-neutral-8">
        {p.link.name}
      </div>
      {!compact && (
        <div className="truncate font-mono text-caption-10 text-neutral-6">
          {linkDomain(p.link.url)}
        </div>
      )}
    </m.div>
  ))
}
