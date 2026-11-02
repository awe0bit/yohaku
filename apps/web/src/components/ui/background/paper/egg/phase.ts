import type { LayerMotion, LayerVisibility, Profile } from '../page-state'

export type EggStage = 'reading' | 'sinking' | 'immersed' | 'exiting'

export interface EggState {
  dir: 1 | -1
  exitT: number
  from: Profile | null
  restoreT: number
  sink: number
  stage: EggStage
}

export const EGG_TIMING = {
  sinkS: 22,
  restoreS: 3.2,
  exitS: 2.4,
  cancelS: 0.6,
  exitAfter: 0.6,
  inkKeep: 0.6,
}

type RestoreKey =
  `vis.${keyof LayerVisibility}` | `move.${keyof LayerMotion}` | 'glint'

export const RESTORE: Partial<
  Record<RestoreKey, [delay: number, dur: number]>
> = {
  'vis.paper': [0, 1.2],
  'vis.fiber': [0.3, 1.4],
  'vis.sunago': [0.8, 1.4],
  'vis.suki': [0.9, 1.4],
  'vis.bok': [1.2, 1.4],
  'vis.elem': [1.6, 1.6],
  'move.fiber': [2.2, 1],
  'move.suki': [2.2, 1],
  'move.sunago': [2.2, 1],
  'move.bok': [2.2, 1],
  glint: [2.2, 1],
}

const ease = (t: number) => {
  const c = Math.min(1, Math.max(0, t))
  return c * c * (3 - 2 * c)
}
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

export const liftOf = (sink: number) => ease((sink - 0.62) / 0.33)

export const createEggPhase = (): EggState => ({
  stage: 'reading',
  sink: 0,
  dir: 1,
  exitT: 0,
  restoreT: 0,
  from: null,
})

export const enterEgg = (s: EggState, from: Profile) => {
  if (s.stage !== 'reading') return
  Object.assign(s, {
    stage: 'sinking',
    sink: 0,
    dir: 1,
    exitT: 0,
    restoreT: 0,
    from: structuredClone(from),
  })
}

export const leaveEgg = (s: EggState): 'exit' | 'cancel' | 'none' => {
  if (
    s.stage === 'immersed' ||
    (s.stage === 'sinking' && s.dir > 0 && s.sink > EGG_TIMING.exitAfter)
  ) {
    s.stage = 'exiting'
    s.exitT = 0
    return 'exit'
  }
  if (s.stage === 'sinking' && s.dir > 0) {
    s.dir = -1
    return 'cancel'
  }
  return 'none'
}

export const resetEgg = (s: EggState) => Object.assign(s, createEggPhase())

export const stepEggPhase = (
  s: EggState,
  dt: number,
  sinkS = EGG_TIMING.sinkS,
): 'running' | 'finished' | 'idle' => {
  if (s.stage === 'reading') return 'idle'
  s.restoreT += dt
  if (s.stage === 'sinking') {
    s.sink = clamp01(
      s.sink + (s.dir > 0 ? dt / sinkS : -dt / EGG_TIMING.cancelS),
    )
    if (s.dir > 0 && s.sink >= 1) s.stage = 'immersed'
    if (s.dir < 0 && s.sink <= 0) {
      resetEgg(s)
      return 'finished'
    }
  }
  if (s.stage === 'exiting') {
    s.exitT += dt
    if (s.exitT >= EGG_TIMING.exitS) {
      resetEgg(s)
      return 'finished'
    }
  }
  return 'running'
}

export const wantsFull = (s: EggState) =>
  s.stage !== 'reading' && !(s.stage === 'sinking' && s.dir < 0)

const settleOf = (s: EggState) =>
  s.stage === 'exiting' ? clamp01(s.exitT / (EGG_TIMING.exitS * 0.4)) : 0

export const overrideProfile = (profile: Profile, s: EggState): Profile => {
  if (s.stage === 'reading') return profile
  const out: Profile = {
    vis: { ...profile.vis },
    move: { ...profile.move },
    glint: profile.glint,
  }
  const restoring =
    s.from &&
    wantsFull(s) &&
    s.stage !== 'exiting' &&
    s.restoreT < EGG_TIMING.restoreS + 0.2
  if (restoring && s.from) {
    for (const [key, [delay, dur]] of Object.entries(RESTORE) as [
      RestoreKey,
      [number, number],
    ][]) {
      const k = ease((s.restoreT - delay) / dur)
      if (key === 'glint') out.glint = s.from.glint + (1 - s.from.glint) * k
      else {
        const [group, name] = key.split('.') as ['vis' | 'move', string]
        const from = (s.from[group] as unknown as Record<string, number>)[name]
        ;(out[group] as unknown as Record<string, number>)[name] =
          from + (1 - from) * k
      }
    }
  }
  if (s.stage === 'sinking' || s.stage === 'immersed') {
    const k = s.stage === 'immersed' ? 1 : ease(s.sink)
    out.vis.sheet = 1 - k
    out.vis.dye = Math.min(out.vis.dye, 1 - k)
    out.vis.elem = Math.min(
      out.vis.elem,
      1 - liftOf(s.stage === 'immersed' ? 1 : s.sink),
    )
  } else {
    const settle = settleOf(s)
    out.vis.sheet = settle
    out.vis.elem = settle
  }
  return out
}

export interface EggCurves {
  ambient: number
  crisp: number
  decay: number
  diffusion: number
  dyeK: number
  falling: boolean
  images: number
  lift: number
  reprint: number
  settle: number
  sharp: boolean
  showExit: boolean
  spriteAlpha: number
  veil: number
  wet: boolean
}

export const eggCurves = (
  s: EggState,
  inkKeep = EGG_TIMING.inkKeep,
): EggCurves => {
  const sinking = s.stage === 'sinking'
  const immersed = s.stage === 'immersed'
  const exiting = s.stage === 'exiting'
  const settle = settleOf(s)
  const q = exiting ? clamp01((s.exitT / EGG_TIMING.exitS - 0.3) / 0.7) : 0
  const loss = 1 - inkKeep
  return {
    wet: s.stage !== 'reading',
    settle,
    crisp: sinking ? 1 - ease(s.sink / 0.1) : 0,
    dyeK: (sinking ? ease(s.sink / 0.1) : 1) * (1 - settle),
    reprint: exiting ? Math.max(0.0001, 1 - q) : 0,
    veil: sinking
      ? ease((s.sink - 0.12) / 0.7)
      : immersed
        ? 1
        : exiting
          ? 1 - ease(settle)
          : 0,
    decay: sinking
      ? loss * 0.5 * ease((s.sink - 0.2) / 0.7)
      : immersed
        ? loss * 0.05
        : 0,
    diffusion: sinking ? 0.002 + 0.03 * ease((s.sink - 0.35) / 0.6) : 0.014,
    ambient: sinking ? 26 * ease((s.sink - 0.2) / 0.6) : immersed ? 10 : 0,
    lift: sinking ? liftOf(s.sink) : exiting ? 1 - settle : 1,
    images: sinking
      ? 1 - ease(s.sink / 0.35)
      : exiting
        ? ease(q)
        : immersed
          ? 0
          : 1,
    spriteAlpha: exiting ? 1 - settle : 1,
    sharp: (sinking && s.sink < 0.7) || exiting,
    showExit: (sinking && s.dir > 0 && s.sink > 0.3) || immersed,
    falling: immersed || (sinking && s.dir > 0 && s.sink > 0.75),
  }
}
