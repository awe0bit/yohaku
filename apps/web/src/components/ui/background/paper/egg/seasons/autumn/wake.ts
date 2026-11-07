import { lerp } from '~/lib/paper/season'

import type { Floater } from './floaters'
import type { Water } from './geometry'
import { cl, rnd } from './math'
import type { Pond } from './pond'
import { impulse, later } from './pond'

export interface PointerSample {
  t: number
  x: number
  y: number
}

const inWater = (pond: Pond, h: number, y: number) =>
  pond.yW < h && y > pond.yW + 3

export const stone = (
  pond: Pond,
  water: Water,
  fl: Floater[],
  w: number,
  h: number,
  x: number,
  y: number,
) => {
  if (!inWater(pond, h, y)) return
  const { Nx, Ny } = water
  const sx = x / w
  const sy = water.sOf(y - (pond.yW - water.yL))
  impulse(pond, sx, sy, 2.2, -2)
  later(pond, 0.09, () => impulse(pond, sx, sy, 1.3, 0.9))
  for (let k = 0; k < 3; k++) {
    const a = rnd(0, Math.PI * 2)
    const d = rnd(5, 9)
    later(pond, rnd(0.35, 0.7), () =>
      impulse(
        pond,
        sx + (Math.cos(a) * d) / Nx,
        cl(sy + (Math.sin(a) * d) / Ny, 0.02, 1),
        1,
        -0.4,
      ),
    )
  }
  for (const L of fl) {
    if (L.state !== 'float') continue
    const dx = L.lx - sx * Nx
    const dz = L.lz - sy * Ny
    const d = Math.hypot(dx, dz) + 0.01
    if (d >= 20) continue
    const k = (1 - d / 20) * 6
    L.vx += (dx / d) * k
    L.vz += (dz / d) * k
    L.spin += rnd(-1, 1) * k * 0.12
  }
}

export const drag = (
  pond: Pond,
  water: Water,
  fl: Floater[],
  w: number,
  h: number,
  last: PointerSample,
  p: PointerSample,
) => {
  const dtp = Math.max(4, p.t - last.t) / 1000
  const len = Math.hypot(p.x - last.x, p.y - last.y)
  if (len < 0.5 || !inWater(pond, h, p.y) || !inWater(pond, h, last.y)) return
  const { Nx, Ny } = water
  const a = -Math.min(0.6, len / dtp / 1600)
  const n = Math.min(3, Math.ceil(len / 12))
  const off = pond.yW - water.yL
  for (let k = 1; k <= n; k++) {
    const t = k / n
    impulse(
      pond,
      lerp(last.x, p.x, t) / w,
      water.sOf(lerp(last.y, p.y, t) - off),
      1.3,
      (a / Math.sqrt(n)) * 1.3,
    )
  }
  const s0 = water.sOf(last.y - off)
  const s1 = water.sOf(p.y - off)
  const vx = (((p.x - last.x) / w) * Nx) / dtp
  const vz = ((s1 - s0) * Ny) / dtp
  for (const L of fl) {
    if (L.state !== 'float') continue
    const d = Math.hypot(L.lx - (p.x / w) * Nx, L.lz - s1 * Ny)
    if (d >= 10) continue
    const k = (1 - d / 10) * 0.05
    L.vx += vx * k
    L.vz += vz * k
    L.spin += (vx > 0 ? 1 : -1) * k * 0.6
  }
}
