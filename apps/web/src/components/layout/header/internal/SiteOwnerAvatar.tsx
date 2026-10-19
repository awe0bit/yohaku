'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'

import { useOwnerStatus } from '~/atoms/hooks/status'
import { clsxm } from '~/lib/helper'
import { useAggregationSelector } from '~/providers/root/aggregation-data-provider'

import { OwnerStatus } from './OwnerStatus'
import { useLiveQuery } from './useLiveQuery'

export const SiteOwnerAvatar: Component<{ size?: number }> = ({
  className,
  size = 40,
}) => {
  const t = useTranslations('common')
  const avatar = useAggregationSelector((data) => data.user.avatar)

  const { data: isLiving } = useLiveQuery()

  const ownerStatus = useOwnerStatus()
  if (!avatar) return

  return (
    <div
      role={isLiving ? 'button' : 'img'}
      style={{ width: size, height: size }}
      className={clsxm(
        'pointer-events-none relative z-[9] select-none',
        isLiving ? 'cursor-pointer' : '',
        className,
      )}
    >
      <div className="mask mask-squircle overflow-hidden">
        <Image
          alt={t('aria_site_owner_avatar')}
          className="ring-2 ring-neutral-3"
          height={size}
          src={avatar}
          width={size}
          style={
            ownerStatus && !isLiving
              ? {
                  maskSize: '100% 100%',
                  maskImage: `url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0wIDBINDBWMjcuMzQyN0MzOC4zNSAyNS4zMDM3IDM1LjgyNzMgMjQgMzMgMjRDMjguMDI5NCAyNCAyNCAyOC4wMjk0IDI0IDMzQzI0IDM1LjgyNzMgMjUuMzAzNyAzOC4zNSAyNy4zNDI3IDQwSDBWMFoiIGZpbGw9IiNEOUQ5RDkiLz4KPC9zdmc+Cg==")`,
                }
              : undefined
          }
        />
      </div>
      {!isLiving && <OwnerStatus compact={size < 40} />}
      {isLiving && (
        <span className="absolute -bottom-1.5 left-1/2 z-[1] -translate-x-1/2 text-[8px] font-semibold leading-none tracking-[1.5px] text-error">
          LIVE
        </span>
      )}
    </div>
  )
}
