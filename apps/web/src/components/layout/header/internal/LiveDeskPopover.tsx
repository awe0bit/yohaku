'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useId, useState } from 'react'

import { getServerTime } from '~/components/common/SyncServerTime'
import {
  paperPanelHostClassName,
  PaperPanelSurface,
} from '~/components/ui/paper-panel'
import { SlotText } from '~/components/ui/slot-text'
import {
  buildMediaByline,
  type LiveDeskApplicationPresentation,
  type LiveDeskMediaPresentation,
  projectMediaPositionMs,
} from '~/lib/live-desk/presentation'

import styles from './LiveDeskActivity.module.css'
import {
  LiveDeskStamp,
  mediaFallbackIconClass,
  PaperSlipIcon,
} from './LiveDeskPrimitives'

export const liveDeskTrackKey = (
  media: LiveDeskMediaPresentation | null,
  application: LiveDeskApplicationPresentation | null,
) =>
  media
    ? [media.title, media.artist, media.album].filter(Boolean).join(':') ||
      media.playerDisplayName ||
      media.kind
    : `${application?.displayName}:${application?.detail || ''}`

export const liveDeskPopoverClassName = `${paperPanelHostClassName} w-[21.5rem] max-w-[calc(100vw-2rem)] break-normal px-5 pb-4 pt-[18px] outline-hidden`

export const LiveDeskPopoverContent = ({
  application,
  applicationIconURL,
  id,
  media,
  mediaIconURL,
  ownerName,
}: {
  application: LiveDeskApplicationPresentation | null
  applicationIconURL: string | null
  id: string
  media: LiveDeskMediaPresentation | null
  mediaIconURL: string | null
  ownerName: string
}) => {
  const t = useTranslations('common')

  return (
    <div className="font-sans" id={id}>
      <PaperPanelSurface />
      <div className="flex items-center justify-between gap-3">
        <span className="text-caption-10 uppercase tracking-[0.35em] text-neutral-6">
          Live Desk
        </span>
        <span className="flex min-w-0 items-center gap-1.5 text-label-12 text-neutral-6">
          <span aria-hidden className={styles.liveDot} />
          <span className="truncate">
            {ownerName} {t('activity_desk_online')}
          </span>
        </span>
      </div>

      {media ? <MediaStage iconURL={mediaIconURL} media={media} /> : null}

      {application ? (
        media ? (
          <ApplicationFootnote
            application={application}
            iconURL={applicationIconURL}
          />
        ) : (
          <ApplicationRow
            application={application}
            iconURL={applicationIconURL}
          />
        )
      ) : null}
    </div>
  )
}

const ApplicationRow = ({
  application,
  iconURL,
}: {
  application: LiveDeskApplicationPresentation
  iconURL: string | null
}) => {
  const t = useTranslations('common')

  return (
    <section className="mt-3.5 flex min-w-0 items-center gap-4">
      <LiveDeskStamp size="md">
        <span className="grid size-10 place-items-center text-neutral-7">
          <PaperSlipIcon
            fallbackIconClass="i-mingcute-computer-line"
            fallbackSizeClass="text-[22px]"
            key={iconURL || application.displayName}
            src={iconURL}
          />
        </span>
      </LiveDeskStamp>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-caption-10 tracking-[0.08em] text-neutral-6">
          {t('activity_in_use')}
        </span>
        <span className="mt-1.5 truncate font-serif text-copy-16 text-neutral-10">
          {application.displayName}
        </span>
        {application.detail ? (
          <span className="mt-0.5 line-clamp-2 break-words text-label-12 text-neutral-7">
            {application.detail}
          </span>
        ) : null}
      </div>
    </section>
  )
}

const ApplicationFootnote = ({
  application,
  iconURL,
}: {
  application: LiveDeskApplicationPresentation
  iconURL: string | null
}) => {
  const t = useTranslations('common')

  return (
    <div className="paper-hairline mt-3 flex min-w-0 items-center gap-2 border-t-[0.5px] pt-2.5 text-label-12 text-neutral-6">
      <span className="grid size-3.5 shrink-0 place-items-center overflow-hidden rounded-[3.5px] text-neutral-7">
        <PaperSlipIcon
          fallbackIconClass="i-mingcute-computer-line"
          fallbackSizeClass="text-[13px]"
          key={iconURL || application.displayName}
          src={iconURL}
        />
      </span>
      <span className="min-w-0 truncate">
        {t.rich('activity_desk_using_inline', {
          app: (chunks) => <span className="text-neutral-8">{chunks}</span>,
          name: application.displayName,
        })}
        {application.detail ? ` · ${application.detail}` : null}
      </span>
    </div>
  )
}

const MediaStage = ({
  iconURL,
  media,
}: {
  iconURL: string | null
  media: LiveDeskMediaPresentation
}) => {
  const t = useTranslations('common')
  const [now, setNow] = useState(() => getServerTime().getTime())

  useEffect(() => {
    if (media.playbackState !== 'playing' || media.positionMs === null) return

    const timer = window.setInterval(
      () => setNow(getServerTime().getTime()),
      1_000,
    )
    return () => window.clearInterval(timer)
  }, [media.anchorAt, media.playbackState, media.positionMs])

  const positionMs = projectMediaPositionMs(media, now)
  const progress =
    positionMs !== null && media.durationMs !== null && media.durationMs > 0
      ? Math.min(100, Math.max(0, (positionMs / media.durationMs) * 100))
      : null
  const title =
    media.title || media.artist || media.playerDisplayName || 'Media'
  const byline = buildMediaByline(media)
  const stateText = t(
    media.playbackState === 'playing'
      ? 'activity_media_playing'
      : 'activity_media_paused',
  )

  return (
    <section className="mt-3.5">
      <div className="flex min-w-0 gap-4">
        <LiveDeskStamp size="lg">
          <span className="grid size-full place-items-center text-neutral-7">
            <PaperSlipIcon
              fallbackIconClass={mediaFallbackIconClass}
              fallbackSizeClass="text-[32px]"
              key={iconURL || media.playerDisplayName || media.kind}
              src={iconURL}
            />
          </span>
        </LiveDeskStamp>
        <div className="flex min-w-0 flex-1 flex-col pt-1">
          <span className="truncate text-caption-10 tracking-[0.08em] text-neutral-6">
            {media.playerDisplayName
              ? `${stateText} · ${media.playerDisplayName}`
              : stateText}
          </span>
          <span className="mt-2 line-clamp-2 font-serif text-copy-16 leading-snug text-neutral-10">
            {title}
          </span>
          {byline ? (
            <span className="mt-1 line-clamp-2 text-label-12 text-neutral-7">
              {byline}
            </span>
          ) : null}
        </div>
      </div>

      {positionMs !== null ? (
        <div className="mt-4">
          {progress !== null ? (
            <InkProgress
              progress={progress}
              valueText={`${formatDuration(positionMs / 1_000)} / ${formatDuration((media.durationMs ?? 0) / 1_000)}`}
            />
          ) : null}
          <div className="mt-1.5 flex items-center justify-between text-caption-10 tabular-nums text-neutral-6">
            <SlotText text={formatDuration(positionMs / 1_000)} />
            {media.durationMs !== null ? (
              <span>{formatDuration(media.durationMs / 1_000)}</span>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  )
}

const INK_PATH =
  'M2 7.4 C 38 5.6, 76 8.6, 116 6.6 S 196 5.4, 238 7.2 S 288 7.8, 302 6.2'

const InkProgress = ({
  progress,
  valueText,
}: {
  progress: number
  valueText: string
}) => {
  const t = useTranslations('common')
  const clipId = useId()

  return (
    <svg
      aria-label={t('aria_progress')}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={Math.round(progress)}
      aria-valuetext={valueText}
      className="block h-3.5 w-full overflow-visible"
      preserveAspectRatio="none"
      role="progressbar"
      viewBox="0 0 304 14"
    >
      <defs>
        <clipPath id={clipId}>
          <rect
            className={styles.inkProgressClip}
            height="14"
            width={(304 * progress) / 100}
          />
        </clipPath>
      </defs>
      <path
        className={styles.inkProgressTrack}
        d={INK_PATH}
        vectorEffect="non-scaling-stroke"
      />
      <path
        className={styles.inkProgressInk}
        clipPath={`url(#${clipId})`}
        d={INK_PATH}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

const formatDuration = (duration: number) => {
  duration = Math.floor(duration)
  const minutes = Math.floor(duration / 60)
  const seconds = duration % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
