'use client'

import type { LinkModel } from '@mx-space/api-client'
import { useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'

import { Avatar } from '~/components/ui/avatar'
import { clsxm } from '~/lib/helper'

import { linkDomain, matchesQuery, seededShuffle } from './constellation'

const MOBILE_PREVIEW = 8

export const FriendRoster = ({
  links,
  seed,
  query,
}: {
  links: LinkModel[]
  seed: number
  query: string
}) => {
  const t = useTranslations('friends')
  const [expanded, setExpanded] = useState(false)
  const ordered = useMemo(() => seededShuffle(links, seed), [links, seed])
  const searching = query.trim().length > 0
  const visible = ordered.filter((link) => matchesQuery(link, query))
  const collapsed = !searching && !expanded

  return (
    <section className="mt-12">
      <div className="flex items-baseline justify-between border-b border-black/[0.08] pb-3 dark:border-white/10">
        <h2 className="font-serif text-title-20 font-medium text-neutral-10">
          {t('section_all')}
          <span className="ml-2 font-mono text-label-12 font-normal text-neutral-6">
            {searching ? `${visible.length} / ${links.length}` : links.length}
          </span>
        </h2>
        <span className="hidden text-label-12 text-neutral-7 md:inline">
          {t('section_all_hint')}
        </span>
      </div>

      <ul className="grid grid-cols-1 gap-x-8 md:grid-cols-2 lg:grid-cols-3">
        {visible.map((link, index) => (
          <li
            key={link.id}
            className={clsxm(
              collapsed && index >= MOBILE_PREVIEW && 'max-md:hidden',
            )}
          >
            <a
              href={link.url}
              rel="noreferrer"
              target="_blank"
              title={link.description ?? undefined}
              className={clsxm(
                'group grid h-[52px] grid-cols-[24px_1fr_auto] items-center gap-2.5 border-b border-black/[0.08] dark:border-white/10',
                searching &&
                  'bg-[linear-gradient(90deg,color-mix(in_srgb,var(--color-accent)_8%,transparent),transparent_80%)]',
              )}
            >
              <Avatar
                randomColor
                alt=""
                size="sm"
                src={link.avatar}
                text={link.name}
              />
              <span className="min-w-0">
                <span className="block truncate text-copy-13 font-medium text-neutral-9 group-hover:text-neutral-10">
                  {link.name}
                </span>
                <span className="block truncate font-mono text-caption-10 text-neutral-6">
                  {linkDomain(link.url)}
                </span>
              </span>
              <i className="i-mingcute-arrow-right-up-line text-icon-sm text-neutral-6 opacity-0 transition-opacity group-hover:opacity-100" />
            </a>
          </li>
        ))}
      </ul>

      {visible.length === 0 && (
        <p className="py-6 text-copy-13 text-neutral-7">{t('search_empty')}</p>
      )}

      {collapsed && ordered.length > MOBILE_PREVIEW && (
        <button
          className="mt-3 h-10 w-full rounded-lg bg-neutral-2 text-copy-13 text-neutral-8 md:hidden"
          type="button"
          onClick={() => setExpanded(true)}
        >
          {t('show_all', { count: links.length })}
        </button>
      )}
    </section>
  )
}

export const CollectionLinks = ({ links }: { links: LinkModel[] }) => {
  const t = useTranslations('friends')
  if (links.length === 0) return null

  return (
    <section className="mt-10">
      <div className="font-mono text-caption-10 uppercase tracking-[1.5px] text-neutral-6">
        {t('section_collections')}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
        {links.map((link) => (
          <li key={link.id}>
            <a
              className="text-copy-13 text-neutral-8 hover:text-neutral-10"
              href={link.url}
              rel="noreferrer"
              target="_blank"
              title={link.description ?? undefined}
            >
              {link.name}
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}

export const LostLinks = ({
  outdated,
  banned,
}: {
  outdated: LinkModel[]
  banned: LinkModel[]
}) => {
  const t = useTranslations('friends')
  if (outdated.length + banned.length === 0) return null

  return (
    <details className="group mt-4 text-label-12 text-neutral-7">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 [&::-webkit-details-marker]:hidden">
        {t('lost_summary', {
          outdated: outdated.length,
          banned: banned.length,
        })}
        <i className="i-mingcute-add-line text-icon-sm text-neutral-6 group-open:hidden" />
        <i className="i-mingcute-minimize-line hidden text-icon-sm text-neutral-6 group-open:inline" />
      </summary>
      {outdated.length > 0 && (
        <div className="mt-3">
          <div className="text-neutral-7">{t('section_outdated')}</div>
          <p className="mt-1 leading-5 text-neutral-6">
            {outdated.map((link) => link.name).join(' · ')}
          </p>
        </div>
      )}
      {banned.length > 0 && (
        <div className="mt-3">
          <div className="text-neutral-7">{t('section_banned')}</div>
          <p className="mt-1 leading-5 text-neutral-6 line-through">
            {banned.map((link) => link.name).join(' · ')}
          </p>
        </div>
      )}
    </details>
  )
}
