export type HeaderPhase = 'top' | 'hidden' | 'strip'

export const HEADER_REVEAL_MIN_Y = 180
const DIRECTION_DEADZONE = 3
const FADE_START_Y = 40
const FADE_END_Y = 150
const MAX_DRIFT = 6
const INTERACTIVE_MIN_OPACITY = 0.05

export interface HeaderScrollState {
  anchorY: number
  lastY: number
  phase: HeaderPhase
}

export const stepHeaderScroll = (
  state: HeaderScrollState,
  y: number,
): HeaderScrollState => {
  if (y < HEADER_REVEAL_MIN_Y) return { phase: 'top', anchorY: y, lastY: y }
  const reversed = (y - state.lastY) * (state.lastY - state.anchorY) < 0
  const anchorY = reversed ? state.lastY : state.anchorY
  const distance = y - anchorY
  if (distance < -DIRECTION_DEADZONE) {
    return { phase: 'strip', anchorY: y, lastY: y }
  }
  if (distance > DIRECTION_DEADZONE) {
    return { phase: 'hidden', anchorY: y, lastY: y }
  }
  return {
    phase: state.phase === 'top' ? 'hidden' : state.phase,
    anchorY,
    lastY: y,
  }
}

export const resolveTopFade = (y: number) => {
  const progress = (y - FADE_START_Y) / (FADE_END_Y - FADE_START_Y)
  const opacity = Math.min(1, Math.max(0, 1 - progress))
  const shift = -(Math.min(Math.max(y, 0), FADE_END_Y) / FADE_END_Y) * MAX_DRIFT
  return {
    opacity,
    shift: shift === 0 ? 0 : shift,
    visible: opacity >= INTERACTIVE_MIN_OPACITY,
  }
}
