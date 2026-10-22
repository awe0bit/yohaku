import { requireNativeModule } from 'expo-modules-core'

type NativeDuoSpike = {
  dismiss: () => Promise<void>
  isArrangementAvailable: () => boolean
  lab: (action: string, first: string, second: string) => Promise<void>
  main: (action: string) => Promise<void>
  popOuter: () => Promise<void>
  present: () => Promise<void>
  pushOuter: (label: string) => Promise<void>
  setOuterBarOnPage: (visible: boolean) => Promise<void>
}

const native = requireNativeModule<NativeDuoSpike>('YohakuDuoSpike')

export const isDuoArrangementAvailable = () => native.isArrangementAvailable()
export const presentDuoSpike = () => native.present()
export const pushDuoSpikeOuter = (label: string) => native.pushOuter(label)
export const popDuoSpikeOuter = () => native.popOuter()
export const setDuoSpikeOuterBar = (visible: boolean) =>
  native.setOuterBarOnPage(visible)
export const duoLab = (action: string, first = '', second = '') =>
  native.lab(action, first, second)
export const duoMain = (action: string) => native.main(action)
export const dismissDuoSpike = () => native.dismiss()
