'use client'

import { useTranslations } from 'next-intl'
import { useCallback } from 'react'

import { isOwnerLogged } from '~/atoms/hooks/owner'
import { useResolveAdminUrl } from '~/atoms/hooks/url'
import { useSingleAndDoubleClick } from '~/hooks/common/use-single-double-click'
import { useRouter } from '~/i18n/navigation'
import { noopObj } from '~/lib/noop'
import { Routes } from '~/lib/route-builder'
import { useAppConfigSelector } from '~/providers/root/aggregation-data-provider'

import { SiteOwnerAvatar } from './SiteOwnerAvatar'
import { useLiveQuery } from './useLiveQuery'

export const TapableLogo: Component<{ size?: number }> = ({
  className,
  size = 40,
}) => {
  const router = useRouter()
  const t = useTranslations('common')

  const { data: isLiving } = useLiveQuery()

  const { liveId } = (useAppConfigSelector(
    (config) => config.module?.bilibili,
  ) || noopObj) as Bilibili

  const goLive = useCallback(() => {
    window.open(`https://live.bilibili.com/${liveId}`)
  }, [liveId])

  const resolveAdminUrl = useResolveAdminUrl()

  const fn = useSingleAndDoubleClick(
    () => {
      if (isLiving) return goLive()
      router.push(Routes.Home)
    },
    () => {
      if (isOwnerLogged()) {
        location.href = resolveAdminUrl()

        return
      }
      router.push(
        `${Routes.Login}?redirect=${encodeURIComponent(location.pathname)}`,
      )
    },
  )

  return (
    <button className={className} type="button" onClick={fn}>
      <SiteOwnerAvatar className="cursor-pointer" size={size} />
      <span className="sr-only">{t('aria_site_owner_avatar')}</span>
    </button>
  )
}
