import { describe, expect, it } from 'vitest'

import { PAGE_PROFILES } from '../page-state'
import {
  createEggPhase,
  EGG_TIMING,
  eggCurves,
  enterEgg,
  leaveEgg,
  overrideProfile,
  stepEggPhase,
  wantsFull,
} from './phase'

const run = (state: ReturnType<typeof createEggPhase>, seconds: number) => {
  let result = 'running'
  for (let t = 0; t < seconds; t += 1 / 30) {
    result = stepEggPhase(state, 1 / 30)
    if (result === 'finished') break
  }
  return result
}

describe('egg phase', () => {
  it('starts sinking and restoring together on enter', () => {
    const s = createEggPhase()
    enterEgg(s, PAGE_PROFILES.read)
    expect(s.stage).toBe('sinking')
    expect(wantsFull(s)).toBe(true)
    stepEggPhase(s, 0.5)
    expect(s.sink).toBeGreaterThan(0)
  })

  it('restores every layer to browse by 3.2s from the read page', () => {
    const s = createEggPhase()
    enterEgg(s, PAGE_PROFILES.read)
    run(s, EGG_TIMING.restoreS)
    const p = overrideProfile(structuredClone(PAGE_PROFILES.read), s)
    expect(p.vis.paper).toBeCloseTo(1)
    expect(p.vis.fiber).toBeCloseTo(1)
    expect(p.move.fiber).toBeCloseTo(1)
    expect(p.glint).toBeCloseTo(1)
  })

  it('staggers the restore: paper moves before the elements', () => {
    const s = createEggPhase()
    enterEgg(s, PAGE_PROFILES.immersive)
    run(s, 1)
    const p = overrideProfile(structuredClone(PAGE_PROFILES.immersive), s)
    expect(p.vis.paper).toBeGreaterThan(PAGE_PROFILES.immersive.vis.paper)
    expect(p.move.fiber).toBe(0)
  })

  it('becomes immersed after the sink duration', () => {
    const s = createEggPhase()
    enterEgg(s, PAGE_PROFILES.browse)
    run(s, EGG_TIMING.sinkS + 0.1)
    expect(s.stage).toBe('immersed')
    const p = overrideProfile(structuredClone(PAGE_PROFILES.browse), s)
    expect(p.vis.sheet).toBe(0)
    expect(p.vis.elem).toBe(0)
  })

  it('reverses when left before 60% and finishes back at reading', () => {
    const s = createEggPhase()
    enterEgg(s, PAGE_PROFILES.browse)
    run(s, EGG_TIMING.sinkS * 0.3)
    expect(leaveEgg(s)).toBe('cancel')
    expect(wantsFull(s)).toBe(false)
    expect(run(s, 1)).toBe('finished')
    expect(s.stage).toBe('reading')
  })

  it('exits through the reprint after 60% and finishes at 2.4s', () => {
    const s = createEggPhase()
    enterEgg(s, PAGE_PROFILES.browse)
    run(s, EGG_TIMING.sinkS * 0.7)
    expect(leaveEgg(s)).toBe('exit')
    expect(s.stage).toBe('exiting')
    expect(run(s, EGG_TIMING.exitS - 0.1)).toBe('running')
    expect(run(s, 0.2)).toBe('finished')
  })

  it('fades real images out by 35% sink and back during the reprint', () => {
    const s = createEggPhase()
    enterEgg(s, PAGE_PROFILES.browse)
    expect(eggCurves(s).images).toBe(1)
    s.sink = 0.35
    expect(eggCurves(s).images).toBe(0)
    s.stage = 'immersed'
    expect(eggCurves(s).images).toBe(0)
    leaveEgg(s)
    s.exitT = EGG_TIMING.exitS * 0.3
    expect(eggCurves(s).images).toBe(0)
    s.exitT = EGG_TIMING.exitS
    expect(eggCurves(s).images).toBe(1)
  })

  it('ignores leave while reading', () => {
    expect(leaveEgg(createEggPhase())).toBe('none')
  })

  it('matches the demo curves', () => {
    const s = createEggPhase()
    enterEgg(s, PAGE_PROFILES.browse)
    s.sink = 0.05
    let c = eggCurves(s)
    expect(c.crisp).toBeGreaterThan(0)
    expect(c.decay).toBe(0)
    expect(c.sharp).toBe(true)
    expect(c.showExit).toBe(false)
    s.sink = 0.9
    c = eggCurves(s)
    expect(c.crisp).toBe(0)
    expect(c.decay).toBeGreaterThan(0)
    expect(c.decay).toBeLessThanOrEqual(0.4 * 0.5)
    expect(c.sharp).toBe(false)
    expect(c.showExit).toBe(true)
    expect(c.falling).toBe(true)
    s.stage = 'immersed'
    s.sink = 1
    c = eggCurves(s)
    expect(c.ambient).toBe(10)
    expect(c.diffusion).toBe(0.014)
    expect(c.decay).toBeCloseTo(0.4 * 0.05)
    expect(c.veil).toBe(1)
    leaveEgg(s)
    s.exitT = EGG_TIMING.exitS
    c = eggCurves(s)
    expect(c.settle).toBe(1)
    expect(c.reprint).toBeLessThan(0.001)
    expect(c.veil).toBe(0)
  })
})
