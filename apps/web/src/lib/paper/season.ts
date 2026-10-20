import type { Lab, Rgb } from './oklab'
import { hexToRgb, labToRgb, rgbToLab } from './oklab'

export const SOLAR_TERMS = [
  '立春',
  '雨水',
  '惊蛰',
  '春分',
  '清明',
  '谷雨',
  '立夏',
  '小满',
  '芒种',
  '夏至',
  '小暑',
  '大暑',
  '立秋',
  '处暑',
  '白露',
  '秋分',
  '寒露',
  '霜降',
  '立冬',
  '小雪',
  '大雪',
  '冬至',
  '小寒',
  '大寒',
] as const

export const seasonOf = (term: number) => Math.floor(term / 6)

const smooth = (t: number) => t * t * (3 - 2 * t)

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const lerp3 = <T extends Rgb | Lab>(a: T, b: T, t: number) =>
  [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)] as T

const PAPER: Record<'light' | 'dark', Rgb[]> = {
  light: [
    [0.972, 0.956, 0.95],
    [0.949, 0.962, 0.955],
    [0.967, 0.955, 0.929],
    [0.955, 0.958, 0.963],
  ],
  dark: [
    [0.112, 0.103, 0.106],
    [0.093, 0.106, 0.103],
    [0.114, 0.104, 0.091],
    [0.095, 0.099, 0.111],
  ],
}

export const paperColor = (term: number, dark: boolean): Rgb => {
  const anchors = dark ? PAPER.dark : PAPER.light
  const t = ((term - 3 + 24) % 24) / 6
  const s = Math.floor(t)
  return lerp3(anchors[s % 4], anchors[(s + 1) % 4], smooth(t - s))
}

export const sunagoDensity = (term: number) =>
  0.35 + 1.65 * ((1 + Math.cos((2 * Math.PI * (term - 21)) / 24)) / 2) ** 1.5

export const goldness = (term: number) =>
  (1 + Math.cos((2 * Math.PI * (term - 17)) / 24)) / 2

export interface SukiSpec {
  amount: number
  colors: string[]
  kind: 'petal' | 'fiber' | 'none'
}

export const SUKI: SukiSpec[] = [
  { kind: 'petal', amount: 1, colors: ['#d79aa2', '#e4b9bb', '#c7848e'] },
  { kind: 'fiber', amount: 0.75, colors: ['#8fae94', '#a3bfae', '#7d9c8e'] },
  {
    kind: 'petal',
    amount: 1,
    colors: ['#b2603c', '#c88a3a', '#97452f', '#cfa14a'],
  },
  { kind: 'none', amount: 0, colors: [] },
]

export const sukiDensity = (term: number) =>
  SUKI[seasonOf(term)].amount *
  (0.55 + 0.45 * Math.sin((Math.PI * ((term % 6) + 0.5)) / 6))

export type ElemType =
  | 'petal'
  | 'sakura'
  | 'ume'
  | 'roundPetal'
  | 'peach'
  | 'peachPetal'
  | 'pear'
  | 'pearPetal'
  | 'peony'
  | 'wisteria'
  | 'lotus'
  | 'osmanthus'
  | 'wintersweet'
  | 'maple:green'
  | 'maple:turning'
  | 'maple:red'
  | 'ginkgo'
  | 'ginkgo:fallen'
  | 'ginkgo:turning'
  | 'lycoris'
  | 'ajisai'
  | 'snow'

export const ELEM_COLORS: Record<ElemType, string[]> = {
  petal: ['#f1c6cf', '#ebb3c0', '#f5d5dc'],
  sakura: ['#f1c6cf', '#ebb3c0', '#f5d5dc'],
  ume: ['#e9a3b3', '#f2e2e2', '#dd8ea0'],
  roundPetal: ['#e9a3b3', '#f2e2e2', '#dd8ea0'],
  peach: ['#e8879c', '#f0a3b4', '#dc7590'],
  peachPetal: ['#e8879c', '#f0a3b4', '#dc7590'],
  pear: ['#f6f3ec', '#f1eee6'],
  pearPetal: ['#f6f3ec', '#f1eee6'],
  peony: ['#e59ab8', '#d97aa0', '#f0b8cc'],
  wisteria: ['#a996cf', '#b8a8da', '#9583c4'],
  lotus: ['#efb7c6', '#f3c9d4', '#e8a3b6'],
  osmanthus: ['#e3a23c', '#eab24f', '#d9902e'],
  wintersweet: ['#e6c25a', '#eccd6e', '#dcb447'],
  'maple:green': ['#8fb07a', '#7aa067', '#a3bd86'],
  'maple:turning': ['#a7b06a', '#cf8d42', '#c45b3a'],
  'maple:red': ['#c4493a', '#d0653a', '#b03a32', '#d9883e'],
  ginkgo: ['#e2bf4e', '#d8ae3a', '#ead07a'],
  'ginkgo:fallen': ['#c79a45', '#b88a3c', '#d2a958'],
  'ginkgo:turning': ['#b9bf5a', '#cdbf4e', '#a9b55c'],
  lycoris: ['#c23b3b', '#d04a44', '#b83236'],
  ajisai: ['#9db0d8', '#b3a5d6', '#8aa6cc', '#d3a9c9'],
  snow: ['#a9b6c8', '#bcc7d6'],
}

export const ELEM_SIZE: Record<ElemType, [number, number]> = {
  petal: [10, 16],
  roundPetal: [8, 12],
  sakura: [18, 26],
  ume: [14, 20],
  peach: [18, 26],
  peachPetal: [10, 15],
  pear: [16, 22],
  pearPetal: [9, 13],
  peony: [16, 26],
  wisteria: [9, 13],
  lotus: [16, 26],
  osmanthus: [8, 13],
  wintersweet: [13, 18],
  'maple:green': [24, 38],
  'maple:turning': [24, 38],
  'maple:red': [24, 38],
  ginkgo: [18, 28],
  'ginkgo:fallen': [18, 26],
  'ginkgo:turning': [18, 28],
  lycoris: [20, 30],
  ajisai: [10, 15],
  snow: [10, 18],
}

export interface ElemGroup {
  accent: string
  at: number[]
  mix: [ElemType, number][]
}

export const ELEM_GROUPS: ElemGroup[] = [
  {
    at: [0, 1],
    accent: '#b5536b',
    mix: [
      ['ume', 1],
      ['roundPetal', 2],
    ],
  },
  {
    at: [2],
    accent: '#c25a77',
    mix: [
      ['peachPetal', 3],
      ['peach', 1],
    ],
  },
  {
    at: [3],
    accent: '#b56a7f',
    mix: [
      ['petal', 4],
      ['sakura', 1],
    ],
  },
  {
    at: [4],
    accent: '#7c8f5c',
    mix: [
      ['pearPetal', 3],
      ['pear', 1.2],
      ['petal', 0.6],
    ],
  },
  {
    at: [5],
    accent: '#8463ad',
    mix: [
      ['peony', 1.4],
      ['wisteria', 2],
    ],
  },
  {
    at: [6],
    accent: '#7a68a8',
    mix: [
      ['wisteria', 1.5],
      ['maple:green', 1],
    ],
  },
  {
    at: [7],
    accent: '#5b8a55',
    mix: [
      ['maple:green', 1],
      ['ajisai', 0.5],
    ],
  },
  {
    at: [8, 9],
    accent: '#5f74b0',
    mix: [
      ['ajisai', 3],
      ['maple:green', 0.5],
    ],
  },
  {
    at: [10, 11],
    accent: '#b85f7c',
    mix: [
      ['lotus', 1.4],
      ['maple:green', 1],
    ],
  },
  {
    at: [12, 13],
    accent: '#5f8a5a',
    mix: [
      ['maple:green', 1.5],
      ['lotus', 0.4],
    ],
  },
  {
    at: [14],
    accent: '#b8434a',
    mix: [
      ['lycoris', 1],
      ['maple:green', 0.8],
    ],
  },
  {
    at: [15],
    accent: '#c0852a',
    mix: [
      ['osmanthus', 1],
      ['lycoris', 0.3],
    ],
  },
  {
    at: [16, 17],
    accent: '#b56a35',
    mix: [
      ['osmanthus', 1.2],
      ['maple:turning', 1],
    ],
  },
  {
    at: [18],
    accent: '#b07a3a',
    mix: [
      ['maple:turning', 1.2],
      ['ginkgo:turning', 1],
    ],
  },
  {
    at: [19],
    accent: '#b4452f',
    mix: [
      ['maple:red', 1.2],
      ['ginkgo', 1],
    ],
  },
  {
    at: [20],
    accent: '#a87b34',
    mix: [
      ['ginkgo:fallen', 1.2],
      ['maple:red', 0.6],
    ],
  },
  {
    at: [21],
    accent: '#a07a3c',
    mix: [
      ['ginkgo:fallen', 1.2],
      ['maple:red', 0.4],
      ['wintersweet', 0.5],
      ['snow', 0.3],
    ],
  },
  {
    at: [22, 23],
    accent: '#b08a2a',
    mix: [
      ['wintersweet', 1.4],
      ['snow', 1],
    ],
  },
]

export const elemGroupIndex = (term: number) =>
  ELEM_GROUPS.findIndex((g) => g.at.includes(term))

export const shapeLab = (rgb: Rgb, lightness: number, chroma: number): Lab => {
  const [, a, b] = rgbToLab(rgb)
  const c = Math.hypot(a, b)
  if (c < 1e-4) return [lightness, 0, 0]
  return [lightness, (a / c) * chroma, (b / c) * chroma]
}

export const accentLab = (term: number, dark: boolean): Lab =>
  shapeLab(
    hexToRgb(ELEM_GROUPS[elemGroupIndex(term)].accent)!,
    dark ? 0.74 : 0.56,
    dark ? 0.1 : 0.12,
  )

export const accentRgb = (term: number, dark: boolean): Rgb =>
  labToRgb(accentLab(term, dark))

export const dyeLab = (rgb: Rgb, dark: boolean): Lab =>
  shapeLab(rgb, dark ? 0.46 : 0.62, 0.075)

export const rgbToHex = (rgb: Rgb) =>
  `#${rgb
    .map((v) =>
      Math.round(Math.min(1, Math.max(0, v)) * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`
