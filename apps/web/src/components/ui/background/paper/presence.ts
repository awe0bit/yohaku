export const PRESENCE_KEYS = [
  'base',
  'tone',
  'fiber',
  'suki',
  'sunago',
  'elem',
  'deco',
] as const
export type PresenceKey = (typeof PRESENCE_KEYS)[number]
export type PresencePhase = 'in' | 'out'

type Window = readonly [number, number]

export const TIMELINE: Record<PresencePhase, Record<PresenceKey, Window>> = {
  in: {
    base: [0, 1100],
    tone: [150, 1250],
    fiber: [350, 1450],
    suki: [700, 1800],
    sunago: [1000, 2000],
    elem: [1150, 4000],
    deco: [1500, 2500],
  },
  out: {
    elem: [0, 1250],
    deco: [0, 600],
    sunago: [100, 650],
    suki: [200, 750],
    fiber: [350, 950],
    tone: [500, 1100],
    base: [600, 1300],
  },
}

const REDUCED_SPAN_MS = 400

const easeInOut = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)
const easeIn = (t: number) => t * t * (2 - t) * t

export interface Presence {
  from: Record<PresenceKey, number>
  phase: PresencePhase
  start: number
  v: Record<PresenceKey, number>
}

const zeros = () =>
  Object.fromEntries(PRESENCE_KEYS.map((k) => [k, 0])) as Record<
    PresenceKey,
    number
  >

export const createPresence = (nowMs: number): Presence => ({
  phase: 'in',
  start: nowMs,
  from: zeros(),
  v: zeros(),
})

export const startPresence = (
  p: Presence,
  phase: PresencePhase,
  nowMs: number,
) => {
  p.from = { ...p.v }
  p.phase = phase
  p.start = nowMs
}

export const stepPresence = (p: Presence, nowMs: number, reduce: boolean) => {
  const elapsed = nowMs - p.start
  let busy = false
  for (const key of PRESENCE_KEYS) {
    const [a, b] = reduce ? [0, REDUCED_SPAN_MS] : TIMELINE[p.phase][key]
    const r = Math.min(1, Math.max(0, (elapsed - a) / (b - a)))
    if (r < 1) busy = true
    const from = p.from[key]
    p.v[key] =
      p.phase === 'in'
        ? from + (1 - from) * easeInOut(r)
        : from * (1 - easeIn(r))
  }
  return busy
}

export const leafClock = (p: Presence, nowMs: number) =>
  (nowMs - p.start - TIMELINE[p.phase].elem[0]) / 1000

export const presenceGone = (p: Presence) =>
  p.phase === 'out' && PRESENCE_KEYS.every((k) => p.v[k] <= 0.0001)
