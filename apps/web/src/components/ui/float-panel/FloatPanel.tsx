import type { Placement, Strategy } from '@floating-ui/react-dom'
import { flip, offset, shift, useFloating } from '@floating-ui/react-dom'
import { AnimatePresence, m } from 'motion/react'
import type { FC, PropsWithChildren } from 'react'
import { cloneElement, useMemo, useRef, useState } from 'react'

import { clsxm } from '~/lib/helper'

import { getPopoverAnimationConfig } from '../float-popover/animation'
import { paperPanelHostClassName,PaperPanelSurface } from '../paper-panel'
import { RootPortal } from '../portal'

interface FloatPanelProps {
  placement?: Placement
  strategy?: Strategy
  triggerElement: Parameters<typeof cloneElement>[0]
}

export const FloatPanel: FC<FloatPanelProps & PropsWithChildren> = (props) => {
  const {
    triggerElement,
    strategy = 'fixed',
    placement = 'right',
    children,
  } = props

  const [panelOpen, setPanelOpen] = useState(false)

  const {
    isPositioned,
    refs,
    x,
    y,
    elements,
    placement: resolvedPlacement,
  } = useFloating({
    strategy,
    placement,
    middleware: [flip({ padding: 20 }), offset(10), shift()],
  })

  const floatingRef = useRef<HTMLElement>(undefined)
  floatingRef.current = elements.floating || undefined
  // @ts-ignore
  // useClickAway(floatingRef, (e) => {

  //   setPanelOpen(false)
  // })

  return (
    <>
      {useMemo(
        () =>
          cloneElement(triggerElement, {
            // @ts-ignore
            ref: refs.setReference,
            onClick: () => {
              setPanelOpen((v) => !v)
            },
          }),
        [refs.setReference, triggerElement],
      )}

      <RootPortal>
        <AnimatePresence>
          {panelOpen && (
            <m.div
              {...getPopoverAnimationConfig(resolvedPlacement)}
              ref={refs.setFloating}
              className={clsxm(
                paperPanelHostClassName,
                'p-4 outline-hidden',
                'z-[2]',
              )}
              style={{
                ...getPopoverAnimationConfig(resolvedPlacement).style,
                position: strategy,
                top: y ?? '',
                left: x ?? '',
                visibility: isPositioned && x !== null ? 'visible' : 'hidden',
              }}
            >
              <PaperPanelSurface />
              {children}
            </m.div>
          )}
        </AnimatePresence>
      </RootPortal>
    </>
  )
}
