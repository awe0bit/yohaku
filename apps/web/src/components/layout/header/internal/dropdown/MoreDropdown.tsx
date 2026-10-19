'use client'

import { NavigationMenu } from '@base-ui/react/navigation-menu'
import { useTranslations } from 'next-intl'
import type { FC } from 'react'

import { clsxm } from '~/lib/helper'

import type { DropdownProps } from './shared'
import { NARROW_PANEL, renderPathLink, rowClassName, RowTick } from './shared'

export const MoreDropdown: FC<DropdownProps> = ({ section }) => {
  const t = useTranslations('common')
  const items = section.subMenu || []

  return (
    <div className={clsxm(NARROW_PANEL, 'flex flex-col gap-0.5 px-3.5 py-3')}>
      {items.map((item) => {
        const isExternal = item.path.startsWith('http')
        const description = item.descriptionKey
          ? t(item.descriptionKey as any)
          : item.description
        return (
          <NavigationMenu.Link
            closeOnClick
            className={clsxm(rowClassName, 'items-baseline gap-2.5 py-[9px]')}
            key={item.path}
            render={renderPathLink(item.path)}
          >
            <RowTick />
            <span className="shrink-0 text-[13.5px] font-medium">
              {item.titleKey ? t(item.titleKey as any) : item.title}
              {isExternal && <span className="ml-1 text-neutral-6">↗</span>}
            </span>
            <span
              aria-hidden
              className="paper-hairline min-w-4 flex-1 -translate-y-[3px] border-b border-dotted"
            />
            {description && (
              <span className="shrink-0 text-label-12 text-neutral-6">
                {description}
              </span>
            )}
          </NavigationMenu.Link>
        )
      })}
    </div>
  )
}
