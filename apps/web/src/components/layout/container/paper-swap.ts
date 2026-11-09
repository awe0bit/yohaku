'use client'

import { flushSync } from 'react-dom'

export type PaperTransitionMode = 'swap' | 'next' | 'prev' | 'peek'
export type PaperEntranceMode = 'skip' | 'play' | 'await-ready'
type Arrival = 'mounted' | 'timeout'

interface PaperTransition {
  mode: PaperTransitionMode
  ready: Promise<void>
}

const SWAP_NAME = 'paper-content'
const FEATHER_PX = 48
const WIPE_MS = 520
const WIPE_EASING = 'cubic-bezier(0.3, 0.6, 0.3, 1)'
const SWAP_ARRIVAL_TIMEOUT_MS = 2500
const SHUFFLE_ARRIVAL_TIMEOUT_MS = 600

const OLD = 'paper-old'
const OLD_CONTENT = 'paper-old-content'
const NEW = 'paper-new'
const PEEK = 'paper-peek'
const ABOVE_CLASS = 'paper-above'

const MAIN_SELECTOR = '.note-layout-main:not([data-paper-peek] *)'

let active: PaperTransition | null = null
let onPaperArrival: ((main: HTMLElement) => void) | null = null
let named: HTMLElement[] = []

const findMain = () => document.querySelector<HTMLElement>(MAIN_SELECTOR)

const contentOf = (main: HTMLElement) =>
  main.querySelector<HTMLElement>(':scope > [data-paper-content]')

const backLayersOf = (main: HTMLElement) =>
  Array.from(main.querySelectorAll<HTMLElement>('[data-paper-stack-layer]'))

const canAnimate = () =>
  typeof document.startViewTransition === 'function' &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches

function name(element: HTMLElement | null, value: string, className = '') {
  if (!element) return
  element.style.viewTransitionName = value
  if (className) element.style.setProperty('view-transition-class', className)
  named.push(element)
}

function unname(elements: HTMLElement[]) {
  elements.forEach((element) => {
    element.style.viewTransitionName = ''
    element.style.removeProperty('view-transition-class')
  })
  named = named.filter((element) => !elements.includes(element))
}

export const getPaperTransition = () => active

export const backLayerRole = (index: number, count: number) =>
  index === count - 1 ? 'near' : 'deep'

function nameBackLayers(main: HTMLElement, prefix: 'old' | 'new') {
  const layers = backLayersOf(main)
  layers.forEach((layer, index) =>
    name(
      layer,
      `paper-${prefix}-back-${index}`,
      `paper-${prefix}-back paper-back-${backLayerRole(index, layers.length)}`,
    ),
  )
  return layers
}

export const isPaperSwapPending = () => active !== null

export function paperEntranceMode({
  hydrated,
  transition,
}: {
  hydrated: boolean
  transition: Pick<PaperTransition, 'mode'> | null
}): PaperEntranceMode {
  if (!hydrated) return 'skip'
  if (!transition) return 'play'
  return transition.mode === 'next' ? 'await-ready' : 'skip'
}

export function announcePaperArrival(main: HTMLElement) {
  onPaperArrival?.(main)
}

export function notifyPaperMounted(root: HTMLElement) {
  const main = root.querySelector<HTMLElement>('.note-layout-main')
  if (main) announcePaperArrival(main)
}

export function waitForPaperArrival(
  previous: HTMLElement | null,
  navigate: () => void,
  timeoutMs: number,
) {
  return new Promise<Arrival>((resolve) => {
    let settled = false
    const listener = (main: HTMLElement) => {
      // Rendering is paused inside a view transition update, so rAF never
      // fires here; a macrotask lets the new paper's children commit.
      if (main !== previous) setTimeout(() => settle('mounted'), 0)
    }
    const settle = (arrival: Arrival) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      if (onPaperArrival === listener) onPaperArrival = null
      resolve(arrival)
    }
    const timer = setTimeout(() => settle('timeout'), timeoutMs)
    onPaperArrival = listener
    navigate()
  })
}

function begin(
  mode: PaperTransitionMode,
  update: () => void | Promise<void>,
  onFinished?: () => void,
) {
  const html = document.documentElement
  let markReady!: () => void
  active = { mode, ready: new Promise((resolve) => (markReady = resolve)) }
  html.dataset.paperTransition = mode

  const transition = document.startViewTransition(update)
  transition.ready.catch(() => {}).finally(markReady)
  void transition.finished.finally(() => {
    active = null
    delete html.dataset.paperTransition
    html.style.removeProperty('--paper-recede-shift')
    unname([...named])
    onFinished?.()
  })
  return transition
}

function wipe(content: HTMLElement, previousHeight: number) {
  const { top } = content.getBoundingClientRect()
  const height = Math.max(content.offsetHeight, previousHeight)
  const from = Math.min(Math.max(0, -top), height)
  const to = Math.max(
    from,
    Math.min(height, window.innerHeight - top) + FEATHER_PX,
  )
  const keyframes = [
    { '--paper-swap': `${from}px` },
    { '--paper-swap': `${to}px` },
  ]

  return ['old', 'new'].map((image) =>
    document.documentElement.animate(keyframes, {
      duration: WIPE_MS,
      easing: WIPE_EASING,
      fill: 'both',
      pseudoElement: `::view-transition-${image}(${SWAP_NAME})`,
    }),
  )
}

function runSwap(update: (previous: HTMLElement) => void | Promise<void>) {
  const main = findMain()
  const previous = main && contentOf(main)
  if (!main || !previous || !canAnimate() || active) {
    void update(main ?? document.body)
    return
  }

  const previousHeight = previous.offsetHeight
  name(previous, SWAP_NAME)

  let wipes: Animation[] = []
  const transition = begin(
    'swap',
    async () => {
      unname([previous])
      await update(main)
      const next = findMain()
      name(next && contentOf(next), SWAP_NAME)
    },
    () => wipes.forEach((animation) => animation.cancel()),
  )

  transition.ready
    .then(() => {
      const next = findMain()
      const content = next && contentOf(next)
      if (content) wipes = wipe(content, previousHeight)
    })
    .catch(() => {})
}

export function swapPaperContentInPlace(update: () => void) {
  runSwap(() => flushSync(update))
}

export function swapPaperContentAcrossRoute(navigate: () => void) {
  if (!findMain()) return false
  runSwap(async (previous) => {
    await waitForPaperArrival(previous, navigate, SWAP_ARRIVAL_TIMEOUT_MS)
  })
  return true
}

function nameAboveLayers() {
  document
    .querySelectorAll<HTMLElement>('[data-paper-transition-above]')
    .forEach((element, index) =>
      name(element, `paper-above-${index}`, ABOVE_CLASS),
    )
}

// Navigation resets scroll, so the receding old sheet has to follow the jump to
// land on the new page's stack rather than where the old page was scrolled.
function markRecedeShift(previousScrollY: number) {
  document.documentElement.style.setProperty(
    '--paper-recede-shift',
    `${previousScrollY - window.scrollY}px`,
  )
}

function nameOutgoing(previous: HTMLElement) {
  const content = contentOf(previous)
  name(previous, OLD)
  name(content, OLD_CONTENT)
  const layers = nameBackLayers(previous, 'old')
  return [previous, ...layers, ...(content ? [content] : [])]
}

export function shufflePaperAcrossRoute(
  direction: 'next' | 'prev',
  navigate: () => void,
) {
  const previous = findMain()
  if (!previous || !canAnimate() || active) return false

  const outgoing = nameOutgoing(previous)
  nameAboveLayers()
  const previousScrollY = window.scrollY

  begin(direction, async () => {
    unname(outgoing)
    await waitForPaperArrival(previous, navigate, SHUFFLE_ARRIVAL_TIMEOUT_MS)
    markRecedeShift(previousScrollY)
    const next = findMain()
    if (direction === 'prev' && next && next !== previous) {
      name(next, NEW)
      nameBackLayers(next, 'new')
    }
  })
  return true
}

export function expandPeekIntoPaper(
  sheet: HTMLElement,
  release: () => void,
  navigate: () => void,
) {
  if (!canAnimate() || active) return false

  const previous = findMain()
  const outgoing = previous ? nameOutgoing(previous) : []
  name(sheet, PEEK)
  nameAboveLayers()
  const previousScrollY = window.scrollY

  begin('peek', async () => {
    unname([...outgoing, sheet])
    release()
    await waitForPaperArrival(previous, navigate, SHUFFLE_ARRIVAL_TIMEOUT_MS)
    markRecedeShift(previousScrollY)
    const next = findMain()
    if (next && next !== previous) {
      name(next, PEEK)
      nameBackLayers(next, 'new')
    }
  })
  return true
}
