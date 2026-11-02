import { describe, expect, it, vi } from 'vitest'

import { createFluid } from './fluid'
import { createSpriteWorld, makeSprite, stepSprites } from './sprites'

vi.mock('./sprite-art', () => ({
  makeSpriteArt: () => ({}),
}))

describe('osmanthus scatter', () => {
  it('splits a stirred cluster at most three times in total', () => {
    const world = createSpriteWorld()
    Object.assign(world, { w: 960, h: 640 })
    world.sprites.push(
      makeSprite(world, {
        type: 'osmanthus',
        color: '#e3a23c',
        size: 10,
        seed: 1,
        x: 480,
        y: 320,
        rot: 0,
        flip: false,
        alpha: 1,
      }),
    )
    const fluid = createFluid(960, 640)
    fluid.U.fill(900)
    let now = 1000
    for (let i = 0; i < 90; i++) {
      now += 400
      fluid.U.fill(900)
      stepSprites(world, fluid, [], 1 / 30, now, 0)
      for (const s of world.sprites) {
        s.x = 480
        s.y = 320
      }
    }
    const clusters = world.sprites.filter((s) => s.type === 'osmanthus')
    expect(clusters.length).toBeLessThanOrEqual(4)
  })
})
