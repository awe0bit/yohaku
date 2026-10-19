'use client'

import clsx from 'clsx'
import { useAtomValue } from 'jotai'
import { AnimatePresence, m, useReducedMotion } from 'motion/react'
import { useTranslations } from 'next-intl'
import { memo, useId, useState } from 'react'

import { liveDeskAtom } from '~/atoms/live-desk'
import { getServerTime } from '~/components/common/SyncServerTime'
import { FloatPopover } from '~/components/ui/float-popover'
import { usePageIsActive } from '~/hooks/common/use-is-active'
import { resolveActivityAppIconURL } from '~/lib/activity-assets'
import {
  createLiveDeskPresentation,
  type LiveDeskApplicationPresentation,
  type LiveDeskMediaPresentation,
} from '~/lib/live-desk/presentation'
import { useAggregationSelector } from '~/providers/root/aggregation-data-provider'

import styles from './LiveDeskActivity.module.css'
import {
  liveDeskPopoverClassName,
  LiveDeskPopoverContent,
  liveDeskTrackKey,
} from './LiveDeskPopover'
import {
  LiveDeskInkMeter,
  LiveDeskStamp,
  mediaFallbackIconClass,
  PaperSlipIcon,
} from './LiveDeskPrimitives'

export const LiveDeskActivity = memo(
  ({ appIcons }: { appIcons: Record<string, string> }) => {
    const liveDeskState = useAtomValue(liveDeskAtom)
    const presentation = createLiveDeskPresentation(
      liveDeskState,
      getServerTime().getTime(),
    )
    const isPageActive = usePageIsActive()
    const ownerName = useAggregationSelector((data) => data.user.name) || ''
    const t = useTranslations('common')

    if (!isPageActive || !presentation.visible) return null

    const applicationIconURL = presentation.application
      ? resolveActivityAppIconURL(
          presentation.application.displayName,
          presentation.application.iconURL,
          appIcons,
        )
      : null
    const mediaIconURL = presentation.media
      ? (presentation.media.artworkURL ??
        resolveActivityAppIconURL(
          presentation.media.playerDisplayName,
          null,
          appIcons,
        ))
      : null

    const applicationLabel = presentation.application
      ? `${t('activity_process_status', {
          owner: ownerName,
          verb: t('activity_verb_use'),
        })} ${presentation.application.displayName}`
      : ''
    const mediaSubject =
      presentation.media?.title ||
      presentation.media?.artist ||
      presentation.media?.playerDisplayName ||
      ''
    const mediaLabel = presentation.media
      ? `${
          presentation.media.playerDisplayName
            ? t('activity_media_with_app', {
                app: presentation.media.playerDisplayName,
                owner: ownerName,
                verb: t('activity_verb_listen'),
              })
            : t('activity_media_without_app', {
                owner: ownerName,
                verb: t('activity_verb_listen'),
              })
        } ${mediaSubject}`
      : ''

    return (
      <LiveDeskTicket
        application={presentation.application}
        applicationIconURL={applicationIconURL}
        applicationLabel={applicationLabel}
        media={presentation.media}
        mediaIconURL={mediaIconURL}
        mediaLabel={mediaLabel}
        ownerName={ownerName}
      />
    )
  },
)
LiveDeskActivity.displayName = 'LiveDeskActivity'

const LiveDeskTicket = ({
  application,
  applicationIconURL,
  applicationLabel,
  media,
  mediaIconURL,
  mediaLabel,
  ownerName,
}: {
  application: LiveDeskApplicationPresentation | null
  applicationIconURL: string | null
  applicationLabel: string
  media: LiveDeskMediaPresentation | null
  mediaIconURL: string | null
  mediaLabel: string
  ownerName: string
}) => {
  const [open, setOpen] = useState(false)
  const reduceMotion = useReducedMotion()
  const detailsId = useId()
  const trackKey = liveDeskTrackKey(media, application)
  const primaryIconURL = media ? mediaIconURL : applicationIconURL
  const primaryFallbackIconClass = media
    ? mediaFallbackIconClass
    : 'i-mingcute-computer-line'
  const label = [mediaLabel, applicationLabel].filter(Boolean).join('. ')
  const playbackURL = media?.playbackURL

  return (
    <FloatPopover
      asChild
      headless
      placement="bottom-start"
      popoverClassNames={liveDeskPopoverClassName}
      strategy="fixed"
      trigger="hover"
      type="tooltip"
      triggerElement={
        <m.button
          aria-describedby={open ? detailsId : undefined}
          aria-label={label}
          data-open={open || undefined}
          type="button"
          whileTap={reduceMotion ? undefined : { scale: 0.97 }}
          className={clsx(
            styles.ticket,
            'pointer-events-auto flex h-[34px] min-w-0 max-w-[250px] shrink items-center gap-2 pl-1 pr-2 text-left font-sans outline-none',
            'focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-1',
          )}
          onClick={
            playbackURL
              ? () => {
                  window.open(playbackURL, '_blank', 'noopener,noreferrer')
                }
              : undefined
          }
        >
          <LiveDeskStamp size="sm">
            <span
              className={clsx(
                'grid place-items-center text-neutral-7',
                media ? 'size-full' : 'size-4',
              )}
            >
              <PaperSlipIcon
                fallbackIconClass={primaryFallbackIconClass}
                fallbackSizeClass="text-[13px]"
                key={primaryIconURL || primaryFallbackIconClass}
                src={primaryIconURL}
              />
            </span>
          </LiveDeskStamp>

          <AnimatePresence initial={false} mode="wait">
            <m.span
              animate={{ opacity: 1, y: 0 }}
              className="flex min-w-0 items-center gap-1.5 text-copy-13"
              exit={{ opacity: 0, y: reduceMotion ? 0 : -3 }}
              initial={{ opacity: 0, y: reduceMotion ? 0 : 3 }}
              key={trackKey}
              transition={{
                duration: reduceMotion ? 0.1 : 0.2,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              {media ? (
                <span className="truncate font-serif text-neutral-8">
                  {media.title ||
                    media.artist ||
                    media.playerDisplayName ||
                    'Media'}
                </span>
              ) : application ? (
                <>
                  <span className="shrink-0 text-neutral-8">
                    {application.displayName}
                  </span>
                  {application.detail ? (
                    <span className="truncate text-neutral-6">
                      · {application.detail}
                    </span>
                  ) : null}
                </>
              ) : null}
            </m.span>
          </AnimatePresence>

          {media ? (
            <span className="flex shrink-0 items-center text-[var(--yohaku-accent-deep)]">
              <LiveDeskInkMeter playbackState={media.playbackState} />
            </span>
          ) : null}
        </m.button>
      }
      onClose={() => setOpen(false)}
      onOpen={() => setOpen(true)}
    >
      <LiveDeskPopoverContent
        application={application}
        applicationIconURL={applicationIconURL}
        id={detailsId}
        media={media}
        mediaIconURL={mediaIconURL}
        ownerName={ownerName}
      />
    </FloatPopover>
  )
}

export const LiveDeskStripMeter = () => {
  const liveDeskState = useAtomValue(liveDeskAtom)
  const isPageActive = usePageIsActive()
  const presentation = createLiveDeskPresentation(
    liveDeskState,
    getServerTime().getTime(),
  )
  const playbackState = presentation.visible
    ? presentation.media?.playbackState
    : undefined
  if (!isPageActive || !playbackState) return null
  return (
    <span className="flex items-center text-[var(--yohaku-accent-deep)]">
      <LiveDeskInkMeter playbackState={playbackState} />
    </span>
  )
}
