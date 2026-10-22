import { type ReactNode, useEffect, useState } from 'react'
import {
  PlatformColor,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const mounts = new Map<string, number>()

export function useMountCount(key: string) {
  const [count] = useState(() => {
    const next = (mounts.get(key) ?? 0) + 1
    mounts.set(key, next)
    return next
  })
  return count
}

export function SpikeScroll({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      style={styles.scroll}
    >
      {children}
    </ScrollView>
  )
}

export function Probe({
  label,
  mounts: mountCount,
}: {
  label: string
  mounts: number
}) {
  const insets = useSafeAreaInsets()
  const { height, width } = useWindowDimensions()
  const [pane, setPane] = useState({ height: 0, width: 0 })
  useEffect(() => {
    console.info(
      `[DuoRN] probe ${label} safe=t${Math.round(insets.top)} l${Math.round(insets.left)} b${Math.round(insets.bottom)} r${Math.round(insets.right)} window=${Math.round(width)}x${Math.round(height)} pane=${pane.width}x${pane.height}`,
    )
  }, [height, insets, label, pane, width])
  return (
    <View
      style={styles.probe}
      onLayout={(event) => {
        const { height: h, width: w } = event.nativeEvent.layout
        setPane({ height: Math.round(h), width: Math.round(w) })
      }}
    >
      <Text style={styles.title}>{label}</Text>
      <Text style={styles.meta}>mounts: {mountCount}</Text>
      <Text style={styles.meta}>
        safe t{Math.round(insets.top)} l{Math.round(insets.left)} b
        {Math.round(insets.bottom)} r{Math.round(insets.right)}
      </Text>
      <Text style={styles.meta}>
        window {Math.round(width)}×{Math.round(height)} · probe {pane.width}×
        {pane.height}
      </Text>
    </View>
  )
}

export function SpikeButton({
  onPress,
  title,
}: {
  onPress: () => void
  title: string
}) {
  return (
    <Pressable style={styles.button} onPress={onPress}>
      <Text style={styles.buttonText}>{title}</Text>
    </Pressable>
  )
}

export const spikeStyles = StyleSheet.create({
  headerItem: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  headerItemText: { color: PlatformColor('label'), fontSize: 18 },
  input: {
    borderColor: PlatformColor('separator'),
    borderCurve: 'continuous',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    color: PlatformColor('label'),
    height: 44,
    paddingHorizontal: 12,
  },
})

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: PlatformColor('secondarySystemFill'),
    borderCurve: 'continuous',
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
  },
  buttonText: {
    color: PlatformColor('label'),
    fontSize: 16,
    fontWeight: '600',
  },
  content: { gap: 12, padding: 16 },
  meta: {
    color: PlatformColor('secondaryLabel'),
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  probe: { gap: 4 },
  scroll: { backgroundColor: PlatformColor('systemBackground'), flex: 1 },
  title: { color: PlatformColor('label'), fontSize: 20, fontWeight: '700' },
})
