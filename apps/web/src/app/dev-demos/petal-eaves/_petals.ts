import type { Eave, Scene, SceneStep } from './_scene'
import { ease, lerp, pushOutOfSides } from './_scene'

interface Petal {
  angle: number
  drop: number
  eave: number
  flip: number
  flipRate: number
  localX: number
  phase: number
  rest: number
  settle: number
  size: number
  slide: number
  spin: number
  target: number
  tone: number
  vx: number
  vy: number
  x: number
  y: number
}

interface PetalField {
  debt: number
  petals: Petal[]
}

const MAX_PER_EAVE = 28
const MAX_PETALS = 260

const PETAL = (() => {
  if (typeof Path2D === 'undefined') return null
  const p = new Path2D()
  p.moveTo(0, 0.55)
  p.bezierCurveTo(-0.56, 0.22, -0.5, -0.42, -0.13, -0.55)
  p.lineTo(0, -0.4)
  p.lineTo(0.13, -0.55)
  p.bezierCurveTo(0.5, -0.42, 0.56, 0.22, 0, 0.55)
  p.closePath()
  return p
})()

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))

const FLAT = 0.42

const flipWidth = (flip: number) => 0.3 + 0.7 * Math.abs(Math.cos(flip))

const reach = (size: number, angle: number, width: number) =>
  Math.hypot(
    0.55 * size * Math.cos(angle),
    0.52 * size * width * Math.sin(angle),
  )

const fallingReach = (p: Petal) => reach(p.size, p.angle, flipWidth(p.flip))

const restingReach = (p: Petal) => reach(p.size, p.target, 1) * FLAT

const spawn = (step: SceneStep): Petal => {
  const size = 9 + Math.random() * 7
  return {
    x: Math.random() * (step.width + 240) - 120 - step.wind * 3,
    y: step.top - 24,
    vx: step.wind,
    vy: 30,
    angle: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 2.4,
    flip: Math.random() * Math.PI * 2,
    flipRate: 1.5 + Math.random() * 2.5,
    phase: Math.random() * 10,
    size,
    tone: Math.random(),
    drop: 0,
    eave: -1,
    localX: 0,
    rest: 0,
    settle: 0,
    slide: 0,
    target: 0,
  }
}

const land = (p: Petal, index: number, e: Eave) => {
  p.eave = index
  p.localX = p.x - e.left
  p.drop = fallingReach(p)
  p.y = e.top - p.drop
  p.vx = 0
  p.slide = 0
  p.rest = 6 + Math.random() * 12
  p.angle = wrap(p.angle)
  const tilt = (p.tone - 0.5) * 0.35
  p.target = (p.angle >= 0 ? Math.PI / 2 : -Math.PI / 2) + tilt
}

const stepResting = (p: Petal, e: Eave, step: SceneStep) => {
  p.settle = Math.min(1, p.settle + step.dt * 3.5)
  p.rest -= step.dt
  if (p.rest > 0) return
  const span = e.right - e.left
  const away = p.localX < span / 2 ? -1 : 1
  p.slide += (away * 26 + step.wind * 0.4) * step.dt
  p.localX += p.slide * step.dt
  if (p.localX >= 0 && p.localX <= span) return
  p.eave = -1
  p.x = e.left + p.localX
  p.y = e.top - restingReach(p)
  p.vx = p.slide
  p.vy = 12
}

const stepFalling = (p: Petal, step: SceneStep, counts: number[]) => {
  const { dt, eaves } = step
  p.settle = Math.max(0, p.settle - dt * 2.5)
  p.phase += dt
  const sway = Math.sin(p.phase * 1.3 + p.tone * 6) * 20
  p.vx += (step.wind + sway - p.vx) * Math.min(1, dt * 1.6)
  const terminal = 30 + p.size * 1.4 + Math.sin(p.phase * 2.3) * 10
  p.vy += (terminal - p.vy) * Math.min(1, dt * 2)
  const prevBottom = p.y + fallingReach(p)
  p.x += p.vx * dt
  p.y += p.vy * dt
  p.angle += p.spin * dt
  p.flip += p.flipRate * dt
  pushOutOfSides(eaves, p, p.size * 0.4)
  const bottom = p.y + fallingReach(p)
  for (const [i, e] of eaves.entries()) {
    if (prevBottom > e.top || bottom < e.top) continue
    if (p.x < e.left || p.x > e.right) continue
    if ((counts[i] ?? 0) >= MAX_PER_EAVE) continue
    counts[i] = (counts[i] ?? 0) + 1
    land(p, i, e)
    return
  }
}

const stepField = (field: PetalField, step: SceneStep) => {
  field.debt += step.density * step.dt
  while (field.debt >= 1) {
    field.debt -= 1
    if (field.petals.length < MAX_PETALS) field.petals.push(spawn(step))
  }
  const counts: number[] = []
  for (const p of field.petals)
    if (p.eave >= 0) counts[p.eave] = (counts[p.eave] ?? 0) + 1
  for (const p of field.petals) {
    const e = p.eave >= 0 ? step.eaves[p.eave] : undefined
    if (p.eave >= 0 && !e) p.eave = -1
    if (e) stepResting(p, e, step)
    else stepFalling(p, step, counts)
  }
  field.petals = field.petals.filter(
    (p) =>
      p.eave >= 0 ||
      (p.y < step.bottom + 80 &&
        p.y > step.top - 400 &&
        p.x > -200 &&
        p.x < step.width + 200),
  )
}

const drawPetals = (
  ctx: CanvasRenderingContext2D,
  field: PetalField,
  eaves: Eave[],
  offsetY: number,
  dark: boolean,
) => {
  if (!PETAL) return
  for (const p of field.petals) {
    const e = p.eave >= 0 ? eaves[p.eave] : undefined
    const x = e ? e.left + p.localX : p.x
    const s = ease(p.settle)
    const y = e ? e.top - lerp(p.drop, restingReach(p), s) : p.y
    const flatten = lerp(1, FLAT, s)
    const width = lerp(flipWidth(p.flip), 1, s)
    ctx.save()
    ctx.translate(x, y - offsetY)
    ctx.scale(1, flatten)
    ctx.rotate(lerp(p.angle, p.target, s))
    ctx.scale(p.size * width, p.size)
    const g = Math.round(lerp(196, 176, p.tone))
    ctx.fillStyle = dark
      ? `rgba(214, ${g - 30}, ${g - 20}, 0.55)`
      : `rgba(238, ${g}, ${g + 8}, 0.92)`
    ctx.fill(PETAL)
    ctx.translate(0.05, 0.04)
    ctx.fillStyle = dark
      ? 'rgba(160, 70, 90, 0.18)'
      : 'rgba(200, 90, 120, 0.16)'
    ctx.fill(PETAL)
    ctx.restore()
  }
}

export const createPetalScene = (): Scene => {
  const field: PetalField = { debt: 0, petals: [] }
  return {
    step: (step) => stepField(field, step),
    draw: (ctx, eaves, offsetY, dark) =>
      drawPetals(ctx, field, eaves, offsetY, dark),
  }
}
