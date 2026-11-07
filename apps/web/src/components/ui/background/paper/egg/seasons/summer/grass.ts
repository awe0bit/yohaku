import { rnd } from './math'

export const GRASS_H = 84

export const drawGrass = (w: number) => {
  const c = document.createElement('canvas')
  c.width = Math.round(w)
  c.height = GRASS_H
  const x = c.getContext('2d')!
  x.fillStyle = '#000'
  x.strokeStyle = '#000'
  x.lineCap = 'round'
  for (let i = 0; i < w / 2.6; i++) {
    const bx = Math.random() * w
    const clump =
      0.55 + 0.45 * Math.sin(bx * 0.011 + 1.3) * Math.sin(bx * 0.0047 + 0.4)
    const hh = (6 + Math.random() ** 1.8 * 46) * clump
    const lean = (Math.random() - 0.5) * 0.9
    const wd = 0.8 + Math.random() * 1.6
    x.beginPath()
    x.moveTo(bx - wd, GRASS_H)
    x.quadraticCurveTo(
      bx + lean * hh * 0.25,
      GRASS_H - hh * 0.6,
      bx + lean * hh,
      GRASS_H - hh,
    )
    x.quadraticCurveTo(
      bx + lean * hh * 0.25 + wd * 0.5,
      GRASS_H - hh * 0.6,
      bx + wd,
      GRASS_H,
    )
    x.fill()
  }
  for (let i = 0; i < 9; i++) {
    const bx = rnd(40, w - 40)
    const hh = rnd(44, 74)
    const lean = rnd(-0.5, 0.5)
    const tx = bx + lean * hh
    const ty = GRASS_H - hh
    const cx = bx + lean * hh * 0.2
    const cy = GRASS_H - hh * 0.7
    x.lineWidth = 0.9
    x.beginPath()
    x.moveTo(bx, GRASS_H)
    x.quadraticCurveTo(cx, cy, tx, ty)
    x.stroke()
    const ang = Math.atan2(ty - cy, tx - cx)
    x.globalAlpha = 0.5
    for (let k = 0; k < 14; k++) {
      const s = k / 13
      x.beginPath()
      x.ellipse(
        tx + Math.cos(ang) * s * 11 + (Math.random() - 0.5),
        ty + Math.sin(ang) * s * 11 + 2 * s * s + (Math.random() - 0.5),
        3.2 * (1 - s * 0.6),
        1.6,
        ang,
        0,
        Math.PI * 2,
      )
      x.fill()
    }
    x.globalAlpha = 1
  }
  return c
}
