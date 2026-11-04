export const CANVAS_ROOT_ATTR = 'data-canvas-root'

const MAX_AREA = 16_000_000
const MAX_DIM = 16_384

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

export interface DrawableCanvas extends HTMLCanvasElement {
  onpaint: ((event: Event) => void) | null
  requestPaint?: () => void
  updateElementGeometry?: (element: Element) => void
}

export const canCapture = () =>
  typeof CanvasRenderingContext2D !== 'undefined' &&
  'drawElementImage' in CanvasRenderingContext2D.prototype

export const getCanvasRoot = () =>
  document.querySelector<DrawableCanvas>(`canvas[${CANVAS_ROOT_ATTR}]`)

const drawableCanvas = (canvas: HTMLCanvasElement) => {
  canvas.setAttribute(CANVAS_ROOT_ATTR, '')
  canvas.setAttribute('layoutsubtree', '')
  canvas.setAttribute('content', 'drawable')
  canvas.style.display = 'block'
  canvas.style.width = '100%'
  return canvas as DrawableCanvas
}

export const mountCanvasRoot = (root: HTMLElement | null) => {
  if (!canCapture() || getCanvasRoot() || !root) return null
  const parent = root.parentElement
  if (!parent) return null

  const canvas = drawableCanvas(document.createElement('canvas'))
  const box = document.createElement('div')
  box.setAttribute('drawable', '')
  box.style.cssText = 'position:relative;width:100%;overflow:hidden;'
  canvas.append(box)

  const ctx = canvas.getContext('2d') as DrawableContext | null
  let disposed = false

  const setSize = (width: number, height: number) => {
    if (!width || !height) return
    const scale = Math.min(
      2,
      window.devicePixelRatio || 1,
      MAX_DIM / width,
      MAX_DIM / height,
      Math.sqrt(MAX_AREA / (width * height)),
    )
    box.style.height = `${height}px`
    canvas.style.height = `${height}px`
    canvas.width = Math.max(1, Math.round(width * scale))
    canvas.height = Math.max(1, Math.round(height * scale))
  }

  setSize(root.clientWidth, root.offsetHeight)
  parent.insertBefore(canvas, root)
  box.append(root)

  const fit = () => {
    if (disposed) return
    setSize(box.clientWidth, root.offsetHeight)
    canvas.requestPaint?.()
  }

  const paint = () => {
    if (!ctx || disposed) return
    ctx.reset()
    ctx.drawElementImage(box, 0, 0, canvas.width, canvas.height)
    canvas.updateElementGeometry?.(box)
  }

  canvas.onpaint = paint
  const observer = new ResizeObserver(fit)
  observer.observe(root)
  window.addEventListener('resize', fit)
  fit()

  return {
    dispose: () => {
      if (disposed) return
      disposed = true
      observer.disconnect()
      window.removeEventListener('resize', fit)
      canvas.onpaint = null
      parent.insertBefore(root, canvas.nextSibling)
      canvas.remove()
    },
  }
}

export const captureViewport = ({
  dpr,
  height,
  width,
}: {
  dpr: number
  height: number
  width: number
}) => {
  const canvas = getCanvasRoot()
  if (!canvas) return null
  const out = document.createElement('canvas')
  out.width = Math.max(1, Math.round(width * dpr))
  out.height = Math.max(1, Math.round(height * dpr))
  const ctx = out.getContext('2d')
  if (!ctx) return null
  const scaleX = canvas.width / Math.max(1, canvas.clientWidth)
  const scaleY = canvas.height / Math.max(1, canvas.clientHeight)
  const sourceHeight = Math.min(canvas.height, Math.round(height * scaleY))
  const sourceY = Math.min(
    Math.max(0, Math.round(window.scrollY * scaleY)),
    Math.max(0, canvas.height - sourceHeight),
  )
  ctx.drawImage(
    canvas,
    0,
    sourceY,
    Math.min(canvas.width, Math.round(width * scaleX)),
    sourceHeight,
    0,
    0,
    out.width,
    out.height,
  )
  return out
}
