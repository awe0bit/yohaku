import { bgmEngine } from '~/components/layout/bgm/engine'

import { KEEP_ATTR } from './capture'

const OVERLAYS =
  '[role="dialog"], [role="alertdialog"], [aria-modal="true"], [data-search-panel]'

const isShown = (el: Element) => {
  const r = el.getBoundingClientRect()
  return r.width > 0 && r.height > 0
}

export const isOverlayOpen = () =>
  [...document.querySelectorAll(OVERLAYS)].some(
    (el) => !el.closest(`[${KEEP_ATTR}]`) && isShown(el),
  )

const EDITABLE = new Set(['INPUT', 'TEXTAREA', 'SELECT', 'IFRAME'])

export const isFocusBusy = (
  active: { isContentEditable?: boolean; tagName: string } | null,
) => !!active && (EDITABLE.has(active.tagName) || !!active.isContentEditable)

export const swallowExitKey = (
  e: { preventDefault: () => void; stopPropagation: () => void },
  leave: () => void,
) => {
  e.preventDefault()
  e.stopPropagation()
  leave()
}

export const preservePageState = (
  win: {
    scrollTo: (x: number, y: number) => void
    scrollX: number
    scrollY: number
  },
  doc: { activeElement: Element | null },
) => {
  const { scrollX, scrollY } = win
  const active = doc.activeElement as HTMLElement | null
  return () => {
    win.scrollTo(scrollX, scrollY)
    active?.focus?.({ preventScroll: true })
  }
}

export const isMediaPlaying = () =>
  bgmEngine.getState().enabled ||
  [...document.querySelectorAll('audio, video')].some(
    (m) => !(m as HTMLMediaElement).paused,
  )
