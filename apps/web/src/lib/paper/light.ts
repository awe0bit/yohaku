import type { Rgb } from './oklab'
import { lerp, lerp3 } from './season'

export interface Light {
  amount: number
  bokashi: Rgb
  color: Rgb
  radius: number
  src: [number, number]
}

const LAMP: Light = {
  src: [0.84, 0.1],
  radius: 0.6,
  color: [1, 0.82, 0.6],
  bokashi: [0.2, 0.25, 0.38],
  amount: 0.09,
}

const KEYS: [number, Light][] = [
  [0, LAMP],
  [5, LAMP],
  [
    6.5,
    {
      src: [-0.1, -0.15],
      radius: 1.25,
      color: [1, 0.9, 0.86],
      bokashi: [0.86, 0.62, 0.6],
      amount: 0.11,
    },
  ],
  [
    9,
    {
      src: [0.15, -0.3],
      radius: 1.4,
      color: [1, 0.97, 0.93],
      bokashi: [0.45, 0.55, 0.68],
      amount: 0.05,
    },
  ],
  [
    12,
    {
      src: [0.5, -0.4],
      radius: 1.6,
      color: [1, 1, 0.98],
      bokashi: [0.45, 0.55, 0.68],
      amount: 0.04,
    },
  ],
  [
    15,
    {
      src: [0.85, -0.3],
      radius: 1.4,
      color: [1, 0.95, 0.88],
      bokashi: [0.5, 0.56, 0.66],
      amount: 0.05,
    },
  ],
  [
    17.5,
    {
      src: [1.1, -0.12],
      radius: 1.25,
      color: [1, 0.84, 0.68],
      bokashi: [0.82, 0.5, 0.36],
      amount: 0.12,
    },
  ],
  [19, LAMP],
  [24, LAMP],
]

const smooth = (t: number) => t * t * (3 - 2 * t)

export const lightAt = (hour: number): Light => {
  let k = 0
  while (k < KEYS.length - 2 && KEYS[k + 1][0] <= hour) k++
  const [h0, a] = KEYS[k]
  const [h1, b] = KEYS[k + 1]
  const t = smooth(Math.min(1, Math.max(0, (hour - h0) / (h1 - h0 || 1))))
  return {
    src: [lerp(a.src[0], b.src[0], t), lerp(a.src[1], b.src[1], t)],
    radius: lerp(a.radius, b.radius, t),
    color: lerp3(a.color, b.color, t),
    bokashi: lerp3(a.bokashi, b.bokashi, t),
    amount: lerp(a.amount, b.amount, t),
  }
}

export const localHour = (date: Date) =>
  date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600
