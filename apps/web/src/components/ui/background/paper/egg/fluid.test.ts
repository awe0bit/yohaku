import { describe, expect, it } from 'vitest'

import {
  addSplat,
  createFluid,
  decodeVelocity,
  dropVelocity,
  encodeVelocity,
  flowBytes,
  sampleField,
  stepDisplacement,
  stepFluid,
  velocityBytes,
} from './fluid'

const maxAbs = (a: Float32Array) =>
  a.reduce((m, v) => Math.max(m, Math.abs(v)), 0)

describe('velocity codec', () => {
  it('decodes zero velocity to exactly zero so still ink never drifts', () => {
    expect(decodeVelocity(encodeVelocity(0))).toBe(0)
  })

  it('keeps slow flow precise and fast flow in range', () => {
    expect(Math.abs(decodeVelocity(encodeVelocity(30)) - 30)).toBeLessThan(3)
    expect(Math.abs(decodeVelocity(encodeVelocity(-300)) + 300)).toBeLessThan(
      15,
    )
    expect(Math.abs(decodeVelocity(encodeVelocity(1400)) - 1400)).toBeLessThan(
      40,
    )
    expect(encodeVelocity(99_999)).toBe(255)
  })

  it('writes rows bottom-up with y negated for GL', () => {
    const f = createFluid(960, 640)
    f.V[f.gx * 1 + 5] = 600
    const bytes = velocityBytes(f)
    const row = f.gy - 1 - 1
    expect(decodeVelocity(bytes[(row * f.gx + 5) * 4 + 1])).toBeLessThan(-500)
  })
})

describe('fluid', () => {
  it('sizes the grid from the aspect ratio', () => {
    const f = createFluid(960, 640)
    expect(f.gx).toBe(96)
    expect(f.gy).toBe(64)
  })

  it('injects a splat and keeps the border still', () => {
    const f = createFluid(960, 640)
    addSplat(f, { x: 480, y: 320, vx: 800, vy: 0, r: 42 })
    stepFluid(f, 1 / 30, 0, 0)
    expect(sampleField(f, f.U, 480, 320)).toBeGreaterThan(50)
    for (let i = 0; i < f.gx; i++) {
      expect(f.U[i]).toBe(0)
      expect(f.V[i + (f.gy - 1) * f.gx]).toBe(0)
    }
  })

  it('damps to rest without input', () => {
    const f = createFluid(960, 640)
    addSplat(f, { x: 480, y: 320, vx: 800, vy: 300, r: 42 })
    stepFluid(f, 1 / 30, 0, 0)
    const start = maxAbs(f.U)
    for (let i = 0; i < 300; i++) stepFluid(f, 1 / 30, 0, 0)
    expect(maxAbs(f.U)).toBeLessThan(start * 0.05)
  })

  it('pushes outward from a drop point source', () => {
    const [vx, vy] = dropVelocity(
      [{ x: 100, y: 100, t0: 0, q: 52_000 }],
      140,
      100,
      50,
    )
    expect(vx).toBeGreaterThan(0)
    expect(Math.abs(vy)).toBeLessThan(1e-6)
    expect(
      dropVelocity([{ x: 100, y: 100, t0: 0, q: 52_000 }], 140, 100, 2000),
    ).toEqual([0, 0])
  })

  it('encodes displacement around 128 and settles back to zero', () => {
    const f = createFluid(960, 640)
    let bytes = flowBytes(f)
    expect(bytes[0]).toBe(128)
    expect(bytes[3]).toBe(255)
    f.U.fill(400)
    stepDisplacement(f, 0.5, 0, false, [])
    bytes = flowBytes(f)
    expect(bytes[(10 * f.gx + 10) * 4]).toBeGreaterThan(128)
    f.U.fill(0)
    for (let i = 0; i < 60; i++) stepDisplacement(f, 1 / 30, 0, true, [])
    expect(flowBytes(f)[(10 * f.gx + 10) * 4]).toBe(128)
  })
})
