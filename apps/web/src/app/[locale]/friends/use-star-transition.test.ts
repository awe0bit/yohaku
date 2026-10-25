import type { LinkModel } from '@mx-space/api-client'
import { LinkState, LinkType } from '@mx-space/api-client'
import { describe, expect, it } from 'vitest'

import type { Body, StepTiming } from './constellation'
import {
  GENESIS_TIMING,
  layoutStars,
  seededRandom,
  stepBodies,
} from './constellation'
import { buildGenesisTransition } from './use-star-transition'

const links: LinkModel[] = Array.from({ length: 24 }, (_, i) => ({
  avatar: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  description: null,
  email: null,
  hide: false,
  id: `link-${i}`,
  name: `Friend ${i}`,
  state: LinkState.Pass,
  type: LinkType.Friend,
  url: `https://friend-${i}.example`,
}))

const size = { width: 960, height: 520 }
const layout = layoutStars(links, { ...size, count: 18, seed: 7 })

describe('buildGenesisTransition', () => {
  it('spawns every star as an ignition in a cloud at the centre', () => {
    const genesis = buildGenesisTransition(layout, size, 7)

    expect(genesis.stars).toHaveLength(layout.points.length)
    expect(genesis.stars.every((s) => s.phase === 'enter')).toBe(true)
    expect(genesis.next).toBe(layout)

    const reach = Math.min(size.width, size.height) * 0.16
    for (const point of layout.points) {
      const spawn = genesis.spawn![point.link.id]
      expect(spawn).toBeDefined()
      expect(Math.abs(spawn.x - size.width / 2)).toBeLessThanOrEqual(reach / 2)
      expect(Math.abs(spawn.y - size.height / 2)).toBeLessThanOrEqual(reach / 2)
    }
  })

  it('is deterministic for a seed and differs across seeds', () => {
    const a = buildGenesisTransition(layout, size, 7).spawn!
    const b = buildGenesisTransition(layout, size, 7).spawn!
    const c = buildGenesisTransition(layout, size, 8).spawn!

    expect(a).toEqual(b)
    expect(a).not.toEqual(c)
  })

  it('carries the fast pacing', () => {
    expect(buildGenesisTransition(layout, size, 7).timing).toBe(GENESIS_TIMING)
  })
})

describe('stepBodies pacing', () => {
  const cx = size.width / 2
  const cy = size.height / 2
  const cloud = (): Body[] =>
    layout.points.map((p) => ({
      alpha: 0,
      phase: 'enter' as const,
      scale: 0.4,
      tx: p.x,
      ty: p.y,
      vx: 0,
      vy: 0,
      x: cx,
      y: cy,
    }))
  const spreadAfter = (ms: number, timing?: StepTiming) => {
    const bodies = cloud()
    const rand = seededRandom(11)
    for (let t = 16; t <= ms; t += 16) {
      stepBodies(bodies, t, 0.016, rand, size, timing)
    }
    return (
      bodies.reduce((sum, b) => sum + Math.hypot(b.x - cx, b.y - cy), 0) /
      bodies.length
    )
  }

  it('scatters the cold-start cloud well before the reshuffle pacing does', () => {
    const genesis = spreadAfter(320, GENESIS_TIMING)
    const reshuffle = spreadAfter(320)

    expect(genesis).toBeGreaterThan(120)
    expect(genesis).toBeGreaterThan(reshuffle * 2)
  })
})
