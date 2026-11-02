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

interface Saved {
  el: HTMLElement
  visibility: string
}

interface SavedImage extends Saved {
  opacity: string
  scale: string
  transition: string
  translate: string
}

export interface HiddenPage {
  images: SavedImage[]
  restore: () => void
  setImageFade: (visible: number) => void
}

const IMAGE_SELECTOR = 'img, picture, video[poster]'

const inViewport = (el: Element) => {
  const r = el.getBoundingClientRect()
  return (
    r.width > 0 &&
    r.height > 0 &&
    r.bottom > 0 &&
    r.top < window.innerHeight &&
    r.right > 0 &&
    r.left < window.innerWidth
  )
}

export const hidePage = (sources: HTMLElement[]): HiddenPage => {
  const saved: Saved[] = sources.map((el) => ({
    el,
    visibility: el.style.visibility,
  }))
  const images: SavedImage[] = sources
    .flatMap((s) => [...s.querySelectorAll<HTMLElement>(IMAGE_SELECTOR)])
    .filter(inViewport)
    .map((el) => ({
      el,
      visibility: el.style.visibility,
      opacity: el.style.opacity,
      translate: el.style.translate,
      scale: el.style.scale,
      transition: el.style.transition,
    }))
  const restorePage = preservePageState(window, document)
  for (const { el } of saved) el.style.visibility = 'hidden'
  for (const { el } of images) {
    el.style.visibility = 'visible'
    el.style.transition = 'none'
  }
  let last = -1
  return {
    images,
    setImageFade: (visible) => {
      const v = Math.round(visible * 100) / 100
      if (v === last) return
      last = v
      for (const { el } of images) {
        el.style.opacity = String(v)
        el.style.translate = `0 ${(1 - v) * 6}px`
        el.style.scale = String(1 - (1 - v) * 0.015)
      }
    },
    restore: () => {
      for (const s of images) {
        s.el.style.visibility = s.visibility
        s.el.style.opacity = s.opacity
        s.el.style.translate = s.translate
        s.el.style.scale = s.scale
        s.el.style.transition = s.transition
      }
      for (const s of saved) s.el.style.visibility = s.visibility
      restorePage()
    },
  }
}
