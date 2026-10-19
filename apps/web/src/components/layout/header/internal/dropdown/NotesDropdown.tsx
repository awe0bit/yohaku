'use client'

import { NavigationMenu } from '@base-ui/react/navigation-menu'
import { useTranslations } from 'next-intl'
import type { FC } from 'react'

import { Link } from '~/i18n/navigation'
import { clsxm } from '~/lib/helper'
import { buildNotePath } from '~/lib/note-route'

import { useHeaderConfigValue } from '../HeaderDataConfigureProvider'
import type { DropdownProps } from './shared'
import {
  DatedIndexLink,
  footerLinkClassName,
  PanelFooter,
  rowClassName,
  RowTick,
  SectionLabel,
  TwoColumns,
  WIDE_PANEL,
} from './shared'

const EmptyHint = () => (
  <div className="px-3 py-4 text-label-12 text-neutral-6">...</div>
)

export const NotesDropdown: FC<DropdownProps> = ({ section }) => {
  const t = useTranslations('common')
  const topics = useHeaderConfigValue('topicsAtom')
  const recentNotes = useHeaderConfigValue('recentNotesAtom')

  return (
    <div className={clsxm(WIDE_PANEL, 'px-[18px] pb-3 pt-[18px]')}>
      <TwoColumns
        left={
          <>
            <SectionLabel>{t('nav_topics')}</SectionLabel>
            {topics && topics.length > 0 ? (
              <div className="flex flex-col gap-0.5">
                {topics.map((topic) => (
                  <NavigationMenu.Link
                    closeOnClick
                    className={clsxm(rowClassName, 'h-8 gap-2.5 py-0')}
                    key={topic.slug}
                    render={<Link href={`/notes/series/${topic.slug}`} />}
                  >
                    <RowTick />
                    {topic.icon && (
                      <img
                        alt=""
                        className="size-4 shrink-0 rounded-[3px] object-cover"
                        src={topic.icon}
                      />
                    )}
                    <span className="truncate">{topic.name}</span>
                  </NavigationMenu.Link>
                ))}
              </div>
            ) : (
              <EmptyHint />
            )}
          </>
        }
        right={
          <>
            <SectionLabel>{t('nav_dropdown_recent_notes')}</SectionLabel>
            <div className="flex flex-col gap-0.5">
              {recentNotes?.map((note) => (
                <DatedIndexLink
                  date={note.createdAt}
                  href={buildNotePath(note)}
                  key={note.nid}
                  title={note.title}
                />
              ))}
              {!recentNotes?.length && <EmptyHint />}
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
          {t('nav_dropdown_view_all_notes')} →
        </NavigationMenu.Link>
        <NavigationMenu.Link
          closeOnClick
          className={footerLinkClassName}
          render={<Link href="/notes/series" />}
        >
          {t('nav_dropdown_view_all_topics')} →
        </NavigationMenu.Link>
      </PanelFooter>
    </div>
  )
}
