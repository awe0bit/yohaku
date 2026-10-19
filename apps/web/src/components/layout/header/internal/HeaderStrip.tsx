'use client'

import { AnimatePresence, m, useReducedMotion } from 'motion/react'

import {
  paperPanelHostClassName,
  PaperPanelSurface,
} from '~/components/ui/paper-panel'
import { clsxm } from '~/lib/helper'

import { HeaderNav } from './HeaderNav'
import { LiveDeskStripMeter } from './LiveDeskActivity'
import { TapableLogo } from './TapableLogo'
import { UserAuth } from './UserAuth'

const EASE = [0.22, 1, 0.36, 1] as const

const Hairline = () => (
  <span aria-hidden className="paper-hairline h-3.5 w-0 shrink-0 border-l" />
)

export const HeaderStrip = ({ visible }: { visible: boolean }) => {
  const reduceMotion = useReducedMotion()
  const offset = reduceMotion ? 0 : -10

  return (
    <AnimatePresence>
      {visible && (
        <m.div
          data-hide-print
          animate={{ opacity: 1, y: 0 }}
          className="yohaku-page-right-inset pointer-events-none fixed inset-x-0 top-3 z-[20] mr-[var(--removed-body-scroll-bar-size)] hidden justify-center lg:flex"
          exit={{ opacity: 0, y: offset }}
          initial={{ opacity: 0, y: offset }}
          transition={{
            opacity: { duration: 0.24, ease: EASE },
            y: { duration: 0.36, ease: EASE },
          }}
        >
          <div
            className={clsxm(
              paperPanelHostClassName,
              'pointer-events-auto flex h-[42px] items-center gap-4 px-[9px]',
            )}
          >
            <PaperPanelSurface />
            <div className="flex items-center gap-2">
              <TapableLogo className="flex" size={26} />
              <LiveDeskStripMeter />
            </div>
            <Hairline />
            <HeaderNav variant="strip" />
            <div className="paper-hairline flex h-6 w-[41px] items-center border-l pl-4">
              <UserAuth size={24} />
            </div>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  )
}
