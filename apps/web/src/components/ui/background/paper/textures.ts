import { hexToRgb } from '~/lib/paper/oklab'
import { seasonOf, SUKI, sukiDensity, sunagoDensity } from '~/lib/paper/season'

import { paintElements } from './elements'
import { layoutElements, rng } from './layout'

export interface Surface {
  height: number
  scale: number
  width: number
}

const canvasFor = ({ width, height, scale }: Surface) => {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width * scale))
  canvas.height = Math.max(1, Math.round(height * scale))
  const ctx = canvas.getContext('2d')!
  ctx.setTransform(scale, 0, 0, scale, 0, 0)
  return { canvas, ctx }
}

export const makeFibers = (surface: Surface) => {
  const { width: W, height: H } = surface
  const { canvas, ctx: x } = canvasFor(surface)
  x.fillStyle = 'rgb(128,128,128)'
  x.fillRect(0, 0, W, H)
  x.lineCap = 'round'
  const r = rng(7)
  const n = Math.round((W * H) / 1300)
  for (let i = 0; i < n; i++) {
    const len = 24 + r() ** 2.2 * 170
    const a = r() * Math.PI * 2
    const x0 = r() * W
    const y0 = r() * H
    const x1 = x0 + Math.cos(a) * len
    const y1 = y0 + Math.sin(a) * len
    const bend = (r() - 0.5) * len * 0.5
    x.strokeStyle =
      r() < 0.58
        ? `rgba(255,255,255,${0.16 + r() * 0.3})`
        : `rgba(0,0,0,${0.08 + r() * 0.2})`
    x.lineWidth = 0.35 + r() * 0.6
    x.beginPath()
    x.moveTo(x0, y0)
    x.quadraticCurveTo(
      (x0 + x1) / 2 - Math.sin(a) * bend,
      (y0 + y1) / 2 + Math.cos(a) * bend,
      x1,
      y1,
    )
    x.stroke()
  }
  const specks = Math.round((W * H) / 11_000)
  for (let i = 0; i < specks; i++) {
    const s = 0.5 + r() * 1.2
    x.fillStyle = `rgba(0,0,0,${0.2 + r() * 0.3})`
    x.beginPath()
    x.ellipse(
      r() * W,
      r() * H,
      s,
      s * (0.4 + r() * 0.6),
      r() * 3.14,
      0,
      Math.PI * 2,
    )
    x.fill()
  }
  return canvas
}

export const makeSuki = (surface: Surface, term: number) => {
  const { width: W, height: H } = surface
  const { canvas, ctx: x } = canvasFor(surface)
  const spec = SUKI[seasonOf(term)]
  if (spec.kind === 'none') return canvas
  x.lineCap = 'round'
  const r = rng(31 + seasonOf(term))
  const n = Math.round((W * H) / 6500)
  const keepBelow = sukiDensity(term)
  for (let k = 0; k < n; k++) {
    x.globalAlpha = r() < keepBelow ? 1 : 0
    const [cr, cg, cb] = hexToRgb(
      spec.colors[Math.floor(r() * spec.colors.length)],
    )!.map((v) => Math.round(v * 255))
    const px = r() * W
    const py = r() * H
    if (spec.kind === 'fiber') {
      const len = 5 + r() * 13
      const a = r() * Math.PI * 2
      x.strokeStyle = `rgba(${cr},${cg},${cb},${0.45 + r() * 0.3})`
      x.lineWidth = 0.5 + r() * 0.4
      x.beginPath()
      x.moveTo(px, py)
      x.quadraticCurveTo(
        px + Math.cos(a) * len * 0.5 + (r() - 0.5) * 3,
        py + Math.sin(a) * len * 0.5 + (r() - 0.5) * 3,
        px + Math.cos(a) * len,
        py + Math.sin(a) * len,
      )
      x.stroke()
      continue
    }
    const rr = 1.1 + r() ** 1.6 * 3.2
    const rot = r() * Math.PI
    const stretch = 0.55 + r() * 0.45
    x.fillStyle = `rgba(${cr},${cg},${cb},${0.4 + r() * 0.4})`
    x.beginPath()
    for (let v = 0; v < 9; v++) {
      const a = (v / 9) * Math.PI * 2
      const d = rr * (0.55 + r() * 0.6)
      const lx = Math.cos(a) * d
      const ly = Math.sin(a) * d * stretch
      const qx = px + lx * Math.cos(rot) - ly * Math.sin(rot)
      const qy = py + lx * Math.sin(rot) + ly * Math.cos(rot)
      if (v === 0) x.moveTo(qx, qy)
      else x.lineTo(qx, qy)
    }
    x.closePath()
    x.fill()
    if (r() < 0.3) {
      const a = r() * Math.PI * 2
      const len = 3 + r() * 5
      x.strokeStyle = `rgba(${cr},${cg},${cb},0.3)`
      x.lineWidth = 0.45
      x.beginPath()
      x.moveTo(px, py)
      x.lineTo(px + Math.cos(a) * len, py + Math.sin(a) * len)
      x.stroke()
    }
  }
  return canvas
}

export const makeFlakes = (surface: Surface, term: number) => {
  const { width: W, height: H } = surface
  const { canvas, ctx: x } = canvasFor(surface)
  const r = rng(101)
  const sigma = 0.2 * Math.max(W, H)
  const blobs = Array.from({ length: 7 }, () => [r() * W, r() * H])
  const field = (px: number, py: number) => {
    let s = 0
    for (const [bx, by] of blobs)
      s += Math.exp(-((px - bx) ** 2 + (py - by) ** 2) / sigma ** 2)
    return Math.min(1, s)
  }
  const n = Math.round(((W * H) / 4200) * 2)
  const keepBelow = sunagoDensity(term) / 2
  let placed = 0
  for (let guard = 0; placed < n && guard < n * 6; guard++) {
    const px = r() * W
    const py = r() * H
    if (r() > 0.3 + 0.7 * field(px, py)) continue
    x.globalAlpha = r() < keepBelow ? 1 : 0
    const orient = Math.floor(r() * 255)
    const spin = Math.floor(r() * 255)
    const base = 0.5 + r() ** 2 * 2.2
    const a0 = r() * Math.PI * 2
    x.fillStyle = `rgb(${orient},${spin},0)`
    x.beginPath()
    for (let v = 0; v < 4; v++) {
      const a = a0 + v * (Math.PI / 2) + (r() - 0.5) * 0.9
      const d = base * (0.6 + r() * 0.7)
      if (v === 0) x.moveTo(px + Math.cos(a) * d, py + Math.sin(a) * d)
      else x.lineTo(px + Math.cos(a) * d, py + Math.sin(a) * d)
    }
    x.closePath()
    x.fill()
    placed++
  }
  return canvas
}

export const makeElements = (surface: Surface, term: number) => {
  const { canvas, ctx } = canvasFor(surface)
  paintElements(ctx, layoutElements(surface.width, surface.height, term))
  return canvas
}

export const makeWitherMask = (surface: Surface, from: number, to: number) => {
  const { canvas, ctx } = canvasFor(surface)
  const next = layoutElements(surface.width, surface.height, to)
  const leaving = layoutElements(surface.width, surface.height, from).filter(
    (item, slot) => item.family !== next[slot]?.family,
  )
  paintElements(ctx, leaving, true)
  return canvas
}

export interface SeasonalTextures {
  elements: HTMLCanvasElement
  flakes: HTMLCanvasElement
  suki: HTMLCanvasElement
}

export const yieldToMain = () =>
  new Promise<void>((resolve) => {
    if ('requestIdleCallback' in window)
      window.requestIdleCallback(() => resolve(), { timeout: 120 })
    else window.setTimeout(resolve, 16)
  })

export const makeSeasonalAsync = async (
  surface: Surface,
  term: number,
): Promise<SeasonalTextures> => {
  const flakes = makeFlakes(surface, term)
  await yieldToMain()
  const suki = makeSuki(surface, term)
  await yieldToMain()
  return { flakes, suki, elements: makeElements(surface, term) }
}

export const makeSeasonal = (
  surface: Surface,
  term: number,
): SeasonalTextures => ({
  flakes: makeFlakes(surface, term),
  suki: makeSuki(surface, term),
  elements: makeElements(surface, term),
})
