'use client'

import type { MotionValue } from 'motion/react'
import { m } from 'motion/react'

import { ClientOnly } from '~/components/common/ClientOnly'
import { Link } from '~/i18n/navigation'
import { useAggregationSelector } from '~/providers/root/aggregation-data-provider'

import { Activity } from './Activity'
import { HeaderNav } from './HeaderNav'
import { TapableLogo } from './TapableLogo'
import { UserAuth } from './UserAuth'

export const DesktopHeader = ({
  opacity,
  shift,
  visibility,
}: {
  opacity: MotionValue<number>
  shift: MotionValue<number>
  visibility: MotionValue<'visible' | 'hidden'>
}) => {
  const siteTitle = useAggregationSelector((data) => data.seo.title) || ''

  return (
    <m.div
      data-hide-print
      className="yohaku-page-right-inset fixed inset-x-0 top-0 z-0 hidden h-[4.5rem] lg:block"
      style={{ opacity, visibility, y: shift }}
    >
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-8 px-8">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative size-[30px] shrink-0">
            <ClientOnly>
              <TapableLogo className="flex" size={30} />
            </ClientOnly>
          </div>
          <Link
            className="shrink-0 [font-family:var(--font-logo-latin)] text-[19px] tracking-[0.02em] text-neutral-9"
            href="/"
          >
            {siteTitle}
          </Link>
          <div className="relative ml-1 flex min-w-0 items-center">
            <ClientOnly>
              <Activity />
            </ClientOnly>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-[22px]">
          <HeaderNav variant="top" />
          <div className="paper-hairline flex h-7 w-[51px] items-center border-l pl-[22px]">
            <UserAuth />
          </div>
        </div>
      </div>
    </m.div>
  )
}
