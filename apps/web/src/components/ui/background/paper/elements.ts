import type { ElemType } from '~/lib/paper/season'
import { ELEM_COLORS } from '~/lib/paper/season'

import type { ElementPlacement } from './layout'
import { rng } from './layout'

type Ctx = CanvasRenderingContext2D
type Rand = () => number

const TAU = Math.PI * 2

const petal = (x: Ctx, s: number) => {
  const w = s * 0.36
  const h = s * 0.5
  x.beginPath()
  x.moveTo(0, h)
  x.bezierCurveTo(w * 1.15, h * 0.55, w * 1.05, -h * 0.85, w * 0.38, -h)
  x.lineTo(0, -h * 0.74)
  x.lineTo(-w * 0.38, -h)
  x.bezierCurveTo(-w * 1.05, -h * 0.85, -w * 1.15, h * 0.55, 0, h)
  x.fill()
}

const peachPetal = (x: Ctx, s: number) => {
  const w = s * 0.34
  const h = s * 0.5
  x.beginPath()
  x.moveTo(0, h)
  x.bezierCurveTo(w * 1.2, h * 0.6, w * 1.1, -h * 0.55, 0, -h)
  x.bezierCurveTo(-w * 1.1, -h * 0.55, -w * 1.2, h * 0.6, 0, h)
  x.fill()
}

const veins = (x: Ctx, color: string, width: number, draw: () => void) => {
  x.save()
  x.strokeStyle = color
  x.lineWidth = width
  x.beginPath()
  draw()
  x.stroke()
  x.restore()
}

const stem = (x: Ctx, s: number, draw: () => void) => {
  x.save()
  x.strokeStyle = x.fillStyle
  x.lineWidth = Math.max(0.8, s)
  x.beginPath()
  draw()
  x.stroke()
  x.restore()
}

const maple = (x: Ctx, s: number) => {
  const R = s * 0.5
  const lobes: [number, number][] = [
    [-202, 0.45],
    [-166, 0.68],
    [-128, 0.86],
    [-90, 1],
    [-52, 0.86],
    [-14, 0.68],
    [22, 0.45],
  ]
  const at = (deg: number, r: number): [number, number] => [
    Math.cos((deg * Math.PI) / 180) * R * r,
    Math.sin((deg * Math.PI) / 180) * R * r,
  ]
  x.beginPath()
  x.moveTo(0, R * 0.12)
  lobes.forEach(([deg, len], k) => {
    const prev = k === 0 ? deg - 34 : (lobes[k - 1][0] + deg) / 2
    const next = k === lobes.length - 1 ? deg + 34 : (lobes[k + 1][0] + deg) / 2
    const valley = at(prev, 0.4)
    const tip = at(deg, len)
    const side = at(deg - 90, 0.15)
    const v2 = at(next, 0.4)
    x.lineTo(valley[0], valley[1])
    x.lineTo(
      (valley[0] + tip[0]) / 2 + side[0],
      (valley[1] + tip[1]) / 2 + side[1],
    )
    x.lineTo(tip[0], tip[1])
    x.lineTo((v2[0] + tip[0]) / 2 - side[0], (v2[1] + tip[1]) / 2 - side[1])
  })
  x.closePath()
  x.fill()
  veins(x, 'rgba(0,0,0,0.18)', 0.5, () => {
    for (const [deg, len] of lobes) {
      const t = at(deg, len * 0.85)
      x.moveTo(0, 0)
      x.lineTo(t[0], t[1])
    }
  })
  stem(x, s * 0.03, () => {
    x.moveTo(0, R * 0.1)
    x.quadraticCurveTo(R * 0.02, R * 0.35, R * 0.08, R * 0.55)
  })
}

const ginkgo = (x: Ctx, s: number) => {
  const R = s * 0.55
  x.beginPath()
  x.moveTo(0, 0)
  x.quadraticCurveTo(-R * 0.35, -R * 0.2, -R * 0.9, -R * 0.62)
  x.quadraticCurveTo(-R * 0.6, -R * 1.05, -R * 0.08, -R * 0.98)
  x.lineTo(0, -R * 0.8)
  x.lineTo(R * 0.08, -R * 0.98)
  x.quadraticCurveTo(R * 0.6, -R * 1.05, R * 0.9, -R * 0.62)
  x.quadraticCurveTo(R * 0.35, -R * 0.2, 0, 0)
  x.fill()
  veins(x, 'rgba(0,0,0,0.12)', 0.4, () => {
    for (let k = 0; k < 9; k++) {
      const a = ((-150 + k * 15) * Math.PI) / 180
      x.moveTo(0, 0)
      x.lineTo(Math.cos(a) * R * 0.9, Math.sin(a) * R * 0.9)
    }
  })
  stem(x, s * 0.035, () => {
    x.moveTo(0, 0)
    x.lineTo(R * 0.04, R * 0.42)
  })
}

const flower = (
  x: Ctx,
  s: number,
  r: Rand,
  kind: 'sakura' | 'ume' | 'peach',
) => {
  for (let k = 0; k < 5; k++) {
    x.save()
    x.rotate((k * TAU) / 5)
    x.translate(0, -s * 0.27)
    if (kind === 'sakura') petal(x, s * 0.55)
    else if (kind === 'peach') peachPetal(x, s * 0.55)
    else {
      x.beginPath()
      x.arc(0, 0, s * 0.2, 0, TAU)
      x.fill()
    }
    x.restore()
  }
  x.save()
  x.fillStyle =
    kind === 'sakura' ? '#c97b8c' : kind === 'peach' ? '#c2566e' : '#c98a3a'
  for (let k = 0; k < 7; k++) {
    const a = r() * TAU
    const d = s * (0.06 + r() * 0.08)
    x.beginPath()
    x.arc(Math.cos(a) * d, Math.sin(a) * d, 0.7, 0, TAU)
    x.fill()
  }
  x.restore()
}

const pear = (x: Ctx, s: number, r: Rand, whole: boolean) => {
  x.strokeStyle = 'rgba(90,80,70,0.28)'
  x.lineWidth = 0.5
  const petals = whole ? 5 : 1
  for (let k = 0; k < petals; k++) {
    x.save()
    x.rotate((k * TAU) / 5)
    if (whole) x.translate(0, -s * 0.24)
    x.beginPath()
    x.ellipse(
      0,
      0,
      s * (whole ? 0.2 : 0.42),
      s * (whole ? 0.22 : 0.5),
      0,
      0,
      TAU,
    )
    x.fill()
    x.stroke()
    x.restore()
  }
  if (!whole) return
  x.fillStyle = '#6b2a3a'
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * TAU + r() * 0.3
    const d = s * (0.08 + r() * 0.05)
    x.beginPath()
    x.arc(Math.cos(a) * d, Math.sin(a) * d, 0.8, 0, TAU)
    x.fill()
  }
}

const peony = (x: Ctx, s: number, r: Rand) => {
  const w = s * 0.42
  const h = s * 0.5
  x.beginPath()
  x.moveTo(0, h)
  x.quadraticCurveTo(-w * 1.1, h * 0.1, -w, -h * 0.45)
  for (let k = 0; k < 5; k++) {
    const x0 = -w + (k * 2 * w) / 5
    const x1 = -w + ((k + 1) * 2 * w) / 5
    x.quadraticCurveTo(
      (x0 + x1) / 2,
      -h * (0.95 + r() * 0.15),
      x1,
      -h * (0.5 + r() * 0.12),
    )
  }
  x.quadraticCurveTo(w * 1.1, h * 0.1, 0, h)
  x.fill()
  veins(x, 'rgba(120,30,60,0.14)', 0.45, () => {
    for (let k = 0; k < 6; k++) {
      const ex = -w * 0.8 + (k * 1.6 * w) / 5
      x.moveTo(0, h * 0.85)
      x.quadraticCurveTo(ex * 0.4, 0, ex, -h * 0.6)
    }
  })
}

const wisteria = (x: Ctx, s: number) => {
  x.beginPath()
  x.ellipse(0, -s * 0.12, s * 0.32, s * 0.28, 0, 0, TAU)
  x.fill()
  x.save()
  x.fillStyle = '#7d69b3'
  x.beginPath()
  x.ellipse(0, s * 0.2, s * 0.15, s * 0.2, 0, 0, TAU)
  x.fill()
  x.fillStyle = '#e8d98a'
  x.beginPath()
  x.ellipse(0, -s * 0.06, s * 0.06, s * 0.09, 0, 0, TAU)
  x.fill()
  x.restore()
}

const lotus = (x: Ctx, s: number) => {
  const w = s * 0.28
  const h = s * 0.5
  x.beginPath()
  x.moveTo(0, h)
  x.bezierCurveTo(w * 1.25, h * 0.3, w * 0.85, -h * 0.7, 0, -h)
  x.bezierCurveTo(-w * 0.85, -h * 0.7, -w * 1.25, h * 0.3, 0, h)
  x.fill()
  veins(x, 'rgba(150,50,80,0.15)', 0.45, () => {
    for (const ex of [-0.5, -0.2, 0.2, 0.5]) {
      x.moveTo(0, h * 0.9)
      x.quadraticCurveTo(ex * w, 0, ex * w * 0.6, -h * 0.85)
    }
  })
}

const osmanthus = (x: Ctx, s: number, r: Rand) => {
  const n = 3 + Math.floor(r() * 3)
  for (let j = 0; j < n; j++) {
    x.save()
    x.translate((r() - 0.5) * s * 0.7, (r() - 0.5) * s * 0.7)
    x.rotate(r() * Math.PI)
    for (let k = 0; k < 4; k++) {
      x.save()
      x.rotate((k * Math.PI) / 2)
      x.beginPath()
      x.ellipse(0, -s * 0.07, s * 0.055, s * 0.075, 0, 0, TAU)
      x.fill()
      x.restore()
    }
    x.restore()
  }
}

const wintersweet = (x: Ctx, s: number) => {
  for (let k = 0; k < 8; k++) {
    x.save()
    x.rotate((k * TAU) / 8 + (k % 2) * 0.2)
    x.translate(0, -s * 0.2)
    x.beginPath()
    x.ellipse(0, 0, s * 0.13, s * 0.22, 0, 0, TAU)
    x.fill()
    x.restore()
  }
  x.save()
  x.fillStyle = '#7a4a3a'
  x.beginPath()
  x.arc(0, 0, s * 0.11, 0, TAU)
  x.fill()
  x.restore()
}

const ajisai = (x: Ctx, s: number) => {
  for (let k = 0; k < 4; k++) {
    x.save()
    x.rotate((k * Math.PI) / 2 + Math.PI / 4)
    x.beginPath()
    x.ellipse(0, -s * 0.24, s * 0.17, s * 0.24, 0, 0, TAU)
    x.fill()
    x.restore()
  }
}

const snow = (x: Ctx, s: number) => {
  x.strokeStyle = x.fillStyle
  x.lineWidth = Math.max(0.8, s * 0.05)
  x.lineCap = 'round'
  x.beginPath()
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3
    const ux = Math.cos(a)
    const uy = Math.sin(a)
    x.moveTo(0, 0)
    x.lineTo(ux * s * 0.5, uy * s * 0.5)
    for (const t of [0.24, 0.38]) {
      const bx = ux * s * t
      const by = uy * s * t
      for (const sign of [-1, 1]) {
        const b = a + (sign * Math.PI) / 3
        x.moveTo(bx, by)
        x.lineTo(bx + Math.cos(b) * s * 0.11, by + Math.sin(b) * s * 0.11)
      }
    }
  }
  x.stroke()
}

const DRAW: Record<ElemType, (x: Ctx, s: number, r: Rand) => void> = {
  petal,
  roundPetal: (x, s) => {
    x.beginPath()
    x.ellipse(0, 0, s * 0.42, s * 0.5, 0, 0, TAU)
    x.fill()
  },
  sakura: (x, s, r) => flower(x, s, r, 'sakura'),
  ume: (x, s, r) => flower(x, s, r, 'ume'),
  peach: (x, s, r) => flower(x, s, r, 'peach'),
  peachPetal,
  pear: (x, s, r) => pear(x, s, r, true),
  pearPetal: (x, s, r) => pear(x, s, r, false),
  peony,
  wisteria,
  lotus,
  osmanthus,
  wintersweet,
  'maple:green': maple,
  'maple:turning': maple,
  'maple:red': maple,
  ginkgo,
  'ginkgo:fallen': ginkgo,
  ajisai,
  snow,
}

export const paintElements = (x: Ctx, items: ElementPlacement[]) => {
  for (const item of items) {
    const colors = ELEM_COLORS[item.type]
    x.save()
    x.translate(item.x, item.y)
    x.rotate(item.rotation)
    if (item.flip) x.scale(-1, 1)
    x.globalAlpha = item.alpha
    x.fillStyle = colors[Math.floor(item.colorIndex * colors.length)]
    DRAW[item.type](x, item.size, rng(item.seed ^ 0x9E3779B9))
    x.restore()
  }
}
