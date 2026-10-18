import type { Lab } from '~/lib/paper/oklab'
import { lerp3 } from '~/lib/paper/season'

export type LabPair = [light: Lab, dark: Lab]

export interface DyeInput {
  key: string | null
  labs: LabPair | null
  velocity: number
  weight: number
}

export interface Dye {
  amp: number
  cand: string | null
  candSince: number
  from: LabPair
  gate: number
  key: string | null
  start: number
  to: LabPair
  velocity: number
}

const REDYE_S = 3
const SWITCH_DELAY_S = 0.35
const NEUTRAL: LabPair = [
  [0.62, 0, 0],
  [0.46, 0, 0],
]

const smooth = (t: number) => t * t * (3 - 2 * t)
const ease = (dt: number, tau: number) => 1 - Math.exp(-dt / tau)

export const createDye = (): Dye => ({
  key: null,
  from: NEUTRAL,
  to: NEUTRAL,
  start: Number.NEGATIVE_INFINITY,
  amp: 0,
  gate: 1,
  cand: null,
  candSince: 0,
  velocity: 0,
})

export const dyeProgress = (dye: Dye, now: number) =>
  smooth(Math.min(1, Math.max(0, (now - dye.start) / REDYE_S)))

const switchTo = (dye: Dye, key: string, labs: LabPair, now: number) => {
  const m = dyeProgress(dye, now)
  dye.from = [
    lerp3(dye.from[0], dye.to[0], m),
    lerp3(dye.from[1], dye.to[1], m),
  ]
  dye.to = labs
  dye.key = key
  dye.start = now
  dye.cand = null
}

export const stepDye = (dye: Dye, input: DyeInput, now: number, dt: number) => {
  const { key, labs } = input
  if (key && labs && key !== dye.key) {
    if (dye.key === null || dye.amp < 0.05) {
      dye.key = key
      dye.from = labs
      dye.to = labs
      dye.start = Number.NEGATIVE_INFINITY
      dye.cand = null
    } else if (dye.cand !== key) {
      dye.cand = key
      dye.candSince = now
    } else if (now - dye.candSince > SWITCH_DELAY_S) {
      switchTo(dye, key, labs, now)
    }
  } else {
    dye.cand = null
  }
  dye.amp += (input.weight - dye.amp) * ease(dt, 0.6)
  dye.velocity += (input.velocity - dye.velocity) * ease(dt, 0.09)
  const gateTarget =
    1 - 0.55 * smooth(Math.min(1, Math.max(0, (dye.velocity - 1200) / 2800)))
  dye.gate +=
    (gateTarget - dye.gate) * ease(dt, gateTarget < dye.gate ? 0.7 : 1.1)
}
