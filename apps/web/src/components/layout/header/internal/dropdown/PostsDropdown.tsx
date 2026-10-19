'use client'

import { NavigationMenu } from '@base-ui/react/navigation-menu'
import { useQuery } from '@tanstack/react-query'
import { useLocale, useTranslations } from 'next-intl'
import type { FC } from 'react'
import { useState } from 'react'

import { Link } from '~/i18n/navigation'
import { clsxm } from '~/lib/helper'
import { navigation } from '~/queries/definition/navigation'

import { useHeaderConfigValue } from '../HeaderDataConfigureProvider'
import { DROPDOWN_INDEX_ROWS, fillPlaceholderRows } from './rows'
import type { DropdownProps } from './shared'
import {
  DatedIndexLink,
  footerLinkClassName,
  PanelFooter,
  PlaceholderRow,
  rowClassName,
  rowMetaClassName,
  RowTick,
  SectionLabel,
  TwoColumns,
  WIDE_PANEL,
} from './shared'

export const PostsDropdown: FC<DropdownProps> = ({ section }) => {
  const t = useTranslations('common')
  const locale = useLocale()
  const categories = useHeaderConfigValue('categoriesAtom')
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null)
  const activeSlug = hoveredSlug || categories?.[0]?.slug || null

  const { data: postMenuData } = useQuery({
    ...navigation.posts(locale, activeSlug),
    enabled: !!activeSlug,
  })
  const rows = fillPlaceholderRows(
    postMenuData?.recentPosts,
    DROPDOWN_INDEX_ROWS,
  )
  const total = categories?.reduce((sum, c) => sum + c.count, 0) ?? 0

  return (
    <div className={clsxm(WIDE_PANEL, 'px-[18px] pb-3 pt-[18px]')}>
      <TwoColumns
        left={
          <>
            <SectionLabel>{t('nav_dropdown_categories')}</SectionLabel>
            <div className="flex flex-col gap-0.5">
              {categories?.map((cat) => (
                <NavigationMenu.Link
                  closeOnClick
                  className={clsxm(rowClassName, 'h-8 justify-between py-0')}
                  data-hovered={activeSlug === cat.slug ? '' : undefined}
                  key={cat.slug}
                  render={<Link href={`/categories/${cat.slug}`} />}
                  onMouseEnter={() => setHoveredSlug(cat.slug)}
                >
                  <RowTick />
                  <span className="truncate">{cat.name}</span>
                  <span
                    className={clsxm(
                      '[font-family:var(--font-logo-latin)] text-[14px] tabular-nums',
                      rowMetaClassName,
                    )}
                  >
                    {cat.count}
                  </span>
                </NavigationMenu.Link>
              ))}
            </div>
          </>
        }
        right={
          <>
            <SectionLabel>
              {categories?.find((c) => c.slug === activeSlug)?.name}
              {t('nav_dropdown_recent_suffix')}
            </SectionLabel>
            <div className="flex flex-col gap-0.5">
              {rows.map((post, index) =>
                post ? (
                  <DatedIndexLink
                    date={post.createdAt}
                    href={`/posts/${activeSlug}/${post.slug}`}
                    key={post.id}
                    title={post.title}
                  />
                ) : (
                  <PlaceholderRow
                    empty={!!postMenuData}
                    key={`placeholder-${index}`}
                  />
                ),
              )}
            </div>
          </>
        }
      />

      <PanelFooter>
        <NavigationMenu.Link
          closeOnClick
          className={footerLinkClassName}
          render={<Link href={section.path} onClick={section.do} />}
        >
          {t('nav_dropdown_view_all_posts')} →
        </NavigationMenu.Link>
        <span className="text-neutral-6">
          {t('nav_dropdown_posts_count', { count: total })}
        </span>
      </PanelFooter>
    </div>
  )
}
