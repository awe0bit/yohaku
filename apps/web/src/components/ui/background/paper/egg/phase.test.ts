import { describe, expect, it } from 'vitest'

import { PAGE_PROFILES } from '../page-state'
import type { EggState } from './phase'
import {
  canCancel,
  createEggPhase,
  EGG_TIMING,
  enterEgg,
  leaveEgg,
  overrideProfile,
  pageLayerVisibility,
  paperLowRes,
  showsExit,
  stepEggPhase,
  wantsFull,
} from './phase'

const run = (state: EggState, seconds: number) => {
  for (let t = 0; t < seconds; t += 1 / 30) stepEggPhase(state, 1 / 30)
}

describe('egg phase', () => {
  it('restores every layer to browse by the restore time from the read page', () => {
    const s = createEggPhase()
    enterEgg(s, PAGE_PROFILES.read)
    run(s, EGG_TIMING.restoreS)
    const p = overrideProfile(structuredClone(PAGE_PROFILES.read), s)
    expect(p.vis.paper).toBeCloseTo(1)
    expect(p.vis.fiber).toBeCloseTo(1)
    expect(p.vis.elem).toBeCloseTo(1)
    expect(p.move.fiber).toBeCloseTo(1)
    expect(p.glint).toBeCloseTo(1)
  })

  it('staggers the restore: paper moves before the pressed elements', () => {
    const s = createEggPhase()
    enterEgg(s, PAGE_PROFILES.immersive)
    run(s, 1)
    const p = overrideProfile(structuredClone(PAGE_PROFILES.immersive), s)
    expect(p.vis.paper).toBeGreaterThan(PAGE_PROFILES.immersive.vis.paper)
    expect(p.vis.elem).toBe(PAGE_PROFILES.immersive.vis.elem)
  })

  it('leaves the first frame identical to the page', () => {
    const s = createEggPhase()
    enterEgg(s, PAGE_PROFILES.read)
    const p = overrideProfile(structuredClone(PAGE_PROFILES.read), s)
    expect(p).toEqual(PAGE_PROFILES.read)
    expect(paperLowRes(s)).toBe(false)
  })

  it('hides sheet shadows and fore-edge dye while immersed and brings them back on exit', () => {
    const s = createEggPhase()
    enterEgg(s, PAGE_PROFILES.browse)
    run(s, EGG_TIMING.enterS + 0.1)
    expect(s.stage).toBe('immersed')
    const hidden = overrideProfile(structuredClone(PAGE_PROFILES.browse), s)
    expect(hidden.vis.sheet).toBe(0)
    expect(hidden.vis.dye).toBe(0)
    expect(leaveEgg(s)).toBe(true)
    expect(wantsFull(s)).toBe(false)
    run(s, EGG_TIMING.sheetS + 0.1)
    expect(pageLayerVisibility(s)).toBe(1)
    const back = overrideProfile(structuredClone(PAGE_PROFILES.browse), s)
    expect(back.vis.sheet).toBe(1)
  })

  it('only lets pointer travel cancel during the opening window', () => {
    const s = createEggPhase()
    enterEgg(s, PAGE_PROFILES.read)
    expect(canCancel(s)).toBe(true)
    run(s, EGG_TIMING.cancelS + 0.05)
    expect(canCancel(s)).toBe(false)
  })

  it('shows the exit button and drops paper resolution only after entry starts', () => {
    const s = createEggPhase()
    enterEgg(s, PAGE_PROFILES.read)
    run(s, EGG_TIMING.lowResS - 0.1)
    expect(paperLowRes(s)).toBe(false)
    expect(showsExit(s)).toBe(false)
    run(s, EGG_TIMING.exitButtonS)
    expect(paperLowRes(s)).toBe(true)
    expect(showsExit(s)).toBe(true)
    leaveEgg(s)
    expect(paperLowRes(s)).toBe(false)
    expect(showsExit(s)).toBe(false)
  })

  it('ignores leave requests outside the egg', () => {
    const s = createEggPhase()
    expect(leaveEgg(s)).toBe(false)
    enterEgg(s, PAGE_PROFILES.read)
    expect(leaveEgg(s)).toBe(true)
    expect(leaveEgg(s)).toBe(false)
  })
})
