import type { ElemType } from '~/lib/paper/season'
import { ELEM_COLORS } from '~/lib/paper/season'

export type SpriteType = ElemType | 'maple:dry'

export const FALL_CAP = 14

export const PETAL_OF: Partial<Record<SpriteType, ElemType>> = {
  sakura: 'petal',
  ume: 'roundPetal',
  peach: 'peachPetal',
  pear: 'pearPetal',
  peony: 'petal',
  lotus: 'petal',
}

export const LOOSE = new Set<SpriteType>([
  'petal',
  'roundPetal',
  'peachPetal',
  'pearPetal',
  'wisteria',
])

const NEXT_STAGE: Partial<Record<SpriteType, SpriteType>> = {
  'maple:green': 'maple:turning',
  'maple:turning': 'maple:red',
  'maple:red': 'maple:dry',
  'ginkgo:turning': 'ginkgo',
  ginkgo: 'ginkgo:fallen',
}

const DRY_MAPLE = ['#9a6b3e', '#a8794a', '#8c5f36']

export const nextStage = (type: SpriteType) => NEXT_STAGE[type] ?? null

export const drawTypeOf = (type: SpriteType): ElemType =>
  type === 'maple:dry' ? 'maple:red' : type

export const colorsOf = (type: SpriteType) =>
  type === 'maple:dry' ? DRY_MAPLE : ELEM_COLORS[type]

export const familyOf = (type: SpriteType) => type.split(':')[0]

export const keepsParentColor = (type: SpriteType) =>
  type === 'peony' || type === 'lotus'

export const isFireflyTerm = (term: number) => term >= 9 && term <= 11

interface Floater {
  born: number
  falling: boolean
  home: boolean
  sinkAfter: number
  sinkT: number
}

export const pickSinking = <T extends Floater>(
  items: T[],
  now: number,
  cap = FALL_CAP,
): T[] => {
  const floating = items
    .filter((s) => !s.home && !s.falling && !s.sinkT)
    .sort((a, b) => a.born - b.born)
  const over = floating.length - cap
  return floating.filter((s, i) => i < over || now > s.sinkAfter)
}
