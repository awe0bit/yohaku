import type { DyeInput } from './dye'

export const dyeInput: DyeInput = {
  key: null,
  labs: null,
  velocity: 0,
  weight: 0,
}

export const PAPER_DYE_SCOPE_CLASS = 'yohaku-paper-dye-scope'

export const resetDyeInput = () => {
  dyeInput.key = null
  dyeInput.labs = null
  dyeInput.velocity = 0
  dyeInput.weight = 0
}
