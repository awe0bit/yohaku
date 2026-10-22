import {
  dismissDuoSpike,
  duoLab,
  duoMain,
  popDuoSpikeOuter,
  presentDuoSpike,
  pushDuoSpikeOuter,
  setDuoSpikeOuterBar,
} from '@modules/yohaku/duo-spike'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect } from 'react'

import { emitDuoSpikeCommand } from '@/screens/dev/duo-spike/rn-lab'

export default function DuoSpikeRoute() {
  const router = useRouter()
  const { a, b, lab, pane, rn, step, t } = useLocalSearchParams<{
    a?: string
    b?: string
    lab?: string
    pane?: string
    rn?: string
    step?: string
    t?: string
  }>()
  useEffect(() => {
    if (step?.startsWith('main-')) {
      if (router.canGoBack()) router.back()
      else router.replace('/')
      duoMain(step.slice(5))
    } else if (rn) emitDuoSpikeCommand({ action: rn, pane: pane ?? 'secondary' })
    else if (lab) duoLab(lab, a, b)
    else if (step === 'outer') pushDuoSpikeOuter('outer via link')
    else if (step === 'pop') popDuoSpikeOuter()
    else if (step === 'close') dismissDuoSpike()
    else if (step === 'bar-on') setDuoSpikeOuterBar(true)
    else if (step === 'bar-off') setDuoSpikeOuterBar(false)
    else presentDuoSpike()
  }, [a, b, lab, pane, rn, router, step, t])
  return null
}
