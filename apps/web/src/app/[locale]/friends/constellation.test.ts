import { describe, expect, it } from 'vitest'

import type { Body } from './constellation'
import {
  layoutStars,
  linkDomain,
  mapPadding,
  matchesQuery,
  seededShuffle,
  settleBodies,
  stepBodies,
} from './constellation'

const links = Array.from({ length: 40 }, (_, i) => ({
  id: `link-${i}`,
  name: `Friend ${i}`,
}))

describe('seededShuffle', () => {
  it('returns a deterministic permutation for a seed', () => {
    const a = seededShuffle(links, 3)
    const b = seededShuffle(links, 3)

    expect(a.map((l) => l.id)).toEqual(b.map((l) => l.id))
    expect([...a].sort((x, y) => x.id.localeCompare(y.id))).toEqual(
      [...links].sort((x, y) => x.id.localeCompare(y.id)),
    )
  })

  it('changes the order when the seed changes', () => {
    expect(seededShuffle(links, 3).map((l) => l.id)).not.toEqual(
      seededShuffle(links, 4).map((l) => l.id),
    )
  })
})

describe('layoutStars', () => {
  const size = { width: 960, height: 520 }

  it('places the requested number of stars inside the padded area', () => {
    const { points } = layoutStars(links, { ...size, count: 18, seed: 1 })
    const pad = mapPadding(false)

    expect(points).toHaveLength(18)
    for (const p of points) {
      expect(p.x).toBeGreaterThanOrEqual(pad.x)
      expect(p.x).toBeLessThanOrEqual(size.width - pad.x)
      expect(p.y).toBeGreaterThanOrEqual(pad.top)
      expect(p.y).toBeLessThanOrEqual(size.height - pad.bottom)
    }
  })

  it('caps the count at the number of links', () => {
    const { points } = layoutStars(links.slice(0, 5), {
      ...size,
      count: 18,
      seed: 1,
    })

    expect(points).toHaveLength(5)
  })

  it('is deterministic for a seed and different across seeds', () => {
    const a = layoutStars(links, { ...size, count: 18, seed: 9 })
    const b = layoutStars(links, { ...size, count: 18, seed: 9 })
    const c = layoutStars(links, { ...size, count: 18, seed: 10 })

    expect(a).toEqual(b)
    expect(c.points.map((p) => p.link.id)).not.toEqual(
      a.points.map((p) => p.link.id),
    )
  })

  it('keeps stars apart', () => {
    const { points } = layoutStars(links, { ...size, count: 18, seed: 5 })
    let closest = Infinity
    for (const [i, a] of points.entries()) {
      for (const b of points.slice(i + 1)) {
        closest = Math.min(closest, Math.hypot(a.x - b.x, a.y - b.y))
      }
    }

    expect(closest).toBeGreaterThan(60)
  })

  it('connects every star with a spanning tree plus faint extras', () => {
    const { points, edges } = layoutStars(links, {
      ...size,
      count: 18,
      seed: 2,
    })
    const solid = edges.filter((e) => !e.faint)
    const seen = new Set([0])
    let grew = true
    while (grew) {
      grew = false
      for (const e of solid) {
        if (seen.has(e.from) !== seen.has(e.to)) {
          seen.add(e.from)
          seen.add(e.to)
          grew = true
        }
      }
    }

    expect(solid).toHaveLength(points.length - 1)
    expect(seen.size).toBe(points.length)
    expect(edges.length).toBeLessThanOrEqual(Math.ceil(points.length * 1.3))
  })

  it('handles a single star without edges', () => {
    const { points, edges } = layoutStars(links.slice(0, 1), {
      ...size,
      count: 18,
      seed: 1,
    })

    expect(points).toHaveLength(1)
    expect(edges).toEqual([])
  })
})

describe('stepBodies', () => {
  const bounds = { width: 960, height: 520 }
  const makeBody = (x: number, y: number, tx: number, ty: number): Body => ({
    x,
    y,
    vx: 0,
    vy: 0,
    tx,
    ty,
    alpha: 1,
    scale: 1,
    phase: 'stay',
  })

  it('scatters bodies during the chaos phase', () => {
    const bodies = [makeBody(480, 260, 480, 260)]
    let state = 1
    const rand = () => (state = (state * 16807) % 2147483647) / 2147483647
    for (let t = 0; t <= 600; t += 16)
      stepBodies(bodies, t, 0.016, rand, bounds)

    expect(Math.hypot(bodies[0].x - 480, bodies[0].y - 260)).toBeGreaterThan(5)
  })

  it('settles every staying body on its target and fades leaving ones', () => {
    const bodies = [
      makeBody(100, 100, 700, 400),
      makeBody(800, 80, 200, 300),
      { ...makeBody(500, 200, 500, 200), phase: 'leave' as const },
      {
        ...makeBody(300, 300, 600, 150),
        phase: 'enter' as const,
        alpha: 0,
        scale: 0.4,
      },
    ]
    let state = 7
    const rand = () => (state = (state * 16807) % 2147483647) / 2147483647
    let restless = true
    let t = 0
    while (t < 4000 && (restless || t < 1200)) {
      restless = stepBodies(bodies, t, 0.016, rand, bounds)
      t += 16
    }

    expect(restless).toBe(false)
    for (const b of bodies.filter((b) => b.phase !== 'leave')) {
      expect(Math.hypot(b.x - b.tx, b.y - b.ty)).toBeLessThan(1)
      expect(b.alpha).toBe(1)
      expect(b.scale).toBe(1)
    }
    expect(bodies[2].alpha).toBe(0)
  })
})

describe('linkDomain', () => {
  it('strips protocol, www and path', () => {
    expect(linkDomain('https://www.zywvvd.com/')).toBe('zywvvd.com')
    expect(linkDomain('http://blog.example.dev/posts/1')).toBe(
      'blog.example.dev',
    )
    expect(linkDomain('https://rainey.space')).toBe('rainey.space')
  })
})

describe('matchesQuery', () => {
  const link = {
    name: "Rainey's Blog",
    url: 'https://rainey.space',
    description: '对很多事情好奇',
  }

  it('matches everything for a blank query', () => {
    expect(matchesQuery(link, '  ')).toBe(true)
  })

  it('matches name, url and description case-insensitively', () => {
    expect(matchesQuery(link, 'RAINEY')).toBe(true)
    expect(matchesQuery(link, 'space')).toBe(true)
    expect(matchesQuery(link, '好奇')).toBe(true)
    expect(matchesQuery(link, 'nothing')).toBe(false)
  })

  it('tolerates a missing description', () => {
    expect(matchesQuery({ ...link, description: undefined }, 'blog')).toBe(true)
  })
})

describe('settleBodies', () => {
  const body = (phase: Body['phase']): Body => ({
    x: 10,
    y: 20,
    vx: 3,
    vy: 4,
    tx: 300,
    ty: 200,
    alpha: phase === 'leave' ? 0 : 0.8,
    scale: phase === 'leave' ? 0.4 : 0.9,
    phase,
  })

  it('snaps staying and entering bodies onto their targets', () => {
    const bodies = [body('stay'), body('enter')]
    settleBodies(bodies)

    for (const b of bodies) {
      expect(b).toMatchObject({
        x: 300,
        y: 200,
        vx: 0,
        vy: 0,
        alpha: 1,
        scale: 1,
      })
    }
  })

  it('keeps leaving bodies invisible until they unmount', () => {
    const leaving = body('leave')
    settleBodies([leaving])

    expect(leaving.alpha).toBe(0)
  })
})
