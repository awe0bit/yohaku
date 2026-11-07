import { autumnEffect } from './autumn'
import { springEffect } from './spring'
import { summerEffect } from './summer'
import type { SeasonFactory } from './types'
import { winterEffect } from './winter'

export const SEASON_EFFECTS: readonly SeasonFactory[] = [
  springEffect,
  summerEffect,
  autumnEffect,
  winterEffect,
]
