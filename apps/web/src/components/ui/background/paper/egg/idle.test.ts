import { describe, expect, it } from 'vitest'

import type { TriggerConditions } from './idle'
import {
  addTravel,
  canTrigger,
  createIdleClock,
  IDLE_MS,
  idleFor,
  pokeIdle,
} from './idle'

const ready: TriggerConditions = {
  desktop: true,
  backgroundOn: true,
  backgroundReady: true,
  reducedMotion: false,
  pageVisible: true,
  captureSupported: true,
  overlayOpen: false,
  mediaPlaying: false,
  focusBusy: false,
}

describe('idle clock', () => {
  it('measures time since the last activity', () => {
    const c = createIdleClock(1000)
    expect(idleFor(c, 5000)).toBe(4000)
    pokeIdle(c, 4000)
    expect(idleFor(c, 5000)).toBe(1000)
  })

  it('reports cancel once pointer travel passes 60px', () => {
    const c = createIdleClock(0)
    expect(addTravel(c, 40)).toBe(false)
    expect(addTravel(c, 25)).toBe(true)
    pokeIdle(c, 10)
    expect(addTravel(c, 30)).toBe(false)
  })
})

describe('canTrigger', () => {
  it('fires when every condition holds and the threshold has passed', () => {
    expect(canTrigger(ready, IDLE_MS)).toBe(true)
    expect(canTrigger(ready, IDLE_MS - 1)).toBe(false)
  })

  it.each(Object.keys(ready) as (keyof TriggerConditions)[])(
    'blocks when %s fails',
    (key) => {
      expect(canTrigger({ ...ready, [key]: !ready[key] }, IDLE_MS)).toBe(false)
    },
  )
})
