'use client'

import type { LinkModel } from '@mx-space/api-client'
import { useTranslations } from 'next-intl'
import type { CSSProperties } from 'react'

import { Avatar } from '~/components/ui/avatar'
import { clsxm } from '~/lib/helper'

import { linkDomain } from './constellation'

export const StarCard = ({
  link,
  docked,
  style,
}: {
  link: LinkModel | null
  docked: boolean
  style?: CSSProperties
}) => {
  const t = useTranslations('friends')

  return (
    <div
      aria-hidden={!link}
      style={docked ? undefined : style}
      className={clsxm(
        'absolute z-20 rounded-xl bg-paper/90 p-3.5 ring-1 ring-border backdrop-blur-xl transition-[opacity,translate] duration-200',
        'shadow-[0_8px_28px_-12px_rgba(0,0,0,0.22)] dark:shadow-[0_12px_32px_-12px_rgba(0,0,0,0.7)]',
        docked ? 'inset-x-3 bottom-11 bg-paper/95' : 'w-[260px]',
        link ? 'opacity-100' : 'pointer-events-none translate-y-1 opacity-0',
      )}
    >
      {link && (
        <>
          <div className="flex items-center gap-2.5">
            <Avatar
              randomColor
              alt=""
              lazy={false}
              size={32}
              src={link.avatar}
              text={link.name}
            />
            <div className="min-w-0">
              <div className="truncate text-copy-13 font-medium text-neutral-10">
                {link.name}
              </div>
              <div className="truncate font-mono text-caption-10 text-neutral-6">
                {linkDomain(link.url)}
              </div>
            </div>
          </div>
          <p className="mt-2.5 font-serif text-copy-13 text-neutral-8">
            {link.description || t('star_no_description')}
          </p>
          <a
            className="mt-2.5 inline-block text-label-12 text-accent"
            href={link.url}
            rel="noreferrer"
            target="_blank"
          >
            {t('star_visit')} ↗
          </a>
        </>
      )}
    </div>
  )
}
