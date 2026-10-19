'use client'

import { NavigationMenu } from '@base-ui/react/navigation-menu'
import { useTranslations } from 'next-intl'
import type { FC } from 'react'

import { Link } from '~/i18n/navigation'
import { clsxm } from '~/lib/helper'

import { useHeaderConfigValue } from '../HeaderDataConfigureProvider'
import { mergeAndSortTopEntries } from './rows'
import type { DropdownProps } from './shared'
import {
  DatedIndexLink,
  footerLinkClassName,
  PanelFooter,
  renderPathLink,
  rowClassName,
  RowTick,
  SectionLabel,
  TwoColumns,
  WIDE_PANEL,
} from './shared'

export const TimelineDropdown: FC<DropdownProps> = ({ section }) => {
  const t = useTranslations('common')
  const items = section.subMenu || []
  const topData = useHeaderConfigValue('topDataAtom')
  const recentEntries = mergeAndSortTopEntries(topData)

  return (
    <div className={clsxm(WIDE_PANEL, 'px-[18px] pb-3 pt-[18px]')}>
      <TwoColumns
        left={
          <>
            <SectionLabel>{t('nav_dropdown_categories')}</SectionLabel>
            <div className="flex flex-col gap-0.5">
              {items.map((item) => (
                <NavigationMenu.Link
                  closeOnClick
                  className={clsxm(rowClassName, 'h-8 py-0')}
                  key={item.path}
                  render={renderPathLink(item.path)}
                >
                  <RowTick />
                  <span className="truncate">
                    {item.titleKey ? t(item.titleKey as any) : item.title}
                  </span>
                </NavigationMenu.Link>
              ))}
            </div>
          </>
        }
        right={
          <>
            <SectionLabel>{t('nav_dropdown_recent_activity')}</SectionLabel>
            <div className="flex flex-col gap-0.5">
              {recentEntries.map((entry) => (
                <DatedIndexLink
                  date={entry.createdAt}
                  href={entry.href}
                  key={entry.id}
                  title={entry.title}
                  trailing={
                    <span className="text-caption-10 tracking-[1px] text-neutral-5">
                      {entry.type === 'post' ? t('nav_posts') : t('nav_notes')}
                    </span>
                  }
                />
              ))}
              {recentEntries.length === 0 && (
                <div className="px-3 py-4 text-label-12 text-neutral-6">
                  {t('empty_nothing')}
                </div>
              )}
            </div>
          </>
        }
      />

      <PanelFooter>
        <NavigationMenu.Link
          closeOnClick
          className={footerLinkClassName}
          render={<Link href={section.path} />}
        >
          {t('nav_dropdown_view_timeline')} →
        </NavigationMenu.Link>
      </PanelFooter>
    </div>
  )
}
