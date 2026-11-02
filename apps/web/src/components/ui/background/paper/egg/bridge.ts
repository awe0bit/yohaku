import type { Profile } from '../page-state'
import type { EggState } from './phase'
import { createEggPhase } from './phase'

export interface EggFlow {
  bytes: Uint8Array
  gx: number
  gy: number
  version: number
}

export const eggBridge = {
  state: createEggPhase() as EggState,
  flow: null as EggFlow | null,
  profile: null as Profile | null,
  ready: false,
  lost: false,
}

export const eggActive = () => eggBridge.state.stage !== 'reading'

export const flowStrength = () => (eggActive() && eggBridge.flow ? 1 : 0)
