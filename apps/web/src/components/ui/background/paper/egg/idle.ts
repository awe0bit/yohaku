export const IDLE_MS = 60_000
export const CANCEL_TRAVEL_PX = 60
export const MOVE_SLOP_PX = 2

export interface IdleClock {
  last: number
  travel: number
}

export interface TriggerConditions {
  backgroundOn: boolean
  backgroundReady: boolean
  captureSupported: boolean
  desktop: boolean
  focusBusy: boolean
  mediaPlaying: boolean
  overlayOpen: boolean
  pageVisible: boolean
  reducedMotion: boolean
}

export const createIdleClock = (now: number): IdleClock => ({
  last: now,
  travel: 0,
})

export const pokeIdle = (clock: IdleClock, now: number) => {
  clock.last = now
  clock.travel = 0
}

export const idleFor = (clock: IdleClock, now: number) => now - clock.last

export const addTravel = (clock: IdleClock, distance: number) => {
  clock.travel += distance
  return clock.travel > CANCEL_TRAVEL_PX
}

export const canTrigger = (
  c: TriggerConditions,
  idleMs: number,
  threshold = IDLE_MS,
) =>
  idleMs >= threshold &&
  c.desktop &&
  c.backgroundOn &&
  c.backgroundReady &&
  !c.reducedMotion &&
  c.pageVisible &&
  c.captureSupported &&
  !c.overlayOpen &&
  !c.mediaPlaying &&
  !c.focusBusy
