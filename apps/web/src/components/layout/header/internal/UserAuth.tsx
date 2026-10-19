'use client'

import { AnimatePresence } from 'motion/react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import type { CSSProperties } from 'react'
import { Fragment } from 'react'

import { getAdminUrl } from '~/atoms'
import { useIsOwnerLogged } from '~/atoms/hooks/owner'
import { useSessionReader } from '~/atoms/hooks/reader'
import { fetchAppUrl } from '~/atoms/hooks/url'
import { useIsMobile } from '~/atoms/hooks/viewport'
import { UserArrowLeftIcon } from '~/components/icons/user-arrow-left'
import {
  MembershipMenuEntry,
  useIsActiveMember,
} from '~/components/modules/membership'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { EllipsisHorizontalTextWithTooltip } from '~/components/ui/typography'
import { useIsClient } from '~/hooks/common/use-is-client'
import { authClient } from '~/lib/authjs'
import { clsxm } from '~/lib/helper'
import { apiClient } from '~/lib/request'
import { useAggregationSelector } from '~/providers/root/aggregation-data-provider'
import { useHasProviders, useOauthLoginModal } from '~/queries/hooks/authjs'

import { HeaderActionButton } from './HeaderActionButton'
import { useMenuOpacity } from './hooks'
import { UserAuthFromIcon } from './UserAuthFromIcon'

const OwnerAvatar = ({ size }: { size: number }) => {
  const t = useTranslations('common')
  const ownerAvatar = useAggregationSelector((s) => s.user.avatar)!

  return (
    <div className="pointer-events-auto relative flex items-center justify-center">
      <Image
        alt={t('aria_site_owner_avatar')}
        className="rounded-full"
        height={size}
        src={ownerAvatar}
        width={size}
      />
      <UserAuthFromIcon className="absolute -bottom-1 right-0" />
    </div>
  )
}
export function UserAuth({ size = 28 }: { size?: number }) {
  const t = useTranslations('common')
  const isOwner = useIsOwnerLogged()
  const isClient = useIsClient()
  const session = useSessionReader()
  const isMobile = useIsMobile()
  const menuOpacity = useMenuOpacity()
  const opacityStyle: CSSProperties | undefined =
    isMobile && menuOpacity !== undefined
      ? {
          opacity: menuOpacity,
          visibility: menuOpacity === 0 ? 'hidden' : 'visible',
        }
      : undefined
  const hasProviders = useHasProviders()

  const presentOauthModal = useOauthLoginModal()

  const hoverOnly = !isMobile

  if (!isClient) return null

  return (
    <AnimatePresence>
      <div style={opacityStyle}>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger nativeButton={false} openOnHover={hoverOnly}>
            {isOwner ? (
              <OwnerAvatar size={size} />
            ) : session ? (
              <ReaderAvatar size={size} />
            ) : (
              hasProviders && (
                <HeaderActionButton
                  aria-label={t('aria_login')}
                  style={{ width: size, height: size }}
                  onClick={() => {
                    presentOauthModal()
                  }}
                >
                  <UserArrowLeftIcon className="size-4" />
                </HeaderActionButton>
              )
            )}
          </DropdownMenuTrigger>

          {(session || isOwner) && (
            <DropdownMenuContent
              keepMounted
              align="end"
              className="relative flex w-[264px] flex-col px-2 pb-2 pt-4"
              positionMethod="fixed"
              sideOffset={8}
            >
              <AccountCard />
              {session && !isOwner && <MembershipMenuEntry />}

              {isOwner && (
                <Fragment>
                  <DropdownMenuSeparator className="mx-0.5 my-0" />
                  <DropdownMenuGroup className="py-1">
                    <DropdownMenuItem
                      icon={
                        <i className="i-mingcute-dashboard-2-line size-4" />
                      }
                      onClick={async () => {
                        let adminUrl = getAdminUrl()
                        if (!adminUrl) {
                          const data = await fetchAppUrl().catch(() => null)
                          adminUrl = data?.adminUrl ?? getAdminUrl()
                        }
                        if (adminUrl) {
                          window.open(adminUrl, '_blank')
                        }
                      }}
                    >
                      {t('auth_console')}
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </Fragment>
              )}
              <DropdownMenuSeparator className="mx-0.5 mb-1 mt-0" />
              <DropdownMenuItem
                className="text-neutral-6"
                icon={<i className="i-mingcute-exit-line size-4" />}
                onClick={async () => {
                  await apiClient.owner.logout().catch(() => {})
                  await authClient.signOut().then((res) => {
                    if (res.data?.success) window.location.reload()
                  })
                }}
              >
                {t('auth_logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          )}
        </DropdownMenu>
      </div>
    </AnimatePresence>
  )
}

const AccountCard = () => {
  const session = useSessionReader()
  const owner = useAggregationSelector((s) => s.user)
  const isOwner = useIsOwnerLogged()
  const image = session?.image ?? (isOwner ? owner?.avatar : undefined)
  const name = session?.name ?? (isOwner ? owner?.name : undefined)
  const handle = session
    ? session.handle
      ? `@${session.handle}`
      : session.email
    : isOwner && owner?.username
      ? `@${owner.username}`
      : null

  if (!name) return null

  return (
    <div className="flex min-w-0 items-center gap-3 px-2.5 pb-3.5">
      {image ? (
        <img alt="" className="size-9 shrink-0 rounded-full" src={image} />
      ) : null}
      <div className="flex min-w-0 flex-col gap-[3px]">
        <span className="truncate [font-family:var(--font-logo-latin)] text-[18px] leading-[1.15] text-neutral-10">
          {name}
        </span>
        {handle ? (
          <EllipsisHorizontalTextWithTooltip className="min-w-0 truncate text-label-12 leading-[1.2] text-neutral-6">
            {handle}
          </EllipsisHorizontalTextWithTooltip>
        ) : null}
      </div>
    </div>
  )
}

const ReaderAvatar = ({ size }: { size: number }) => {
  const session = useSessionReader()!
  const isMember = useIsActiveMember()

  return (
    <div className="pointer-events-auto relative flex items-center justify-center">
      <Image
        alt={session.name}
        className={clsxm('rounded-full', isMember && 'ring-2 ring-accent/70')}
        height={size}
        src={session.image}
        width={size}
      />
      <UserAuthFromIcon className="absolute -bottom-1 right-0" />
    </div>
  )
}
