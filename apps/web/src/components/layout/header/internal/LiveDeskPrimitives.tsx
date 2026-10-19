'use client'

import clsx from 'clsx'
import type { ReactNode } from 'react'
import { memo, useState } from 'react'

import type { LiveDeskMediaPresentation } from '~/lib/live-desk/presentation'

import styles from './LiveDeskActivity.module.css'

export const mediaFallbackIconClass = 'i-mingcute-music-2-line'

export const LiveDeskInkMeter = ({
  playbackState,
}: {
  playbackState: LiveDeskMediaPresentation['playbackState']
}) => (
  <span aria-hidden className={styles.inkMeter} data-playback={playbackState}>
    <span className={styles.inkMeterBar} />
    <span className={styles.inkMeterBar} />
    <span className={styles.inkMeterBar} />
  </span>
)

export const PaperSlipIcon = memo(
  ({
    fallbackIconClass,
    fallbackSizeClass = 'text-icon-md',
    src,
  }: {
    fallbackIconClass: string
    fallbackSizeClass?: string
    src: string | null
  }) => {
    const [failed, setFailed] = useState(false)

    if (!src || failed) {
      return (
        <i aria-hidden className={clsx(fallbackIconClass, fallbackSizeClass)} />
      )
    }

    return (
      <img
        alt=""
        className="size-full rounded-[2px] object-cover"
        draggable={false}
        src={src}
        onError={() => setFailed(true)}
      />
    )
  },
)
PaperSlipIcon.displayName = 'PaperSlipIcon'

const stampSizeClass = {
  sm: styles.stampSm,
  md: styles.stampMd,
  lg: styles.stampLg,
} as const

export const LiveDeskStamp = ({
  children,
  size,
}: {
  children: ReactNode
  size: keyof typeof stampSizeClass
}) => (
  <span aria-hidden className={clsx(styles.stampLift, stampSizeClass[size])}>
    <span className={styles.stamp}>{children}</span>
  </span>
)
