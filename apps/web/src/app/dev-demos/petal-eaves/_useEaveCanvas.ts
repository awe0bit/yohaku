import type { RefObject } from 'react'
import { useEffect } from 'react'

import { createLeafScene } from './_leaves'
import { createPetalScene } from './_petals'
import { createRainScene } from './_rain'
import type { Eave, Scene, Season } from './_scene'
import { createSnowScene } from './_snow'

export interface EaveSettings {
  clear: number
  debug: boolean
  density: number
  season: Season
  wind: number
}

interface DrawableCanvas extends HTMLCanvasElement {
  onpaint: ((event: Event) => void) | null
  requestPaint?: () => void
}

interface DrawableContext extends CanvasRenderingContext2D {
  drawElementImage: (
    element: Element,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
  ) => void
}

interface Refs {
  articleRef: RefObject<HTMLElement | null>
  canvasRef: RefObject<HTMLCanvasElement | null>
  settingsRef: RefObject<EaveSettings>
  spacerRef: RefObject<HTMLDivElement | null>
}

const SCENES: Record<Season, () => Scene> = {
  spring: createPetalScene,
  summer: createRainScene,
  autumn: createLeafScene,
  winter: createSnowScene,
}

const measureEaves = (article: HTMLElement): Eave[] => {
  const base = article.getBoundingClientRect()
  return [...article.querySelectorAll('[data-eave]')].map((el) => {
    const r = el.getBoundingClientRect()
    return {
      left: r.left - base.left,
      right: r.right - base.left,
      top: r.top - base.top,
      bottom: r.bottom - base.top,
    }
  })
}

export const useEaveCanvas = ({
  articleRef,
  canvasRef,
  settingsRef,
  spacerRef,
}: Refs) => {
  useEffect(() => {
    const el = canvasRef.current as DrawableCanvas | null
    const content = articleRef.current
    const box = spacerRef.current
    const ctx = el?.getContext('2d') as DrawableContext | null | undefined
    if (!el || !content || !box || !ctx) return

    let eaves: Eave[] = []
    const sceneKey = () =>
      `${settingsRef.current.season}:${settingsRef.current.clear}`
    let key = sceneKey()
    let scene = SCENES[settingsRef.current.season]()

    const measure = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      el.width = Math.round(el.clientWidth * dpr)
      el.height = Math.round(el.clientHeight * dpr)
      box.style.height = `${content.offsetHeight}px`
      eaves = measureEaves(content)
      el.requestPaint?.()
    }
    const view = () => {
      const c = el.getBoundingClientRect()
      return {
        offset: c.top - box.getBoundingClientRect().top,
        width: c.width,
        height: c.height,
      }
    }

    el.onpaint = () => {
      const v = view()
      const dpr = el.width / Math.max(1, el.clientWidth)
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, el.width, el.height)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.drawElementImage(
        content,
        0,
        v.offset,
        v.width,
        v.height,
        0,
        0,
        v.width,
        v.height,
      )
      const dark = document.documentElement.dataset.theme === 'dark'
      ctx.save()
      scene.draw(ctx, eaves, v.offset, dark)
      ctx.restore()
      if (!settingsRef.current.debug) return
      ctx.strokeStyle = 'rgba(220, 60, 60, 0.6)'
      ctx.lineWidth = 1
      for (const e of eaves) {
        ctx.beginPath()
        ctx.moveTo(e.left, e.top - v.offset)
        ctx.lineTo(e.right, e.top - v.offset)
        ctx.stroke()
      }
    }

    const observer = new ResizeObserver(measure)
    observer.observe(content)
    observer.observe(el)
    document.fonts?.ready.then(measure).catch(() => {})

    let last = performance.now()
    let raf = 0
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const s = settingsRef.current
      if (sceneKey() !== key) {
        key = sceneKey()
        scene = SCENES[s.season]()
      }
      const v = view()
      scene.step({
        dt,
        eaves,
        top: v.offset,
        bottom: v.offset + v.height,
        width: v.width,
        wind: s.wind,
        density: s.density,
      })
      el.requestPaint?.()
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      el.onpaint = null
    }
  }, [articleRef, canvasRef, settingsRef, spacerRef])
}
