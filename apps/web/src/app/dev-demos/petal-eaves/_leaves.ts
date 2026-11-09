import type { Eave, Scene, SceneStep } from './_scene'
import { ease, lerp, pushOutOfSides } from './_scene'

interface Leaf {
  angle: number
  drop: number
  eave: number
  flip: number
  flipRate: number
  gust: number
  hop: number
  localX: number
  settle: number
  size: number
  skid: number
  slide: number
  swing: number
  swingRate: number
  target: number
  tone: number
  vx: number
  vy: number
  x: number
  y: number
}

const MAX_LEAVES = 160
const MAX_PER_EAVE = 16
const FLAT = 0.38
const RADIUS = 0.55

const LOBES: [angle: number, length: number][] = [
  [-Math.PI / 2, 1],
  [-Math.PI / 2 - 0.85, 0.9],
  [-Math.PI / 2 + 0.85, 0.9],
  [-Math.PI / 2 - 1.75, 0.6],
  [-Math.PI / 2 + 1.75, 0.6],
]

const MAPLE = (() => {
  if (typeof Path2D === 'undefined') return null
  const path = new Path2D()
  const steps = 120
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2 - Math.PI
    let lobe = 0
    for (const [a, length] of LOBES) {
      const d = Math.abs(Math.atan2(Math.sin(t - a), Math.cos(t - a)))
      lobe = Math.max(lobe, length * Math.max(0, 1 - d / 0.42) ** 1.3)
    }
    const teeth = lobe > 0.2 ? 1 + 0.07 * Math.sin(t * 30) : 1
    const r = (0.2 + 0.8 * lobe) * teeth * RADIUS * 1.1
    const x = Math.cos(t) * r
    const y = Math.sin(t) * r + 0.06
    if (i === 0) path.moveTo(x, y)
    else path.lineTo(x, y)
  }
  path.closePath()
  path.moveTo(0, 0.1)
  path.lineTo(0.03, 0.62)
  return path
})()

const flipWidth = (flip: number) => 0.25 + 0.75 * Math.abs(Math.cos(flip))

const fallingReach = (l: Leaf) =>
  RADIUS *
  l.size *
  Math.hypot(Math.cos(l.angle), flipWidth(l.flip) * Math.sin(l.angle))

const restingReach = (l: Leaf) => RADIUS * l.size * FLAT

const spawn = (s: SceneStep): Leaf => ({
  x: Math.random() * (s.width + 240) - 120 - s.wind * 3,
  y: s.top - 30,
  vx: s.wind,
  vy: 30,
  angle: (Math.random() - 0.5) * 0.6,
  flip: Math.random() * Math.PI * 2,
  flipRate: 0.8 + Math.random() * 1.6,
  swing: Math.random() * Math.PI * 2,
  swingRate: 1.6 + Math.random() * 0.9,
  size: 12 + Math.random() * 8,
  tone: Math.random(),
  eave: -1,
  localX: 0,
  drop: 0,
  settle: 0,
  target: 0,
  slide: 0,
  skid: 0,
  hop: 0,
  gust: 0,
})

const land = (l: Leaf, index: number, e: Eave, full: boolean) => {
  l.eave = index
  l.localX = l.x - e.left
  l.drop = fallingReach(l)
  l.angle = Math.atan2(Math.sin(l.angle), Math.cos(l.angle))
  l.target = (l.tone - 0.5) * 0.4
  l.slide = 0
  l.hop = 0
  l.gust = 0.5 + Math.random() * 2
  const span = e.right - e.left
  l.skid = full ? (l.localX < span / 2 ? -70 : 70) : 0
}

const stepResting = (l: Leaf, e: Eave, s: SceneStep) => {
  const { dt } = s
  l.settle = Math.min(1, l.settle + dt * 3)
  l.hop = Math.max(0, l.hop - dt / 0.45)
  l.gust -= dt
  const strength = Math.abs(s.wind)
  if (l.gust <= 0 && l.settle >= 1) {
    l.gust = (0.8 + Math.random() * 2.7) * (40 / (strength + 10))
    if (strength > 6) {
      l.slide = Math.sign(s.wind) * strength * (0.9 + Math.random() * 1.1)
      l.hop = 1
    }
  }
  l.slide *= Math.exp(-dt * 2.5)
  l.localX += (l.slide + l.skid) * dt
  if (l.localX >= 0 && l.localX <= e.right - e.left) return
  l.eave = -1
  l.x = e.left + l.localX
  l.y = e.top - restingReach(l)
  l.vx = l.slide + l.skid
  l.vy = 10
  l.skid = 0
  l.swing = 0
}

const stepFalling = (l: Leaf, s: SceneStep, counts: number[]) => {
  const { dt, eaves } = s
  l.settle = Math.max(0, l.settle - dt * 2.5)
  l.swing += l.swingRate * dt
  const side = Math.sin(l.swing)
  const fall = (40 + l.size) * (0.4 + 0.6 * Math.abs(Math.cos(l.swing)))
  l.vx += (s.wind + side * 55 - l.vx) * Math.min(1, dt * 3)
  l.vy += (fall - l.vy) * Math.min(1, dt * 3)
  l.angle += (side * 0.7 - l.angle) * Math.min(1, dt * 4)
  l.flip += l.flipRate * dt
  const prevBottom = l.y + fallingReach(l)
  l.x += l.vx * dt
  l.y += l.vy * dt
  pushOutOfSides(eaves, l, l.size * 0.4)
  const bottom = l.y + fallingReach(l)
  for (const [i, e] of eaves.entries()) {
    if (prevBottom > e.top || bottom < e.top) continue
    if (l.x < e.left || l.x > e.right) continue
    const full = (counts[i] ?? 0) >= MAX_PER_EAVE
    counts[i] = (counts[i] ?? 0) + 1
    land(l, i, e, full)
    return
  }
}

const COLORS = [
  [176, 48, 32],
  [198, 82, 30],
  [204, 124, 38],
  [190, 150, 60],
] as const

const colorOf = (tone: number, dark: boolean, alpha: number) => {
  const t = tone * (COLORS.length - 1)
  const i = Math.min(COLORS.length - 2, Math.floor(t))
  const [a, b] = [COLORS[i]!, COLORS[i + 1]!]
  const lift = dark ? 18 : 0
  const ch = (k: 0 | 1 | 2) => Math.round(lerp(a[k], b[k], t - i) + lift)
  return `rgba(${ch(0)}, ${ch(1)}, ${ch(2)}, ${alpha})`
}

export const createLeafScene = (): Scene => {
  let leaves: Leaf[] = []
  let debt = 0

  const step = (s: SceneStep) => {
    debt += s.density * 0.8 * s.dt
    while (debt >= 1) {
      debt -= 1
      if (leaves.length < MAX_LEAVES) leaves.push(spawn(s))
    }
    const counts: number[] = []
    for (const l of leaves)
      if (l.eave >= 0) counts[l.eave] = (counts[l.eave] ?? 0) + 1
    for (const l of leaves) {
      const e = l.eave >= 0 ? s.eaves[l.eave] : undefined
      if (l.eave >= 0 && !e) l.eave = -1
      if (e) stepResting(l, e, s)
      else stepFalling(l, s, counts)
    }
    leaves = leaves.filter(
      (l) =>
        l.eave >= 0 ||
        (l.y < s.bottom + 80 &&
          l.y > s.top - 400 &&
          l.x > -200 &&
          l.x < s.width + 200),
    )
  }

  const draw = (
    ctx: CanvasRenderingContext2D,
    eaves: Eave[],
    offsetY: number,
    dark: boolean,
  ) => {
    if (!MAPLE) return
    for (const l of leaves) {
      const e = l.eave >= 0 ? eaves[l.eave] : undefined
      const s = ease(l.settle)
      const hop = Math.sin(Math.PI * l.hop)
      const lift = hop * (3 + Math.abs(l.slide) * 0.05)
      const x = e ? e.left + l.localX : l.x
      const y = e ? e.top - lerp(l.drop, restingReach(l), s) - lift : l.y
      ctx.save()
      ctx.translate(x, y - offsetY)
      ctx.scale(1, lerp(1, FLAT, s * (1 - hop * 0.5)))
      ctx.rotate(lerp(l.angle, l.target, s) + hop * 0.5 * Math.sign(l.slide))
      ctx.scale(l.size * lerp(flipWidth(l.flip), 1, s), l.size)
      ctx.fillStyle = colorOf(l.tone, dark, dark ? 0.82 : 0.92)
      ctx.fill(MAPLE)
      ctx.lineWidth = 1 / l.size
      ctx.strokeStyle = colorOf(l.tone * 0.5, dark, 0.5)
      ctx.stroke(MAPLE)
      ctx.restore()
    }
  }

  return { step, draw }
}
