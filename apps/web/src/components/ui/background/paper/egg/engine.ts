import { eggBridge } from './bridge'
import {
  canCapture,
  capturePage,
  captureSources,
  viewportSize,
} from './capture'
import { isFocusBusy, isMediaPlaying, isOverlayOpen } from './dom'
import {
  addTravel,
  canTrigger,
  createIdleClock,
  IDLE_MS,
  idleFor,
  MOVE_SLOP_PX,
  pokeIdle,
} from './idle'
import type { EggSession, SessionEnv } from './session'
import { startSession } from './session'

export interface EggEnv extends SessionEnv {
  reduceMotion: boolean
}

const CHECK_MS = 1000
const ACTIVITY = [
  'wheel',
  'scroll',
  'keydown',
  'pointerdown',
  'touchstart',
  'focusin',
]
const DEV_IDLE_KEY = 'paper-egg-idle-ms'

const idleThreshold = () => {
  if (process.env.NODE_ENV === 'production') return IDLE_MS
  const value = Number(window.localStorage.getItem(DEV_IDLE_KEY))
  return value > 0 ? value : IDLE_MS
}

export const createEggEngine = (initial: EggEnv) => {
  let env = initial
  const clock = createIdleClock(performance.now())
  let session: EggSession | null = null
  let starting = false
  let disposed = false
  let lastPointer: { x: number; y: number } | null = null

  const poke = () => {
    if (!session) pokeIdle(clock, performance.now())
  }
  const onPointerMove = (e: PointerEvent) => {
    const p = { x: e.clientX, y: e.clientY }
    const before = lastPointer
    lastPointer = p
    if (before && Math.hypot(p.x - before.x, p.y - before.y) > MOVE_SLOP_PX)
      poke()
  }
  window.addEventListener('pointermove', onPointerMove, { passive: true })
  for (const type of ACTIVITY)
    window.addEventListener(type, poke, { passive: true, capture: true })

  const start = async () => {
    starting = true
    const startedAt = clock.last
    const { width, height } = viewportSize()
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const sources = captureSources()
    const snapshot = await capturePage(sources, { width, height, dpr })
    starting = false
    if (!snapshot || disposed || clock.last !== startedAt) {
      pokeIdle(clock, performance.now())
      return
    }
    session = startSession({
      snapshot,
      sources,
      width,
      height,
      dpr,
      env: () => env,
      onTravel: (distance) => addTravel(clock, distance),
      onEnd: () => {
        session = null
        lastPointer = null
        pokeIdle(clock, performance.now())
      },
    })
    if (!session) pokeIdle(clock, performance.now())
  }

  const check = () => {
    if (session || starting || disposed) return
    const idle = idleFor(clock, performance.now())
    const threshold = idleThreshold()
    if (idle < threshold) return
    const ok = canTrigger(
      {
        desktop: true,
        backgroundOn: true,
        backgroundReady: eggBridge.ready && !eggBridge.lost,
        reducedMotion: env.reduceMotion,
        pageVisible: document.visibilityState === 'visible',
        captureSupported: canCapture(),
        overlayOpen: isOverlayOpen(),
        mediaPlaying: isMediaPlaying(),
        focusBusy: isFocusBusy(document.activeElement as HTMLElement | null),
      },
      idle,
      threshold,
    )
    if (ok) void start()
  }
  const timer = window.setInterval(check, CHECK_MS)

  return {
    update(next: EggEnv) {
      const themeChanged = next.dark !== env.dark
      env = next
      if (themeChanged || next.reduceMotion) session?.end()
      session?.setLabel(next.exitLabel)
    },
    forceEnd() {
      session?.end()
      poke()
    },
    dispose() {
      disposed = true
      window.clearInterval(timer)
      window.removeEventListener('pointermove', onPointerMove)
      for (const type of ACTIVITY)
        window.removeEventListener(type, poke, { capture: true })
      session?.end()
    },
  }
}
