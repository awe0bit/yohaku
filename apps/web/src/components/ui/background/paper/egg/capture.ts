export const KEEP_ATTR = 'data-paper-egg-keep'

const SKIP_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'LINK',
  'TEMPLATE',
  'NOSCRIPT',
  'CANVAS',
  'NEXT-ROUTE-ANNOUNCER',
])
const STRIP = 'canvas, video, iframe, audio, object, embed'
const IMAGES = 'img, picture, image'
const CARD_ALPHA = 0.3
const PAINT_TIMEOUT_MS = 1500

interface DrawableContext extends CanvasRenderingContext2D {
  drawElementImage: (
    element: Element,
    x: number,
    y: number,
    w: number,
    h: number,
  ) => unknown
  reset: () => void
}

interface DrawableCanvas extends HTMLCanvasElement {
  onpaint: ((event: Event) => void) | null
  requestPaint?: () => void
}

export const viewportSize = (
  doc: {
    documentElement: { clientHeight: number; clientWidth: number }
  } = document,
) => ({
  width: doc.documentElement.clientWidth,
  height: doc.documentElement.clientHeight,
})

export const canCapture = () =>
  typeof CanvasRenderingContext2D !== 'undefined' &&
  'drawElementImage' in CanvasRenderingContext2D.prototype

export const captureSources = () =>
  [...document.body.children].filter(
    (el): el is HTMLElement =>
      el instanceof HTMLElement &&
      !SKIP_TAGS.has(el.tagName) &&
      !el.hasAttribute(KEEP_ATTR),
  )

const RGBA = /rgba?\(([^)]+)\)/

const fadeBackgrounds = (real: Element[], copies: Element[]) => {
  if (real.length !== copies.length) return
  for (const [i, el] of real.entries()) {
    const match = getComputedStyle(el).backgroundColor.match(RGBA)
    if (!match) continue
    const [r, g, b, a = 1] = match[1]
      .split(/[\s,/]+/)
      .filter(Boolean)
      .map(Number)
    if (a < 0.05) continue
    ;(copies[i] as HTMLElement).style.backgroundColor =
      `rgba(${r},${g},${b},${a * CARD_ALPHA})`
  }
}

const buildClone = (sources: HTMLElement[], scrollY: number) => {
  const clone = document.createElement('div')
  for (const source of sources) clone.append(source.cloneNode(true))
  fadeBackgrounds(
    sources.flatMap((s) => [s, ...s.querySelectorAll('*')]),
    [...clone.querySelectorAll('*')],
  )
  for (const node of clone.querySelectorAll(STRIP)) node.remove()
  for (const node of clone.querySelectorAll<HTMLElement>(IMAGES))
    node.style.visibility = 'hidden'
  for (const node of clone.querySelectorAll('[id]')) node.removeAttribute('id')
  clone.style.transform = `translateY(${-scrollY}px)`
  return clone
}

export const capturePage = (
  sources: HTMLElement[],
  { width, height, dpr }: { dpr: number; height: number; width: number },
): Promise<HTMLCanvasElement | null> => {
  const canvas = document.createElement('canvas') as DrawableCanvas
  canvas.setAttribute('layoutsubtree', '')
  canvas.setAttribute('content', 'drawable')
  canvas.setAttribute(KEEP_ATTR, '')
  canvas.width = Math.round(width * dpr)
  canvas.height = Math.round(height * dpr)
  canvas.style.cssText = `position:fixed;inset:0;width:${width}px;height:${height}px;pointer-events:none;z-index:-100;`
  const box = document.createElement('div')
  box.setAttribute('drawable', '')
  box.style.cssText = `position:relative;width:${width}px;height:${height}px;overflow:hidden;contain:paint;`
  box.append(buildClone(sources, window.scrollY))
  canvas.append(box)
  document.body.append(canvas)
  const ctx = canvas.getContext('2d') as DrawableContext | null

  return new Promise((resolve) => {
    const done = (out: HTMLCanvasElement | null) => {
      window.clearTimeout(timer)
      canvas.onpaint = null
      canvas.remove()
      resolve(out)
    }
    const timer = window.setTimeout(() => done(null), PAINT_TIMEOUT_MS)
    if (!ctx) return done(null)
    canvas.onpaint = () => {
      try {
        ctx.reset()
        ctx.drawElementImage(box, 0, 0, canvas.width, canvas.height)
        const copy = document.createElement('canvas')
        copy.width = canvas.width
        copy.height = canvas.height
        copy.getContext('2d')?.drawImage(canvas, 0, 0)
        done(copy)
      } catch {
        done(null)
      }
    }
    canvas.requestPaint?.()
  })
}
