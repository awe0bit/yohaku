import type { YohakuRootElement } from '~/components/common/yohaku-root'
import { lightAt, localHour } from '~/lib/paper/light'
import { accentRgb, paperColor, seasonOf } from '~/lib/paper/season'

import { layoutElements } from '../layout'
import { PAGE_PROFILES } from '../page-state'
import { eggBridge } from './bridge'
import { KEEP_ATTR } from './capture'
import { preservePageState, swallowExitKey } from './dom'
import { bodyHost, fadeFloating } from './float'
import { createLive } from './gl/live'
import type { GhostSource } from './images'
import { ghostImages } from './images'
import type { SourceRect } from './ink-size'
import { inkScale, sourceRect } from './ink-size'
import { collectBoxes, collectGlyphs } from './page-marks'
import {
  canCancel,
  enterEgg,
  leaveEgg,
  pageLayerVisibility,
  resetEgg,
  showsExit,
  stepEggPhase,
} from './phase'
import { SEASON_EFFECTS } from './seasons'
import type { PointerInput, SeasonEffect } from './seasons/types'

export interface SessionEnv {
  dark: boolean
  exitLabel: string
  term: number
}

interface SessionInput {
  canvas: HTMLCanvasElement
  dpr: number
  env: () => SessionEnv
  ghosts: GhostSource[]
  height: number
  onEnd: () => void
  onTravel: (distance: number) => boolean
  root: YohakuRootElement
  width: number
}

interface ElementGL extends WebGL2RenderingContext {
  texElementSubImage2D: (
    target: number,
    level: number,
    x: number,
    y: number,
    element: Element,
    config: SourceRect,
  ) => void
}

const FRAME_MS = 33
const MASK_EVERY = 4
const EXIT_CLASS =
  'absolute bottom-7 left-1/2 -translate-x-1/2 translate-y-1.5 cursor-pointer rounded-[2px] border border-neutral-5/40 bg-paper/70 py-2 pl-[18px] pr-4 font-serif text-[13px] leading-none tracking-[0.12em] text-neutral-7 opacity-0 pointer-events-none transition-[opacity,translate,color] duration-[900ms] data-[show]:translate-y-0 data-[show]:opacity-70 data-[show]:pointer-events-auto hover:data-[show]:opacity-100 hover:text-neutral-9'

const NON_VISUAL: Record<string, true> = {
  SCRIPT: true,
  STYLE: true,
  LINK: true,
  TEMPLATE: true,
  NOSCRIPT: true,
  'NEXT-ROUTE-ANNOUNCER': true,
}

const makeLayer = (label: string) => {
  const layer = document.createElement('div')
  layer.setAttribute(KEEP_ATTR, '')
  layer.setAttribute('aria-hidden', 'true')
  layer.style.cssText =
    'position:fixed;inset:0;z-index:9990;cursor:default;touch-action:none;'
  const exit = document.createElement('button')
  exit.type = 'button'
  exit.className = EXIT_CLASS
  exit.textContent = label
  layer.append(exit)
  document.body.append(layer)
  return { layer, exit }
}

export interface EggSession {
  end: () => void
  paint: () => void
  setLabel: (label: string) => void
}

export const startSession = (input: SessionInput): EggSession | null => {
  const { width: W, height: H, root, canvas } = input
  const target = root.firstElementChild
  const paper = eggBridge.paper
  if (!target || !paper) return null
  const { dark, term, exitLabel } = input.env()
  const scale = inkScale(input.dpr)
  const box = root.getBoundingClientRect()
  const rect = sourceRect(box.top, box.height, { width: W, height: H }, scale)
  const { layer, exit } = makeLayer(exitLabel)
  const created = createLive({
    canvas,
    w: W,
    h: H,
    dpr: scale,
    glyphs: collectGlyphs(target, W, H),
    boxes: collectBoxes(target, W, H),
    season: {
      term,
      season: seasonOf(term),
      dark,
      accent: accentRgb(term, dark),
      paperRgb: paperColor(term, dark),
      light: lightAt(localHour(new Date())),
      elements: layoutElements(W, H, term),
    },
    elemVisibility: () => eggBridge.profile?.vis.elem ?? 1,
    setCursor: (cursor) => {
      layer.style.cursor = cursor || 'default'
    },
  })
  if (!created) {
    layer.remove()
    return null
  }
  const { live, release } = created
  let effect: SeasonEffect
  try {
    effect = SEASON_EFFECTS[live.season.season](live)
  } catch {
    release()
    layer.remove()
    return null
  }
  const restorePage = preservePageState(window, document)
  const ghosts = ghostImages(layer, input.ghosts)
  const floats = fadeFloating(
    bodyHost(),
    (el) =>
      NON_VISUAL[el.tagName] || el.hasAttribute(KEEP_ATTR) || el.contains(root),
  )
  const state = eggBridge.state
  enterEgg(state, eggBridge.profile ?? PAGE_PROFILES.browse)

  let raf = 0
  let last = performance.now()
  let frameIndex = 0
  let prev: { x: number; y: number } | null = null
  let ended = false
  let seeded = false

  const leave = () => {
    if (leaveEgg(state)) effect.exit()
  }

  const end = () => {
    if (ended) return
    ended = true
    cancelAnimationFrame(raf)
    window.removeEventListener('wheel', onWheel, true)
    window.removeEventListener('keydown', onKey, true)
    window.removeEventListener('resize', end)
    document.removeEventListener('visibilitychange', onVisibility)
    canvas.removeEventListener('webglcontextlost', end)
    try {
      effect.dispose()
    } catch (error) {
      console.error(error)
    }
    release()
    resetEgg(state)
    root.exit()
    ghosts.remove()
    layer.remove()
    floats.restore()
    restorePage()
    input.onEnd()
  }

  const feedPaper = () => {
    if (frameIndex % MASK_EVERY === 0) {
      paper.render('flat')
      live.upload(paper.canvas, live.paperFlatTex, false)
      paper.render('bare')
      live.upload(paper.canvas, live.paperBareTex, false)
    }
    paper.render('full')
    live.upload(paper.canvas, live.paperTex, false)
    frameIndex++
  }

  const forward = (kind: PointerInput['kind'], e: PointerEvent) => {
    if (e.target === exit) return
    effect.pointer({ kind, x: e.clientX, y: e.clientY, now: performance.now() })
  }
  const onMove = (e: PointerEvent) => {
    const before = prev
    prev = { x: e.clientX, y: e.clientY }
    if (
      before &&
      canCancel(state) &&
      input.onTravel(Math.hypot(e.clientX - before.x, e.clientY - before.y))
    ) {
      leave()
      return
    }
    forward('move', e)
  }
  const onDown = (e: PointerEvent) => forward('down', e)
  const onLeave = (e: PointerEvent) => {
    prev = null
    forward('leave', e)
  }
  const onWheel = (e: WheelEvent) => {
    e.preventDefault()
    leave()
  }
  const onKey = (e: KeyboardEvent) => swallowExitKey(e, leave)
  const onVisibility = () => {
    if (document.visibilityState !== 'visible') end()
  }

  layer.addEventListener('pointermove', onMove)
  layer.addEventListener('pointerdown', onDown)
  layer.addEventListener('pointerleave', onLeave)
  exit.addEventListener('click', leave)
  canvas.addEventListener('webglcontextlost', end)
  window.addEventListener('wheel', onWheel, { capture: true, passive: false })
  window.addEventListener('keydown', onKey, true)
  window.addEventListener('resize', end)
  document.addEventListener('visibilitychange', onVisibility)

  const step = (dt: number) => {
    stepEggPhase(state, dt)
    if (eggBridge.lost || !eggBridge.paper) {
      end()
      return
    }
    feedPaper()
    live.time += dt
    effect.frame(dt, live.time)
    ghosts.setFade(pageLayerVisibility(state))
    exit.toggleAttribute('data-show', showsExit(state))
    if (state.stage === 'exiting' && effect.done) end()
  }

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame)
    if (now - last < FRAME_MS - 2) return
    const dt = Math.min(0.08, (now - last) / 1000)
    last = now
    try {
      step(dt)
    } catch (error) {
      console.error(error)
      end()
    }
  }

  const paint = () => {
    if (seeded || ended) return
    seeded = true
    try {
      const gl = live.gl as ElementGL
      gl.bindTexture(gl.TEXTURE_2D, live.inkTex)
      gl.texElementSubImage2D(gl.TEXTURE_2D, 0, 0, 0, target, rect)
      step(0)
    } catch (error) {
      console.error(error)
      end()
      return
    }
    last = performance.now()
    raf = requestAnimationFrame(frame)
  }

  return {
    end,
    paint,
    setLabel: (label: string) => {
      exit.textContent = label
    },
  }
}
