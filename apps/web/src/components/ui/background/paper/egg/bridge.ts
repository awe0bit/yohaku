import type { Profile } from '../page-state'
import type { EggState } from './phase'
import { createEggPhase } from './phase'

export type PaperVariant = 'full' | 'bare' | 'flat'

export interface PaperDriver {
  canvas: HTMLCanvasElement
  render: (variant: PaperVariant) => boolean
}

export const eggBridge = {
  state: createEggPhase() as EggState,
  profile: null as Profile | null,
  paper: null as PaperDriver | null,
  ready: false,
  lost: false,
}

export const eggActive = () => eggBridge.state.stage !== 'reading'
