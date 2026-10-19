'use client'

import { NavigationMenu } from '@base-ui/react/navigation-menu'
import { useQuery } from '@tanstack/react-query'
import { useLocale, useTranslations } from 'next-intl'
import type { CSSProperties, FC } from 'react'
import { useState } from 'react'

import {
  isSupportIcon,
  socialIconSet,
} from '~/components/modules/home/SocialIcon'
import { FloatPopover } from '~/components/ui/float-popover'
import { SlotText } from '~/components/ui/slot-text'
import { Link } from '~/i18n/navigation'
import { clsxm } from '~/lib/helper'
import { apiClient } from '~/lib/request'
import { useAggregationSelector } from '~/providers/root/aggregation-data-provider'

import type { DropdownProps } from './shared'
import {
  NARROW_PANEL,
  rowClassName,
  RowTick,
  SectionLabel,
  WIDE_PANEL,
} from './shared'

interface SiteInfo {
  firstPublishDate: string | null
  noteCount: number
  postCount: number
  totalWordCount: number
}

const useSiteStats = () => {
  const locale = useLocale()
  const t = useTranslations('common')
  const [renderedAt] = useState(() => Date.now())
  const { data: siteInfo } = useQuery({
    queryKey: ['site-info', locale],
    queryFn: () => apiClient.aggregate.proxy.site_info.get<SiteInfo>(),
    staleTime: 5 * 60 * 1000,
  })
  if (!siteInfo) return null

  const words = siteInfo.totalWordCount
    ? Math.round(siteInfo.totalWordCount / (locale === 'en' ? 1000 : 10000))
    : 0
  const days = siteInfo.firstPublishDate
    ? Math.floor(
        (renderedAt - new Date(siteInfo.firstPublishDate).getTime()) / 86400000,
      )
    : 0

  return [
    {
      value: siteInfo.postCount + siteInfo.noteCount,
      label: t('nav_dropdown_stat_articles'),
    },
    { value: words, label: t('nav_dropdown_stat_words') },
    { value: days, label: t('nav_dropdown_stat_days') },
  ]
}

const SocialLinks = () => {
  const socialIds = useAggregationSelector((data) => data.user.socialIds)
  const entries = (
    Object.entries(socialIds || {}) as [string, string | number][]
  )
    .filter(([type]) => isSupportIcon(type))
    .slice(0, 5)
  if (entries.length === 0) return null

  return (
    <div className="paper-hairline -ml-1.5 mt-auto flex flex-wrap items-center gap-0.5 border-t-[0.5px] pt-2.5">
      {entries.map(([type, id]) => {
        const entry = socialIconSet[type]
        if (!entry) return null
        const [name, Icon, color, hrefFn] = entry
        return (
          <FloatPopover
            key={type}
            type="tooltip"
            triggerElement={
              <a
                aria-label={name}
                className="center flex size-7 text-neutral-6 transition-colors hover:text-[var(--social-color)]"
                href={hrefFn(String(id))}
                rel="noreferrer"
                style={{ '--social-color': color } as CSSProperties}
                target="_blank"
              >
                <span className="flex items-center justify-center [&_i]:text-copy-13 [&_svg]:size-3.5">
                  {Icon}
                </span>
              </a>
            }
          >
            {name}
          </FloatPopover>
        )
      })}
    </div>
  )
}

export const HomeDropdown: FC<DropdownProps> = ({ section }) => {
  const t = useTranslations('common')
  const stats = useSiteStats()
  const pages = section.subMenu || []

  return (
    <div
      className={clsxm(
        'grid px-[18px] pb-4 pt-5',
        pages.length > 0
          ? [WIDE_PANEL, 'grid-cols-[176px_minmax(0,1fr)]']
          : [NARROW_PANEL, 'grid-cols-1'],
      )}
    >
      <div className="flex min-w-0 flex-col pl-3 pr-4">
        <SectionLabel className="px-0">{t('nav_dropdown_here')}</SectionLabel>
        <div className="mb-[18px] flex flex-col gap-3">
          {stats
            ? stats.map((stat) => (
                <div className="flex items-baseline gap-2" key={stat.label}>
                  <span className="[font-family:var(--font-logo-latin)] text-[24px] leading-none tabular-nums text-neutral-10">
                    <SlotText text={String(stat.value)} />
                  </span>
                  <span className="text-label-12 text-neutral-6">
                    {stat.label}
                  </span>
                </div>
              ))
            : [0, 1, 2].map((i) => (
                <div className="flex items-baseline gap-2" key={i}>
                  <span className="h-5 w-10 animate-pulse rounded-sm bg-neutral-3/50" />
                  <span className="h-3 w-6 animate-pulse rounded-sm bg-neutral-3/40" />
                </div>
              ))}
        </div>
        <SocialLinks />
      </div>

      {pages.length > 0 && (
        <div className="paper-hairline min-w-0 border-l-[0.5px] pl-3.5">
          <SectionLabel>{t('nav_dropdown_pages')}</SectionLabel>
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
            {pages.map((page) => (
              <NavigationMenu.Link
                closeOnClick
                className={clsxm(rowClassName, 'h-8 py-0')}
                key={page.path}
                render={<Link href={page.path} />}
              >
                <RowTick />
                <span className="truncate">{page.title}</span>
              </NavigationMenu.Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
