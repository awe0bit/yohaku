import { useState } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { Probe, SpikeButton, SpikeScroll, useMountCount } from './probe'

export function DuoSpikeFull({ label }: { label: string }) {
  const mountsSoFar = useMountCount(`full:${label}`)
  const [count, setCount] = useState(0)
  return (
    <SafeAreaProvider>
      <SpikeScroll>
        <Probe label={label} mounts={mountsSoFar} />
        <SpikeButton
          title={`count ${count} (+1)`}
          onPress={() => setCount((n) => n + 1)}
        />
      </SpikeScroll>
    </SafeAreaProvider>
  )
}
