import { supportsDrawable } from '~/lib/html-in-canvas'

import { moveIntoCanvas, moveOutOfCanvas } from './canvas-move'
import { recordAnimations, restoreAnimations } from './freeze'
import { HOLD_MS, HOLD_TYPE, holdStyle } from './hold-style'

export const YOHAKU_ROOT_TAG = 'yohaku-root'

interface DrawableCanvas extends HTMLCanvasElement {
  onpaint: ((event: Event) => void) | null
  requestPaint?: () => void
}

type StartViewTransition = (options: {
  types: string[]
  update: () => void
}) => unknown

export interface YohakuRootElement extends HTMLElement {
  readonly drawn: boolean
  enter: (
    onPaint: (canvas: HTMLCanvasElement) => void,
  ) => Promise<HTMLCanvasElement | null>
  exit: () => void
  readonly supported: boolean
}

const SHADOW_STYLE = `
:host { display: block; }
.frame { position: relative; }
canvas { display: none; }
.frame[data-drawn] canvas { display: block; position: sticky; top: 0; width: 100%; height: 100vh; }
.frame[data-drawn] ::slotted(*) { width: 100%; }
`
const HOLD_STYLE_ID = 'yohaku-root-hold'

const ensureHoldStyle = () => {
  if (document.getElementById(HOLD_STYLE_ID)) return
  const style = document.createElement('style')
  style.id = HOLD_STYLE_ID
  style.textContent = holdStyle(HOLD_TYPE, HOLD_MS)
  document.head.append(style)
}

type Mode = 'dom' | 'entering' | 'drawn'

const getAnimations = () => document.getAnimations()

const createElementClass = () =>
  class extends HTMLElement implements YohakuRootElement {
    #frame: HTMLDivElement | null = null
    #slot: HTMLSlotElement | null = null
    #canvas: DrawableCanvas | null = null
    #mode: Mode = 'dom'

    connectedCallback() {
      if (this.#frame || !supportsDrawable()) return
      const shadow = this.attachShadow({ mode: 'open' })
      const style = document.createElement('style')
      style.textContent = SHADOW_STYLE
      const frame = document.createElement('div')
      frame.className = 'frame'
      const slot = document.createElement('slot')
      const canvas = document.createElement('canvas') as DrawableCanvas
      canvas.setAttribute('layoutsubtree', '')
      canvas.setAttribute('content', 'drawable')
      frame.append(slot, canvas)
      shadow.append(style, frame)
      this.#frame = frame
      this.#slot = slot
      this.#canvas = canvas
    }

    get supported() {
      return !!this.#frame
    }

    get drawn() {
      return this.#mode === 'drawn'
    }

    enter(onPaint: (canvas: HTMLCanvasElement) => void) {
      const frame = this.#frame
      const slot = this.#slot
      const canvas = this.#canvas
      if (!frame || !slot || !canvas || this.#mode !== 'dom')
        return Promise.resolve(null)
      this.#mode = 'entering'
      return new Promise<HTMLCanvasElement | null>((resolve) => {
        const update = () => {
          const target = this.firstElementChild
          if (this.#mode !== 'entering' || !target) {
            resolve(null)
            return
          }
          const moved = moveIntoCanvas(
            { frame, slot, canvas, target, animations: getAnimations },
            onPaint,
          )
          if (!moved) {
            this.#mode = 'dom'
            resolve(null)
            return
          }
          this.#mode = 'drawn'
          canvas.requestPaint?.()
          resolve(canvas)
        }
        const start = document.startViewTransition as unknown as
          StartViewTransition | undefined
        if (!start) return update()
        ensureHoldStyle()
        start.call(document, { update, types: [HOLD_TYPE] })
      })
    }

    exit() {
      const frame = this.#frame
      const slot = this.#slot
      const canvas = this.#canvas
      if (this.#mode === 'entering') this.#mode = 'dom'
      if (!frame || !slot || !canvas || this.#mode !== 'drawn') return
      const target = this.firstElementChild
      const saved = target ? recordAnimations(getAnimations(), target) : []
      this.#mode = 'dom'
      moveOutOfCanvas({ frame, slot, canvas })
      if (!target) return
      try {
        restoreAnimations(getAnimations(), target, saved, false)
      } catch {}
    }
  }

export const defineYohakuRoot = () => {
  if (typeof window === 'undefined' || customElements.get(YOHAKU_ROOT_TAG))
    return
  customElements.define(YOHAKU_ROOT_TAG, createElementClass())
}

export const getYohakuRoot = () =>
  typeof document === 'undefined'
    ? null
    : document.querySelector<YohakuRootElement>(YOHAKU_ROOT_TAG)
