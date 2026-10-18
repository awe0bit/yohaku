import { describe, expect, it } from 'vitest'

import type { Lab } from '~/lib/paper/oklab'

import { createDye, dyeProgress, stepDye } from './dye'
import {
  easeProfile,
  isMoving,
  PAGE_PROFILES,
  profileSettled,
} from './page-state'

const pair = (L: number): [Lab, Lab] => [
  [L, 0.05, 0],
  [L, 0.05, 0],
]

describe('easeProfile', () => {
  it('settles toward the target within about 0.6 s without jumping', () => {
    let p = PAGE_PROFILES.browse
    p = easeProfile(p, PAGE_PROFILES.read, 0.05)
    expect(p.vis.elem).toBeGreaterThan(0.7)
    for (let i = 0; i < 11; i++) p = easeProfile(p, PAGE_PROFILES.read, 0.05)
    expect(p.vis.elem).toBeLessThan(0.06)
  })

  it('snaps exactly onto the target once close enough', () => {
    let p = PAGE_PROFILES.browse
    for (let i = 0; i < 100; i++)
      p = easeProfile(p, PAGE_PROFILES.immersive, 0.05)
    expect(p).toEqual(PAGE_PROFILES.immersive)
  })
})

describe('frame gating', () => {
  it('treats only browse as moving', () => {
    expect(isMoving(PAGE_PROFILES.browse)).toBe(true)
    expect(isMoving(PAGE_PROFILES.read)).toBe(false)
    expect(isMoving(PAGE_PROFILES.immersive)).toBe(false)
  })

  it('reports settled only once easing has snapped onto the target', () => {
    let p = easeProfile(PAGE_PROFILES.browse, PAGE_PROFILES.read, 0.05)
    expect(profileSettled(p, PAGE_PROFILES.read)).toBe(false)
    for (let i = 0; i < 100; i++) p = easeProfile(p, PAGE_PROFILES.read, 0.05)
    expect(profileSettled(p, PAGE_PROFILES.read)).toBe(true)
  })
})

describe('stepDye', () => {
  it('waits 350 ms before switching to a new figure', () => {
    const dye = createDye()
    stepDye(
      dye,
      { key: 'a', labs: pair(0.6), weight: 1, velocity: 0 },
      0,
      0.016,
    )
    for (let t = 0.016; t < 2; t += 0.016)
      stepDye(
        dye,
        { key: 'a', labs: pair(0.6), weight: 1, velocity: 0 },
        t,
        0.016,
      )
    stepDye(
      dye,
      { key: 'b', labs: pair(0.4), weight: 1, velocity: 0 },
      2.1,
      0.016,
    )
    expect(dye.key).toBe('a')
    stepDye(
      dye,
      { key: 'b', labs: pair(0.4), weight: 1, velocity: 0 },
      2.5,
      0.016,
    )
    expect(dye.key).toBe('b')
  })

  it('restarts a re-dye from the currently blended color', () => {
    const dye = createDye()
    for (let t = 0; t < 1; t += 0.016)
      stepDye(
        dye,
        { key: 'a', labs: pair(0.6), weight: 1, velocity: 0 },
        t,
        0.016,
      )
    stepDye(
      dye,
      { key: 'b', labs: pair(0.4), weight: 1, velocity: 0 },
      1,
      0.016,
    )
    stepDye(
      dye,
      { key: 'b', labs: pair(0.4), weight: 1, velocity: 0 },
      1.4,
      0.016,
    )
    stepDye(
      dye,
      { key: 'c', labs: pair(0.2), weight: 1, velocity: 0 },
      2.9,
      0.016,
    )
    stepDye(
      dye,
      { key: 'c', labs: pair(0.2), weight: 1, velocity: 0 },
      3.3,
      0.016,
    )
    expect(dye.from[0][0]).toBeGreaterThan(0.4)
    expect(dye.from[0][0]).toBeLessThan(0.6)
    expect(dyeProgress(dye, 3.3)).toBe(0)
  })

  it('fades gradually under fast scrolling instead of dropping out', () => {
    const dye = createDye()
    for (let t = 0; t < 2; t += 0.016)
      stepDye(
        dye,
        { key: 'a', labs: pair(0.6), weight: 1, velocity: 0 },
        t,
        0.016,
      )
    for (let t = 2; t < 2.1; t += 0.016)
      stepDye(
        dye,
        { key: 'a', labs: pair(0.6), weight: 1, velocity: 6000 },
        t,
        0.016,
      )
    expect(dye.gate).toBeGreaterThan(0.85)
    for (let t = 2.1; t < 6; t += 0.016)
      stepDye(
        dye,
        { key: 'a', labs: pair(0.6), weight: 1, velocity: 6000 },
        t,
        0.016,
      )
    expect(dye.gate).toBeCloseTo(0.45, 2)
  })
})
