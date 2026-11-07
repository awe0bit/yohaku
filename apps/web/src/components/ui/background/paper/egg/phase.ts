import type { LayerMotion, LayerVisibility, Profile } from '../page-state'

export type EggStage = 'reading' | 'entering' | 'immersed' | 'exiting'

export interface EggState {
  from: Profile | null
  restoreT: number
  stage: EggStage
  t: number
}

export const EGG_TIMING = {
  enterS: 6,
  restoreS: 3.2,
  cancelS: 1.5,
  exitButtonS: 2,
  lowResS: 1.2,
  sheetS: 1,
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

export const createEggPhase = (): EggState => ({
  stage: 'reading',
  t: 0,
  restoreT: 0,
  from: null,
})

export const enterEgg = (s: EggState, from: Profile) => {
  if (s.stage !== 'reading') return
  Object.assign(s, {
    stage: 'entering',
    t: 0,
    restoreT: 0,
    from: structuredClone(from),
  })
}

export const leaveEgg = (s: EggState) => {
  if (s.stage !== 'entering' && s.stage !== 'immersed') return false
  s.stage = 'exiting'
  s.t = 0
  return true
}

export const resetEgg = (s: EggState) => Object.assign(s, createEggPhase())

export const stepEggPhase = (s: EggState, dt: number) => {
  if (s.stage === 'reading') return
  s.t += dt
  s.restoreT += dt
  if (s.stage === 'entering' && s.t >= EGG_TIMING.enterS) {
    s.stage = 'immersed'
    s.t = 0
  }
}

export const wantsFull = (s: EggState) =>
  s.stage === 'entering' || s.stage === 'immersed'

export const canCancel = (s: EggState) =>
  s.stage === 'entering' && s.t < EGG_TIMING.cancelS

export const showsExit = (s: EggState) =>
  s.stage === 'immersed' ||
  (s.stage === 'entering' && s.t >= EGG_TIMING.exitButtonS)

export const paperLowRes = (s: EggState) =>
  s.stage === 'immersed' ||
  (s.stage === 'entering' && s.t >= EGG_TIMING.lowResS)

export const pageLayerVisibility = (s: EggState) => {
  if (s.stage === 'reading') return 1
  if (s.stage === 'exiting') return ease(s.t / EGG_TIMING.sheetS)
  return s.stage === 'immersed' ? 0 : 1 - ease(s.t / EGG_TIMING.sheetS)
}

export const overrideProfile = (profile: Profile, s: EggState): Profile => {
  if (s.stage === 'reading') return profile
  const out: Profile = {
    vis: { ...profile.vis },
    move: { ...profile.move },
    glint: profile.glint,
  }
  const restoring =
    s.from && wantsFull(s) && s.restoreT < EGG_TIMING.restoreS + 0.2
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
  const sheet = pageLayerVisibility(s)
  out.vis.sheet = Math.min(out.vis.sheet, sheet)
  out.vis.dye = Math.min(out.vis.dye, sheet)
  return out
}
