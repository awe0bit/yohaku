import { CRYSTALS, lumpShape, traceLump } from './_crystal'
import type { Eave, Scene, SceneStep } from './_scene'
import { insideBlock } from './_scene'

interface Flake {
  kind: number
  phase: number
  r: number
  rot: number
  spin: number
  vx: number
  vy: number
  x: number
  y: number
}

interface Clump {
  r: number
  shape: number[]
  spin: number
  vx: number
  vy: number
  x: number
  y: number
}

interface Drift {
  depth: Float32Array
  width: number
}

const COL = 3
const SLOPE = 1.4
const MAX_DEPTH = 22
const BREAK_AT = 12
const MAX_FLAKES = 500

const driftOf = (drifts: Map<number, Drift>, i: number, e: Eave) => {
  const width = e.right - e.left
  const current = drifts.get(i)
  if (current && Math.abs(current.width - width) < 1) return current
  const depth = new Float32Array(Math.max(2, Math.ceil(width / COL)))
  if (current)
    for (let c = 0; c < depth.length; c++)
      depth[c] =
        current.depth[Math.floor((c / depth.length) * current.depth.length)] ??
        0
  const next = { width, depth }
  drifts.set(i, next)
  return next
}

const relax = (depth: Float32Array) => {
  for (let pass = 0; pass < 2; pass++)
    for (let c = 0; c < depth.length - 1; c++) {
      const diff = depth[c]! - depth[c + 1]!
      if (Math.abs(diff) <= SLOPE) continue
      const move = (Math.abs(diff) - SLOPE) / 2
      const sign = Math.sign(diff)
      depth[c] = depth[c]! - move * sign
      depth[c + 1] = depth[c + 1]! + move * sign
    }
}

const deposit = (depth: Float32Array, col: number, amount: number) => {
  for (let k = -2; k <= 2; k++) {
    const c = col + k
    if (c < 0 || c >= depth.length) continue
    const w = [0.15, 0.6, 1, 0.6, 0.15][k + 2]!
    depth[c] = Math.min(MAX_DEPTH, depth[c]! + amount * w * 0.4)
  }
  relax(depth)
}

export const createSnowScene = (): Scene => {
  let flakes: Flake[] = []
  let clumps: Clump[] = []
  let debt = 0
  const drifts = new Map<number, Drift>()

  const surface = (eaves: Eave[], x: number, prevY: number, y: number) => {
    for (const [i, e] of eaves.entries()) {
      if (x < e.left || x > e.right) continue
      const drift = driftOf(drifts, i, e)
      const col = Math.min(
        drift.depth.length - 1,
        Math.floor((x - e.left) / COL),
      )
      const top = e.top - drift.depth[col]!
      if (prevY <= top && y >= top) return { drift, col }
    }
    return null
  }

  const shed = (e: Eave, drift: Drift, dt: number) => {
    const { depth } = drift
    for (const side of [0, 1]) {
      const edge = side === 0 ? 0 : depth.length - 1
      if (depth[edge]! < BREAK_AT || Math.random() > dt * 0.5) continue
      const span = 4 + Math.floor(Math.random() * 6)
      let mass = 0
      for (let k = 0; k < span && k < depth.length; k++) {
        const c = side === 0 ? k : depth.length - 1 - k
        const take = depth[c]! * 0.75 * (1 - k / span)
        depth[c] = depth[c]! - take
        mass += take
      }
      relax(depth)
      const x = side === 0 ? e.left : e.right
      const pieces = 3 + Math.floor(mass / 12)
      for (let p = 0; p < pieces; p++)
        clumps.push({
          x: x + (side === 0 ? -1 : 1) * Math.random() * 4,
          y: e.top - Math.random() * 6,
          vx: (side === 0 ? -1 : 1) * (10 + Math.random() * 40),
          vy: -Math.random() * 30,
          r: 1.6 + Math.random() * 2.6,
          shape: lumpShape(),
          spin: Math.random() * Math.PI * 2,
        })
    }
  }

  const step = (s: SceneStep) => {
    const { dt, eaves } = s
    debt += s.density * 14 * dt
    while (debt >= 1) {
      debt -= 1
      if (flakes.length >= MAX_FLAKES) continue
      const r = 1.8 + Math.random() ** 2 * 4.2
      flakes.push({
        x: Math.random() * (s.width + 200) - 100 - s.wind * 3,
        y: s.top - 10 - Math.random() * 40,
        vx: s.wind,
        vy: 30 + r * 5 + Math.random() * 14,
        r,
        rot: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 1.2,
        kind: r < 2.6 ? 0 : 1 + Math.floor(Math.random() * 2),
        phase: Math.random() * 10,
      })
    }

    flakes = flakes.filter((f) => {
      f.phase += dt
      f.rot += f.spin * dt
      f.vx += (s.wind + Math.sin(f.phase * 1.1) * 14 - f.vx) * Math.min(1, dt)
      const prevY = f.y
      f.x += f.vx * dt
      f.y += f.vy * dt
      const hit = surface(eaves, f.x, prevY, f.y)
      if (hit) {
        deposit(hit.drift.depth, hit.col, f.r * 0.55)
        return false
      }
      return !insideBlock(eaves, f.x, f.y) && f.y < s.bottom + 40
    })

    clumps = clumps.filter((c) => {
      c.vy += 900 * dt
      c.spin += dt * 3
      const prevY = c.y
      c.x += c.vx * dt
      c.y += c.vy * dt
      const hit = surface(eaves, c.x, prevY, c.y)
      if (hit) {
        deposit(hit.drift.depth, hit.col, c.r * 2)
        return false
      }
      return !insideBlock(eaves, c.x, c.y) && c.y < s.bottom + 60
    })

    for (const [i, e] of eaves.entries()) shed(e, driftOf(drifts, i, e), dt)
  }

  const drawDrift = (
    ctx: CanvasRenderingContext2D,
    e: Eave,
    depth: Float32Array,
    offsetY: number,
  ) => {
    const top = e.top - offsetY
    const first = depth[0]!
    const last = depth.at(-1)!
    if (Math.max(...depth) < 0.4) return
    const left = e.left - Math.min(5, first * 0.4)
    const right = e.right + Math.min(5, last * 0.4)
    ctx.beginPath()
    ctx.moveTo(e.left, top)
    ctx.quadraticCurveTo(left, top + first * 0.2, left + 1, top - first * 0.7)
    for (let c = 0; c < depth.length; c++) {
      const x = e.left + c * COL + COL / 2
      ctx.lineTo(Math.min(x, e.right), top - depth[c]!)
    }
    ctx.quadraticCurveTo(right, top - last * 0.7, right - 1, top + last * 0.2)
    ctx.lineTo(e.right, top)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }

  const draw = (
    ctx: CanvasRenderingContext2D,
    eaves: Eave[],
    offsetY: number,
    dark: boolean,
  ) => {
    ctx.fillStyle = dark ? 'rgba(234, 238, 244, 0.92)' : '#fbfaf6'
    ctx.strokeStyle = dark
      ? 'rgba(255, 255, 255, 0.35)'
      : 'rgba(110, 118, 130, 0.5)'
    ctx.lineWidth = 0.75
    ctx.lineJoin = 'round'
    for (const [i, e] of eaves.entries()) {
      const drift = drifts.get(i)
      if (drift) drawDrift(ctx, e, drift.depth, offsetY)
    }

    ctx.beginPath()
    for (const c of clumps)
      traceLump(ctx, c.x, c.y - offsetY, c.r, c.spin, c.shape)
    ctx.fill()
    ctx.stroke()

    ctx.strokeStyle = dark
      ? 'rgba(236, 240, 246, 0.8)'
      : 'rgba(120, 132, 150, 0.75)'
    ctx.lineCap = 'round'
    for (const f of flakes) {
      const crystal = CRYSTALS[f.kind]
      if (!crystal) continue
      ctx.save()
      ctx.translate(f.x, f.y - offsetY)
      ctx.rotate(f.rot)
      ctx.scale(f.r, f.r)
      ctx.lineWidth = (f.kind === 0 ? 1.1 : 0.85) / f.r
      ctx.stroke(crystal)
      ctx.restore()
    }
  }

  return { step, draw }
}
