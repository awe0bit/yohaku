'use client'

import { useTranslations } from 'next-intl'
import { Fragment } from 'react'

import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '~/components/ui/dropdown-menu'
import { InkStroke } from '~/components/ui/paper-panel'

import { useCheckoutModal } from './CheckoutModal'
import { useSponsorArchiveModal } from './SponsorArchiveModal'
import {
  isActiveMembership,
  useMembershipEnabled,
  useMembershipStatus,
} from './useMembership'

export const MembershipMenuEntry = () => {
  const t = useTranslations('membership')
  const { data } = useMembershipStatus()
  const membershipEnabled = useMembershipEnabled()
  const presentCheckout = useCheckoutModal()
  const presentArchive = useSponsorArchiveModal()
  const archiveItem = (
    <DropdownMenuItem
      icon={<i className="i-mingcute-book-2-line size-4" />}
      onClick={() => presentArchive()}
    >
      {t('menu_archive')}
    </DropdownMenuItem>
  )

  if (data && isActiveMembership(data)) {
    const end =
      'currentPeriodEnd' in data
        ? new Date(data.currentPeriodEnd).toLocaleDateString()
        : undefined
    return (
      <Fragment>
        <DropdownMenuSeparator className="mx-0.5 my-0" />
        <div className="flex items-baseline justify-between gap-3 px-2.5 pb-3.5 pt-3">
          <span className="relative inline-flex items-center gap-1.5 text-[var(--yohaku-accent-deep)]">
            <i className="i-mingcute-vip-1-line size-[13px] self-center" />
            <span className="[font-family:var(--font-logo-latin)] text-[16px] italic leading-none">
              {t('badge_member')}
            </span>
            <InkStroke className="absolute -bottom-[7px] left-[17px] h-1.5 w-[58px] opacity-80" />
          </span>
          {end ? (
            <span className="whitespace-nowrap text-[11.5px] tabular-nums text-neutral-6">
              {t('expire_at', { date: end })}
            </span>
          ) : null}
        </div>
        <DropdownMenuSeparator className="mx-0.5 my-0" />
        <DropdownMenuGroup className="py-1">{archiveItem}</DropdownMenuGroup>
      </Fragment>
    )
  }

  if (!membershipEnabled) return null

  return (
    <Fragment>
      <DropdownMenuSeparator className="mx-0.5 my-0" />
      <DropdownMenuGroup className="py-1">
        <DropdownMenuItem
          className="font-medium text-[var(--yohaku-accent-deep)] data-[highlighted]:text-[var(--yohaku-accent-deep)]"
          icon={<i className="i-mingcute-vip-1-line size-4" />}
          onClick={() => presentCheckout()}
        >
          {t('menu_become_member')}
        </DropdownMenuItem>
        {archiveItem}
      </DropdownMenuGroup>
    </Fragment>
  )
}
