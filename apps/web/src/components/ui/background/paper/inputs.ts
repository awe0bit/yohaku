import type { Press } from './renderer'

const PRESS_LIFE_S = 1.8
const SHEET_SELECTOR = '.paper-sheet-deckle:not([data-paper-stack-layer] *)'
const SHEET_REFRESH_MS = 500
const IGNORED_TARGETS =
  'input, textarea, select, [contenteditable]:not([contenteditable="false"])'

export const createPressTracker = () => {
  const presses: { x: number; y: number; at: number }[] = []
  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return
    if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return
    if ((event.target as Element | null)?.closest?.(IGNORED_TARGETS)) return
    presses.push({ x: event.clientX, y: event.clientY, at: performance.now() })
    if (presses.length > 4) presses.shift()
  }
  window.addEventListener('pointerdown', onPointerDown, { passive: true })
  return {
    read(now: number): Press[] {
      while (presses.length && (now - presses[0].at) / 1000 > PRESS_LIFE_S)
        presses.shift()
      return presses.map((p) => ({ x: p.x, y: p.y, age: (now - p.at) / 1000 }))
    },
    dispose: () => window.removeEventListener('pointerdown', onPointerDown),
  }
}

export const createSheetTracker = () => {
  const visible = new Set<Element>()
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target)
        else visible.delete(entry.target)
      }
    },
    { rootMargin: '40px 0px' },
  )
  let nodes = new Set<Element>()
  let refreshedAt = Number.NEGATIVE_INFINITY
  return {
    read(now: number) {
      if (now - refreshedAt > SHEET_REFRESH_MS) {
        const next = new Set(document.querySelectorAll(SHEET_SELECTOR))
        for (const node of nodes) {
          if (next.has(node)) continue
          observer.unobserve(node)
          visible.delete(node)
        }
        for (const node of next) if (!nodes.has(node)) observer.observe(node)
        nodes = next
        refreshedAt = now
      }
      return [...visible]
        .map((node) => node.getBoundingClientRect())
        .filter((r) => r.width > 0)
    },
    dispose: () => observer.disconnect(),
  }
}
