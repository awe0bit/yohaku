import { accentRgb } from '~/lib/paper/season'

import { layoutElements } from '../layout'
import { PAGE_PROFILES } from '../page-state'
import { eggBridge } from './bridge'
import { KEEP_ATTR } from './capture'
import { hidePage, swallowExitKey } from './dom'
import { stepFalls, stepFireflies } from './falls'
import type { Drop } from './fluid'
import {
  addSplat,
  createFluid,
  flowBytes,
  liveDrops,
  stepDisplacement,
  stepFluid,
  velocityBytes,
} from './fluid'
import { createInk } from './ink-gl'
import { eggCurves, enterEgg, leaveEgg, resetEgg, stepEggPhase } from './phase'
import { drawSpriteWorld } from './sprite-draw'
import {
  clickSprites,
  createSpriteWorld,
  liftSprites,
  stepSprites,
} from './sprites'

export interface SessionEnv {
  dark: boolean
  exitLabel: string
  term: number
}

interface SessionInput {
  dpr: number
  env: () => SessionEnv
  height: number
  onEnd: () => void
  onTravel: (distance: number) => boolean
  snapshot: HTMLCanvasElement
  sources: HTMLElement[]
  width: number
}

const FRAME_MS = 33
const SUMI_LIGHT: [number, number, number] = [0.13, 0.12, 0.11]
const SUMI_DARK: [number, number, number] = [0.86, 0.84, 0.8]
const EXIT_CLASS =
  'absolute bottom-7 left-1/2 -translate-x-1/2 translate-y-1.5 cursor-pointer rounded-[2px] border border-neutral-5/40 bg-paper/70 py-2 pl-[18px] pr-4 font-serif text-[13px] leading-none tracking-[0.12em] text-neutral-7 opacity-0 pointer-events-none transition-[opacity,translate,color] duration-[900ms] data-[show]:translate-y-0 data-[show]:opacity-70 data-[show]:pointer-events-auto hover:data-[show]:opacity-100 hover:text-neutral-9'

const makeLayer = (label: string) => {
  const layer = document.createElement('div')
  layer.setAttribute(KEEP_ATTR, '')
  layer.setAttribute('aria-hidden', 'true')
  layer.style.cssText =
    'position:fixed;inset:0;z-index:9990;cursor:default;touch-action:none;'
  const glCanvas = document.createElement('canvas')
  const spriteCanvas = document.createElement('canvas')
  for (const c of [glCanvas, spriteCanvas])
    c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;'
  const exit = document.createElement('button')
  exit.type = 'button'
  exit.className = EXIT_CLASS
  exit.textContent = label
  layer.append(glCanvas, spriteCanvas, exit)
  document.body.append(layer)
  return { layer, glCanvas, spriteCanvas, exit }
}

export const startSession = (input: SessionInput) => {
  const { width: W, height: H, dpr } = input
  const { layer, glCanvas, spriteCanvas, exit } = makeLayer(
    input.env().exitLabel,
  )
  const ink = createInk(glCanvas)
  const sctx = spriteCanvas.getContext('2d')
  if (!ink || !sctx) {
    layer.remove()
    ink?.dispose()
    return null
  }
  ink.resize(W, H)
  ink.seed(input.snapshot)
  spriteCanvas.width = Math.round(W * dpr)
  spriteCanvas.height = Math.round(H * dpr)
  const hidden = hidePage(input.sources)
  const fluid = createFluid(W, H)
  const drops: Drop[] = []
  const world = createSpriteWorld()
  Object.assign(world, {
    w: W,
    h: H,
    dpr,
    dark: input.env().dark,
    placements: layoutElements(W, H, input.env().term),
  })
  liftSprites(world)
  const state = eggBridge.state
  enterEgg(state, eggBridge.profile ?? PAGE_PROFILES.browse)

  let raf = 0
  let last = performance.now()
  let version = 0
  let dropTurn = 0
  let prev: { t: number; x: number; y: number } | null = null
  let ended = false

  const leave = () => {
    leaveEgg(state)
  }

  const end = () => {
    if (ended) return
    ended = true
    cancelAnimationFrame(raf)
    window.removeEventListener('wheel', onWheel, true)
    window.removeEventListener('keydown', onKey, true)
    window.removeEventListener('resize', end)
    document.removeEventListener('visibilitychange', onVisibility)
    resetEgg(state)
    eggBridge.flow = null
    hidden.restore()
    ink.dispose()
    layer.remove()
    input.onEnd()
  }

  const drop = (x: number, y: number, now: number) => {
    if (clickSprites(world, x, y)) return
    const turn = dropTurn++ % 4
    drops.push({ x, y, t0: now, q: 52_000 })
    if (drops.length > 8) drops.shift()
    if (turn === 1 || turn === 3) {
      ink.pushDye({ x, y, r: 16, erase: true })
      return
    }
    const { dark, term } = input.env()
    ink.pushDye({
      x,
      y,
      r: 15,
      rgb: turn === 0 ? (dark ? SUMI_DARK : SUMI_LIGHT) : accentRgb(term, dark),
      a: turn === 0 ? 0.75 : 0.65,
    })
  }

  const onMove = (e: PointerEvent) => {
    const now = performance.now()
    const p = { x: e.clientX, y: e.clientY, t: now }
    const before = prev
    prev = p
    if (!before) {
      world.pointer = { x: p.x, y: p.y, stillAt: now }
      return
    }
    const d = Math.hypot(p.x - before.x, p.y - before.y)
    world.pointer = {
      x: p.x,
      y: p.y,
      stillAt: d > 3 ? now : (world.pointer?.stillAt ?? now),
    }
    if (state.stage === 'sinking' && state.dir > 0) {
      if (input.onTravel(d)) leave()
      return
    }
    if (state.stage !== 'immersed') return
    const dt = Math.max(0.008, (p.t - before.t) / 1000)
    const k = Math.min(1, 900 / (d / dt + 1))
    addSplat(fluid, {
      x: p.x,
      y: p.y,
      vx: ((p.x - before.x) / dt) * k,
      vy: ((p.y - before.y) / dt) * k,
      r: 42,
    })
  }

  const onDown = (e: PointerEvent) => {
    if (e.target === exit) return
    if (state.stage === 'immersed')
      drop(e.clientX, e.clientY, performance.now())
    else leave()
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
  layer.addEventListener('pointerleave', () => {
    world.pointer = null
    prev = null
  })
  exit.addEventListener('click', leave)
  glCanvas.addEventListener('webglcontextlost', end)
  window.addEventListener('wheel', onWheel, { capture: true, passive: false })
  window.addEventListener('keydown', onKey, true)
  window.addEventListener('resize', end)
  document.addEventListener('visibilitychange', onVisibility)

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame)
    if (now - last < FRAME_MS - 2) return
    const dt = Math.min(0.08, (now - last) / 1000)
    last = now
    if (eggBridge.lost || stepEggPhase(state, dt) !== 'running') {
      end()
      return
    }
    const c = eggCurves(state)
    const { dark, term } = input.env()
    const live = liveDrops(drops, now)
    stepFluid(fluid, dt, now, c.ambient)
    stepDisplacement(fluid, dt, now, state.stage === 'exiting', live)
    eggBridge.flow = {
      bytes: flowBytes(fluid),
      gx: fluid.gx,
      gy: fluid.gy,
      version: ++version,
    }
    stepFalls(world, now, c.falling)
    stepSprites(world, fluid, drops, dt, now, c.settle)
    stepFireflies(world, dt, now, term)
    ink.advect(
      velocityBytes(fluid),
      fluid.gx,
      fluid.gy,
      dt,
      now,
      c.decay,
      c.diffusion,
      liveDrops(drops, now),
    )
    ink.setOutputScale(c.sharp ? dpr : 1)
    ink.show({
      crisp: c.crisp,
      dyeK: c.dyeK,
      reprint: c.reprint,
      veil: c.veil,
      dark,
      accent: accentRgb(term, dark),
      now,
    })
    drawSpriteWorld(sctx, world, now, c.spriteAlpha, c.lift, c.settle)
    hidden.setImageFade(c.images)
    exit.toggleAttribute('data-show', c.showExit)
  }
  raf = requestAnimationFrame(frame)

  return {
    end,
    setLabel: (label: string) => {
      exit.textContent = label
    },
  }
}

export type EggSession = NonNullable<ReturnType<typeof startSession>>
