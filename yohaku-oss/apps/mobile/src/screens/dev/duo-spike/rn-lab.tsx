import { type ComponentRef, useEffect, useRef, useState } from 'react'
import {
  Modal,
  type ModalProps,
  PlatformColor,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context'

type DuoSpikeCommand = { action: string; pane: string }
type Listener = (command: DuoSpikeCommand) => void

const listeners = new Set<Listener>()

export function emitDuoSpikeCommand(command: DuoSpikeCommand) {
  for (const listener of listeners) listener(command)
}

export function useDuoSpikeCommands(
  pane: string,
  handler: (action: string) => void,
) {
  useEffect(() => {
    const listener: Listener = (command) => {
      if (command.pane === pane) handler(command.action)
    }
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }, [handler, pane])
}

export function RnSheetProbe({ label }: { label: string }) {
  return (
    <SafeAreaProvider style={styles.fill}>
      <ProbeBody label={label} />
    </SafeAreaProvider>
  )
}

function ProbeBody({ label }: { label: string }) {
  const insets = useSafeAreaInsets()
  const ref = useRef<ComponentRef<typeof View>>(null)
  const [frame, setFrame] = useState('')
  useEffect(() => {
    console.info(
      `[DuoRN] ${label} insets-now=t${Math.round(insets.top)} l${Math.round(insets.left)} b${Math.round(insets.bottom)} r${Math.round(insets.right)}`,
    )
  }, [insets, label])
  return (
    <View
      ref={ref}
      style={styles.body}
      onLayout={() => {
        ref.current?.measureInWindow((x, y, width, height) => {
          const text = `{${Math.round(x)},${Math.round(y)},${Math.round(width)},${Math.round(height)}}`
          setFrame(text)
          console.info(
            `[DuoRN] ${label} frame=${text} insets=t${Math.round(insets.top)} l${Math.round(insets.left)} b${Math.round(insets.bottom)} r${Math.round(insets.right)}`,
          )
        })
      }}
    >
      <Text accessibilityLabel={`rn ${label}`} style={styles.title}>
        {label}
      </Text>
      <Text style={styles.meta}>{frame}</Text>
    </View>
  )
}

const modalStyles: Record<string, ModalProps['presentationStyle']> = {
  'rn-modal-form': 'formSheet',
  'rn-modal-full': 'fullScreen',
  'rn-modal-over': 'overFullScreen',
  'rn-modal-page': 'pageSheet',
}

export function RnModalHost({ pane }: { pane: string }) {
  const [style, setStyle] = useState<ModalProps['presentationStyle'] | null>(
    null,
  )
  useDuoSpikeCommands(pane, (action) => {
    if (action === 'rn-modal-close') setStyle(null)
    else if (modalStyles[action]) setStyle(modalStyles[action])
  })
  return (
    <Modal
      animationType="slide"
      presentationStyle={style ?? undefined}
      transparent={style === 'overFullScreen'}
      visible={style !== null}
      onRequestClose={() => setStyle(null)}
    >
      <RnSheetProbe label={`modal ${style} from ${pane}`} />
    </Modal>
  )
}

const styles = StyleSheet.create({
  body: {
    backgroundColor: PlatformColor('secondarySystemBackground'),
    flex: 1,
    padding: 16,
  },
  fill: { flex: 1 },
  meta: { color: PlatformColor('secondaryLabel'), fontSize: 13 },
  title: { color: PlatformColor('label'), fontSize: 17, fontWeight: '600' },
})
