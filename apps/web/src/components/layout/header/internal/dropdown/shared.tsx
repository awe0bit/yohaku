'use client'

import { NavigationMenu } from '@base-ui/react/navigation-menu'
import type { FC, ReactNode } from 'react'

import { InkTick } from '~/components/ui/paper-panel'
import { Link } from '~/i18n/navigation'
import { clsxm } from '~/lib/helper'

import type { IHeaderMenu } from '../../config'

export interface DropdownProps {
  section: IHeaderMenu
}

export const WIDE_PANEL = 'w-[520px]'
export const NARROW_PANEL = 'w-[360px]'

export const rowClassName =
  'group/row relative flex items-center px-3 py-[7px] text-copy-13 text-neutral-8 outline-none transition-colors hover:text-neutral-10 focus-visible:text-neutral-10 data-[hovered]:text-neutral-10'

export const rowMetaClassName =
  'text-neutral-6 transition-colors group-hover/row:text-[var(--yohaku-accent-deep)] group-focus-visible/row:text-[var(--yohaku-accent-deep)] group-data-[hovered]/row:text-[var(--yohaku-accent-deep)]'

export const RowTick = () => (
  <InkTick className="hidden group-hover/row:block group-focus-visible/row:block group-data-[hovered]/row:block" />
)

export const SectionLabel: Component = ({ children, className }) => (
  <div
    className={clsxm(
      'mb-2.5 px-3 text-caption-10 tracking-[4px] text-neutral-6',
      className,
    )}
  >
    {children}
  </div>
)

export const TwoColumns: FC<{ left: ReactNode; right: ReactNode }> = ({
  left,
  right,
}) => (
  <div className="grid grid-cols-[150px_minmax(0,1fr)]">
    <div className="min-w-0 pr-3.5">{left}</div>
    <div className="paper-hairline min-w-0 border-l-[0.5px] pl-3.5">
      {right}
    </div>
  </div>
)

export const PanelFooter: Component = ({ children, className }) => (
  <div
    className={clsxm(
      'paper-hairline mt-3 flex items-baseline justify-between border-t-[0.5px] px-3 pt-2.5 text-label-12 text-neutral-7',
      className,
    )}
  >
    {children}
  </div>
)

export const footerLinkClassName = 'transition-colors hover:text-neutral-10'

const formatMonthDay = (date: string | Date) => {
  const d = new Date(date)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getMonth() + 1)}·${pad(d.getDate())}`
}

export const DatedIndexLink: FC<{
  date: string | Date
  href: string
  title: string
  trailing?: ReactNode
}> = ({ date, href, title, trailing }) => (
  <NavigationMenu.Link
    closeOnClick
    render={<Link href={href} />}
    className={clsxm(
      rowClassName,
      'grid h-8 grid-cols-[44px_minmax(0,1fr)_auto] gap-2.5 py-0',
    )}
  >
    <RowTick />
    <time
      dateTime={new Date(date).toISOString()}
      className={clsxm(
        'font-mono text-label-12 tabular-nums',
        rowMetaClassName,
      )}
    >
      {formatMonthDay(date)}
    </time>
    <span className="truncate">{title}</span>
    {trailing ?? <span />}
  </NavigationMenu.Link>
)

export const PlaceholderRow = ({ empty = false }: { empty?: boolean }) =>
  empty ? (
    <div aria-hidden className="h-8" />
  ) : (
    <div
      aria-hidden
      className="grid h-8 grid-cols-[44px_minmax(0,1fr)] items-center gap-2.5 px-3"
    >
      <span className="h-[9px] w-8 rounded-sm bg-neutral-3/50" />
      <span className="h-[9px] w-3/4 rounded-sm bg-neutral-3/40" />
    </div>
  )

export const renderPathLink = (path: string, onClick?: IHeaderMenu['do']) =>
  path.startsWith('http') ? (
    <a href={path} rel="noopener noreferrer" target="_blank" />
  ) : (
    <Link href={path} onClick={onClick} />
  )
