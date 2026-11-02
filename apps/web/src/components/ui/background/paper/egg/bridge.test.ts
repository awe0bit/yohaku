import { afterEach, describe, expect, it } from 'vitest'

import { PAGE_PROFILES } from '../page-state'
import { eggBridge, flowStrength } from './bridge'
import { enterEgg, resetEgg } from './phase'

describe('flow strength', () => {
  afterEach(() => {
    resetEgg(eggBridge.state)
    eggBridge.flow = null
  })

  it('stays off until the egg has uploaded a flow field', () => {
    enterEgg(eggBridge.state, PAGE_PROFILES.browse)
    expect(flowStrength()).toBe(0)
    eggBridge.flow = { bytes: new Uint8Array(4), gx: 1, gy: 1, version: 1 }
    expect(flowStrength()).toBe(1)
  })
})
