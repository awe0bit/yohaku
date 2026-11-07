'use client'

import { AnimatePresence, m, useReducedMotion } from 'motion/react'

import { clsxm } from '~/lib/helper'

const EASE = [0.2, 0, 0, 1] as const
const REVEAL_DURATION = 0.52
const FADE_OUT_DURATION = 0.26
const REDUCED_DURATION = 0.12

/**
 * Single-line text that wipes in from its first glyph while the previous line
 * fades out. The box hugs the current line (capped by the parent width) so the
 * reveal starts at the first character instead of the edge of a fixed row.
 */
export const RevealText = ({
  text,
  className,
}: {
  text: string
  className?: string
}) => {
  const reduceMotion = useReducedMotion()

  return (
    <span
      className={clsxm(
        'relative block h-[1.5em] max-w-full text-right leading-[1.5]',
        className,
      )}
    >
      <span aria-hidden className="invisible block truncate">
        {text}
      </span>

      <AnimatePresence initial={false}>
        <m.span
          key={text}
          animate={
            reduceMotion ? { opacity: 1 } : { clipPath: 'inset(0 0 0 0)' }
          }
          className="absolute top-0 right-0 block max-w-full overflow-hidden text-ellipsis whitespace-nowrap"
          exit={{
            opacity: 0,
            transition: {
              duration: reduceMotion ? REDUCED_DURATION : FADE_OUT_DURATION,
              ease: EASE,
            },
          }}
          initial={
            reduceMotion ? { opacity: 0 } : { clipPath: 'inset(0 100% 0 0)' }
          }
          style={{ width: 'max-content' }}
          transition={{
            duration: reduceMotion ? REDUCED_DURATION : REVEAL_DURATION,
            ease: EASE,
          }}
        >
          {text}
        </m.span>
      </AnimatePresence>
    </span>
  )
}
