'use client'

import { m } from 'motion/react'
import { useTranslations } from 'next-intl'
import type { MouseEvent, PropsWithChildren } from 'react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'

import { ImpressionView } from '~/components/common/ImpressionTracker'
import { expandPeekIntoPaper } from '~/components/layout/container/paper-swap'
import {
  NOTE_DETAIL_GRID_CLASS,
  NOTE_DETAIL_SIDE_COLUMN_CLASS,
} from '~/components/modules/note/note-detail-grid'
import { useModalStack } from '~/components/ui/modal'
import { TrackerAction } from '~/constants/tracker'
import { Link, useRouter } from '~/i18n/navigation'

import { LOOSE_POSE, loosePeekFrame, SET_DOWN_POSE } from './paper-peek'
import { withoutPeekParam, withPeekParam } from './peek-url'

const EASE = [0.22, 1, 0.36, 1] as const
const EASE_IN = [0.4, 0, 1, 1] as const
const LIFT_SHADOW =
  '0 0 0 0.5px rgba(0,0,0,0.03), 0 6px 14px rgba(0,0,0,0.05), 0 18px 40px rgba(0,0,0,0.08), 0 32px 72px -12px rgba(0,0,0,0.1)'
const FALLBACK_WIDTH = 840

function measureNoteColumn() {
  const host = document.querySelector('main.fill-content > div')
  if (host) {
    const probe = document.createElement('div')
    probe.style.cssText = 'visibility:hidden;height:0;overflow:hidden'
    probe.innerHTML = `<div class="${NOTE_DETAIL_GRID_CLASS}"><div class="${NOTE_DETAIL_SIDE_COLUMN_CLASS}"></div><div></div><div class="${NOTE_DETAIL_SIDE_COLUMN_CLASS}"></div></div>`
    host.append(probe)
    const column = probe.firstElementChild?.children[1]?.getBoundingClientRect()
    probe.remove()
    if (column && column.width > 0)
      return { left: column.left, width: column.width }
  }
  const width = Math.min(FALLBACK_WIDTH, window.innerWidth - 32)
  return { left: (window.innerWidth - width) / 2, width }
}

export const PaperPeekModal = ({
  children,
  to,
}: PropsWithChildren<{ to: string }>) => {
  const t = useTranslations('common')
  const router = useRouter()
  const { dismissAll, dismissTop } = useModalStack()
  const sheetRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const navigatingRef = useRef(false)
  const [frame, setFrame] = useState<ReturnType<typeof loosePeekFrame> | null>(
    null,
  )

  useLayoutEffect(() => {
    setFrame(
      loosePeekFrame(measureNoteColumn(), { height: window.innerHeight }),
    )
  }, [])

  useEffect(() => {
    history.replaceState({}, '', withPeekParam(location.href, to))
    return () => {
      if (navigatingRef.current) return
      history.replaceState({}, '', withoutPeekParam(location.href))
    }
  }, [to])

  const expand = (event: MouseEvent<HTMLAnchorElement>) => {
    navigatingRef.current = true
    const sheet = sheetRef.current
    const handedOff =
      !!sheet &&
      expandPeekIntoPaper(
        sheet,
        () => {
          // The modal's exit animation cannot run while the view transition
          // holds rendering, and would replay over the new page afterwards.
          sheet.style.visibility = 'hidden'
          if (backdropRef.current)
            backdropRef.current.style.visibility = 'hidden'
          dismissAll()
        },
        () => router.push(to),
      )
    if (handedOff) event.preventDefault()
    else dismissAll()
  }

  return (
    <>
      <m.div
        aria-hidden
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-[rgba(245,243,237,0.62)] dark:bg-[rgba(28,28,30,0.6)]"
        exit={{ opacity: 0, transition: { duration: 0.28 } }}
        initial={{ opacity: 0 }}
        ref={backdropRef}
        transition={{ duration: 0.28 }}
        onClick={dismissTop}
      />

      {frame && (
        <m.div
          data-paper-peek
          animate={{ opacity: 1, ...LOOSE_POSE }}
          className="fixed flex flex-col overflow-hidden bg-white dark:bg-[var(--surface-paper)]"
          initial={{ opacity: 0, ...SET_DOWN_POSE }}
          ref={sheetRef}
          exit={{
            opacity: 0,
            ...SET_DOWN_POSE,
            transition: { duration: 0.28, ease: EASE_IN },
          }}
          style={{
            boxShadow: LIFT_SHADOW,
            height: frame.height,
            left: frame.left,
            top: frame.top,
            transformOrigin: '0 0',
            width: frame.width,
          }}
          transition={{
            duration: 0.48,
            ease: EASE,
            opacity: { duration: 0.17, ease: 'linear' },
          }}
        >
          <ImpressionView
            action={TrackerAction.Impression}
            trackerMessage="Peek Modal"
          />

          <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {children}
          </div>

          <div className="bg-paper absolute right-3 top-3 z-10 flex items-center overflow-hidden rounded-full shadow-xs ring-1 ring-neutral-3">
            <Link
              className="center flex h-8 w-9 hover:bg-neutral-2"
              href={to}
              onClick={expand}
            >
              <i className="i-mingcute-fullscreen-2-line text-copy-16" />
              <span className="sr-only">{t('aria_open_link')}</span>
            </Link>
            <div aria-hidden className="h-4 w-px bg-neutral-3" />
            <button
              className="center flex h-8 w-9 hover:bg-neutral-2"
              type="button"
              onClick={dismissTop}
            >
              <i className="i-mingcute-close-line text-copy-16" />
              <span className="sr-only">{t('actions_close')}</span>
            </button>
          </div>
        </m.div>
      )}
    </>
  )
}
