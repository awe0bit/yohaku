import { familyOf } from './reactions'
import type { Sprite, SpriteWorld } from './sprites'
import { clamp01, sinkProgress } from './sprites'

type Ctx = CanvasRenderingContext2D

const TAU = Math.PI * 2

const drawDust = (x: Ctx, world: SpriteWorld, now: number, alphaK: number) => {
  const { dust } = world
  for (let i = dust.length - 1; i >= 0; i--) {
    const d = dust[i]
    const age = (now - d.t0) / 1000
    if (age > 1.4) {
      dust.splice(i, 1)
      continue
    }
    d.x += d.vx / 60
    d.y += d.vy / 60
    x.globalAlpha = (1 - age / 1.4) * 0.7 * alphaK
    x.fillStyle = d.c
    x.beginPath()
    x.arc(d.x, d.y, 1.1, 0, TAU)
    x.fill()
  }
}

const drawRipples = (
  x: Ctx,
  world: SpriteWorld,
  now: number,
  alphaK: number,
) => {
  const { ripples, dark } = world
  for (let i = ripples.length - 1; i >= 0; i--) {
    const r = ripples[i]
    const age = (now - r.t0) / 1000
    if (age > r.life + 1) {
      ripples.splice(i, 1)
      continue
    }
    for (const { delay, gain } of r.rings) {
      const t = (age - delay) / r.life
      if (t <= 0 || t >= 1) continue
      const R = 3 + r.R * Math.sqrt(t)
      const fade = (1 - t) * (1 - t) * gain * r.alpha * alphaK
      x.lineWidth = 0.9 * (1 - t * 0.4)
      x.globalAlpha = fade * 0.65
      x.strokeStyle = dark ? 'rgb(235,230,220)' : 'rgb(80,70,58)'
      x.beginPath()
      x.ellipse(r.x, r.y, R, R * r.ecc, r.tilt, 0, TAU)
      x.stroke()
      const inner = Math.max(1, R - 1.2)
      x.globalAlpha = fade * (dark ? 0.3 : 0.75)
      x.strokeStyle = dark ? 'rgb(20,18,16)' : 'rgb(255,255,252)'
      x.beginPath()
      x.ellipse(r.x, r.y, inner, inner * r.ecc, r.tilt, 0, TAU)
      x.stroke()
    }
  }
}

const drawSprite = (
  x: Ctx,
  s: Sprite,
  world: SpriteWorld,
  now: number,
  alphaK: number,
  liftK: number,
  settle: number,
) => {
  const lift = s.home ? liftK : 1
  if (lift <= 0.001) return
  const { dark } = world
  const fam = familyOf(s.type)
  const h = s.h
  const sinkK = sinkProgress(s, now)
  const bob = 1 + Math.sin(now / 900 + s.seed) * 0.02 * lift
  const fx = Math.cos(s.flipPh) * s.flip
  const sc =
    bob *
    (1 + 0.06 * lift) *
    (1 - 0.55 * s.melt) *
    (1 + 0.55 * h) *
    (1 - 0.18 * sinkK)
  let a =
    s.alpha *
    (dark ? 0.62 : 0.72) *
    (0.55 + 0.45 * lift) *
    alphaK *
    (1 - 0.85 * s.melt) *
    (1 - sinkK)
  if (!s.home) a *= clamp01((now - s.born) / 450) * (1 - settle)
  const { face, back, S, SS: SS0, shadow } = s.art

  x.save()
  x.translate(s.x + 3 * lift + 26 * h, s.y + 4 * lift + 34 * h)
  x.rotate(s.rot)
  x.scale(sc * fx * (1 - 0.35 * h), sc * (1 - 0.35 * h))
  x.globalAlpha = a * (0.16 * lift * (1 - sinkK) + 0.1 * h)
  const SS = SS0 * (1 + 0.5 * h)
  x.drawImage(shadow, -SS / 2, -SS / 2, SS, SS)
  x.restore()

  x.save()
  x.translate(s.x, s.y)
  x.rotate(s.rot)
  x.scale(sc * fx, sc)
  const hueOn = fam === 'ajisai' && Math.abs(s.hue) > 0.5
  if (hueOn) x.filter = `hue-rotate(${s.hue}deg)`
  if (s.oldArt && s.swapT < 1) {
    const old = s.oldArt
    x.globalAlpha = a * (1 - s.swapT)
    x.drawImage(
      fx < 0 ? old.back : old.face,
      -old.S / 2,
      -old.S / 2,
      old.S,
      old.S,
    )
  }
  x.globalAlpha = a * (s.oldArt ? s.swapT : 1)
  x.drawImage(fx < 0 || sinkK > 0.5 ? back : face, -S / 2, -S / 2, S, S)
  if (hueOn) x.filter = 'none'
  if (s.glow > 0.02) {
    x.globalCompositeOperation = 'lighter'
    x.globalAlpha = s.glow * 0.5 * alphaK
    x.drawImage(face, -S / 2, -S / 2, S, S)
    x.globalCompositeOperation = 'source-over'
  }
  x.restore()

  if (fam === 'snow' && s.melt > 0.15) {
    x.globalAlpha = s.melt * 0.35 * alphaK
    x.strokeStyle = dark ? 'rgba(190,205,225,1)' : 'rgba(120,140,170,1)'
    x.lineWidth = 0.8
    x.beginPath()
    x.arc(s.x, s.y, s.size * (0.3 + s.melt * 0.5), 0, TAU)
    x.stroke()
  }
  if (fam === 'wintersweet' && s.glow > 0.02) {
    const g = x.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size * 1.6)
    g.addColorStop(0, `rgba(255,214,120,${0.35 * s.glow * alphaK})`)
    g.addColorStop(1, 'rgba(255,214,120,0)')
    x.globalAlpha = 1
    x.fillStyle = g
    x.beginPath()
    x.arc(s.x, s.y, s.size * 1.6, 0, TAU)
    x.fill()
  }
}

const drawFireflies = (
  x: Ctx,
  world: SpriteWorld,
  now: number,
  alphaK: number,
) => {
  for (const f of world.fireflies) {
    const pulse = 0.5 + 0.5 * Math.sin(now / 380 + f.ph)
    const k = f.life * pulse * alphaK
    const g = x.createRadialGradient(f.x, f.y, 0, f.x, f.y, 14)
    g.addColorStop(0, `rgba(226,255,140,${0.9 * k})`)
    g.addColorStop(0.25, `rgba(190,240,110,${0.45 * k})`)
    g.addColorStop(1, 'rgba(160,220,90,0)')
    x.globalAlpha = 1
    x.globalCompositeOperation = world.dark ? 'lighter' : 'source-over'
    x.fillStyle = g
    x.beginPath()
    x.arc(f.x, f.y, 14, 0, TAU)
    x.fill()
    x.globalCompositeOperation = 'source-over'
  }
}

export const drawSpriteWorld = (
  x: Ctx,
  world: SpriteWorld,
  now: number,
  alphaK: number,
  liftK: number,
  settle: number,
) => {
  x.setTransform(world.dpr, 0, 0, world.dpr, 0, 0)
  x.clearRect(0, 0, world.w, world.h)
  drawDust(x, world, now, alphaK)
  drawRipples(x, world, now, alphaK)
  for (const s of world.sprites)
    drawSprite(x, s, world, now, alphaK, liftK, settle)
  drawFireflies(x, world, now, alphaK)
  x.globalAlpha = 1
  x.filter = 'none'
}
