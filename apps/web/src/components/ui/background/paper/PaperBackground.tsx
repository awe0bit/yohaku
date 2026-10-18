'use client'

import type { FC } from 'react'
import { useEffect, useRef } from 'react'

import { lightAt, localHour } from '~/lib/paper/light'
import { labToRgb } from '~/lib/paper/oklab'

import { createDye, dyeProgress, stepDye } from './dye'
import { dyeInput } from './dye-input'
import { createPressTracker, createSheetTracker } from './inputs'
import type { PageState } from './page-state'
import {
  easeProfile,
  isMoving,
  PAGE_PROFILES,
  profileSettled,
} from './page-state'
import {
  createPresence,
  leafClock,
  presenceGone,
  startPresence,
  stepPresence,
} from './presence'
import { PaperRenderer } from './renderer'

const SPEED = 3
const FRAME_MS = 33
const RESIZE_DEBOUNCE_MS = 150

export interface PaperBackgroundProps {
  dark: boolean
  hour?: number
  onExited?: () => void
  page: PageState
  reduceMotion: boolean
  term: number
  visible?: boolean
}

export const PaperBackground: FC<PaperBackgroundProps> = (props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<PaperRenderer | null>(null)
  const propsRef = useRef(props)
  useEffect(() => {
    propsRef.current = props
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let alive = true
    let renderer: PaperRenderer | null = null
    let ready = false
    let exited = false
    let resizeTimer = 0
    let builtFor = ''
    const presence = createPresence(performance.now())

    const exit = () => {
      if (exited) return
      exited = true
      propsRef.current.onExited?.()
    }

    const build = async () => {
      const target = renderer
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const key = `${width}x${height}@${dpr}`
      if (!target || !width || !height || key === builtFor) return
      builtFor = key
      const applied = await target.rebuild(width, height, dpr)
      if (!applied || !alive || ready || target !== renderer) return
      ready = true
      drawnKey = ''
      Object.assign(presence, createPresence(performance.now()))
    }

    const boot = () => {
      builtFor = ''
      renderer = PaperRenderer.create(canvas)
      rendererRef.current = renderer
      if (!renderer) {
        canvas.hidden = true
        exit()
        return
      }
      renderer.setTerm(propsRef.current.term, false)
      void build()
    }

    const onLost = (event: Event) => {
      event.preventDefault()
      ready = false
      renderer = null
      rendererRef.current = null
    }
    canvas.addEventListener('webglcontextlost', onLost)
    canvas.addEventListener('webglcontextrestored', boot)

    const resizeObserver = new ResizeObserver(() => {
      window.clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(() => void build(), RESIZE_DEBOUNCE_MS)
    })
    resizeObserver.observe(canvas)

    const presses = createPressTracker()
    const sheets = createSheetTracker()
    const dye = createDye()
    let profile = PAGE_PROFILES[propsRef.current.page]
    let t = 0
    let spinT = 0
    let bokT = 0
    let last = performance.now()
    let frame = 0
    let drawnKey = ''

    const loop = (nowMs: number) => {
      frame = requestAnimationFrame(loop)
      if (nowMs - last < FRAME_MS) return
      const dt = Math.min(0.1, (nowMs - last) / 1000)
      last = nowMs
      const {
        dark,
        hour,
        page,
        reduceMotion,
        visible = true,
      } = propsRef.current
      if (!ready || !renderer) {
        if (!visible) exit()
        return
      }
      if (visible !== (presence.phase === 'in')) {
        exited = false
        startPresence(presence, visible ? 'in' : 'out', nowMs)
      }
      const entering = stepPresence(presence, nowMs, reduceMotion)
      if (presenceGone(presence)) {
        exit()
        return
      }
      const now = nowMs / 1000
      profile = reduceMotion
        ? PAGE_PROFILES[page]
        : easeProfile(profile, PAGE_PROFILES[page], dt)
      if (!reduceMotion) {
        t += dt * SPEED
        spinT += dt * SPEED * profile.move.sunago
        bokT += dt * SPEED * profile.move.bok
      }
      stepDye(dye, dyeInput, now, dt)
      const theme = dark ? 1 : 0
      const light = lightAt(hour ?? localHour(new Date()))
      const pressed = reduceMotion ? [] : presses.read(nowMs)
      const rects = sheets.read(nowMs)
      const dyeAmount = dye.amp * dye.gate
      const dyeMix = dyeProgress(dye, now)
      const key = [
        theme,
        canvas.width,
        canvas.height,
        light.amount.toFixed(3),
        light.src[0].toFixed(3),
        light.src[1].toFixed(3),
        dyeAmount.toFixed(3),
        dyeMix.toFixed(3),
        ...rects.flatMap((r) =>
          [r.left, r.top, r.right, r.bottom].map(Math.round),
        ),
      ].join()
      const still =
        !entering &&
        !renderer.animating &&
        pressed.length === 0 &&
        (reduceMotion || !isMoving(profile)) &&
        profileSettled(profile, PAGE_PROFILES[page])
      if (still && key === drawnKey) return
      drawnKey = key
      renderer.render(
        {
          dark,
          t,
          spinT,
          bokT,
          profile,
          presence,
          reduceMotion,
          leafClock: leafClock(presence, nowMs),
          light,
          presses: pressed,
          sheets: rects,
          dye: {
            amount: dyeAmount,
            from: labToRgb(dye.from[theme]),
            to: labToRgb(dye.to[theme]),
            mix: dyeMix,
          },
        },
        now,
      )
    }

    boot()
    frame = requestAnimationFrame(loop)

    return () => {
      alive = false
      cancelAnimationFrame(frame)
      window.clearTimeout(resizeTimer)
      resizeObserver.disconnect()
      canvas.removeEventListener('webglcontextlost', onLost)
      canvas.removeEventListener('webglcontextrestored', boot)
      presses.dispose()
      sheets.dispose()
      renderer?.dispose()
      rendererRef.current = null
    }
  }, [])

  useEffect(() => {
    rendererRef.current?.setTerm(props.term, !props.reduceMotion)
  }, [props.term, props.reduceMotion])

  return (
    <canvas
      aria-hidden
      data-hide-print
      className="pointer-events-none fixed inset-0 -z-10 size-full"
      ref={canvasRef}
    />
  )
}
