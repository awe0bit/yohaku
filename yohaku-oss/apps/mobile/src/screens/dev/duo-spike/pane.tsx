import { dismissDuoSpike, pushDuoSpikeOuter } from '@modules/yohaku/duo-spike'
import { type ComponentProps, useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import {
  ScreenStack,
  ScreenStackHeaderRightView,
  ScreenStackItem,
} from 'react-native-screens'

import {
  Probe,
  SpikeButton,
  SpikeScroll,
  spikeStyles,
  useMountCount,
} from './probe'
import { RnModalHost, RnSheetProbe, useDuoSpikeCommands } from './rn-lab'

type ItemProps = Partial<ComponentProps<typeof ScreenStackItem>>

const sheets = {
  fullScreenModal: { stackPresentation: 'fullScreenModal' },
  formSheet: { stackPresentation: 'formSheet' },
  formSheetDetents: {
    sheetAllowedDetents: [0.55, 0.95],
    sheetGrabberVisible: true,
    stackPresentation: 'formSheet',
  },
  modal: { stackPresentation: 'modal' },
  pageSheet: { stackPresentation: 'pageSheet' },
  transparentModal: { stackPresentation: 'transparentModal' },
} satisfies Record<string, ItemProps>

type SheetKind = keyof typeof sheets

const sheetCommands: Record<string, SheetKind> = {
  'rn-sheet-form': 'formSheet',
  'rn-sheet-form-detents': 'formSheetDetents',
  'rn-sheet-full': 'fullScreenModal',
  'rn-sheet-modal': 'modal',
  'rn-sheet-page': 'pageSheet',
  'rn-sheet-transparent': 'transparentModal',
}

type PaneRoute =
  | { depth: number; key: string; kind: 'detail' }
  | { key: string; kind: 'root' }
  | { key: string; kind: 'sheet'; sheet: SheetKind }

let nextKey = 0
const makeKey = () => `route-${++nextKey}`

export function DuoSpikePane({ pane }: { pane: string }) {
  const [routes, setRoutes] = useState<PaneRoute[]>(() => [
    { key: makeKey(), kind: 'root' },
  ])
  const pushDetail = (depth: number) =>
    setRoutes((current) => [
      ...current,
      { depth, key: makeKey(), kind: 'detail' },
    ])
  const removeFrom = (key: string) =>
    setRoutes((current) => {
      const index = current.findIndex((route) => route.key === key)
      return index > 0 ? current.slice(0, index) : current
    })
  useDuoSpikeCommands(pane, (action) => {
    if (action === 'rn-back') setRoutes((current) => current.slice(0, -1))
    const sheet = sheetCommands[action]
    if (sheet)
      setRoutes((current) => [
        ...current,
        { key: makeKey(), kind: 'sheet', sheet },
      ])
  })
  return (
    <SafeAreaProvider>
      <ScreenStack style={styles.fill}>
        {routes.map((route) => (
          <ScreenStackItem
            key={route.key}
            screenId={route.key}
            onDismissed={() => removeFrom(route.key)}
            {...itemProps(route, pane)}
          >
            {route.kind === 'root' ? (
              <RootScreen pane={pane} push={pushDetail} />
            ) : route.kind === 'detail' ? (
              <DetailScreen
                depth={route.depth}
                pane={pane}
                push={pushDetail}
                routeKey={route.key}
              />
            ) : (
              <RnSheetProbe label={`${route.sheet} from ${pane}`} />
            )}
          </ScreenStackItem>
        ))}
      </ScreenStack>
      <RnModalHost pane={pane} />
    </SafeAreaProvider>
  )
}

function itemProps(route: PaneRoute, pane: string): ItemProps {
  if (route.kind === 'sheet')
    return { ...sheets[route.sheet], headerConfig: { hidden: true } }
  if (route.kind === 'root') return { headerConfig: { title: `${pane} root` } }
  const title = `${pane} · ${route.depth}`
  if (route.depth % 2 === 0) {
    return {
      headerConfig: {
        headerRightBarButtonItems: [
          {
            accessibilityLabel: `${pane} star item`,
            icon: { name: 'star', type: 'sfSymbol' },
            onPress: () => {},
            type: 'button',
          },
        ],
        title,
      },
    }
  }
  return {
    headerConfig: {
      children: (
        <ScreenStackHeaderRightView>
          <Pressable
            accessibilityLabel={`${pane} star view`}
            style={spikeStyles.headerItem}
          >
            <Text style={spikeStyles.headerItemText}>★</Text>
          </Pressable>
        </ScreenStackHeaderRightView>
      ),
      title,
    },
  }
}

function RootScreen({
  pane,
  push,
}: {
  pane: string
  push: (depth: number) => void
}) {
  const mountsSoFar = useMountCount(`${pane}:root`)
  const [count, setCount] = useState(3)
  const [text, setText] = useState(`typed in ${pane}`)
  useEffect(() => {
    const timer = setTimeout(() => push(1), 800)
    return () => clearTimeout(timer)
  }, [])
  return (
    <SpikeScroll>
      <Probe label={`${pane} root`} mounts={mountsSoFar} />
      <SpikeButton
        title={`count ${count} (+1)`}
        onPress={() => setCount((n) => n + 1)}
      />
      <TextInput
        placeholder="type to check state survives"
        style={spikeStyles.input}
        value={text}
        onChangeText={setText}
      />
      <SpikeButton title="push in pane" onPress={() => push(1)} />
      <SpikeButton
        title="push outer full page"
        onPress={() => pushDuoSpikeOuter(`outer from ${pane}`)}
      />
      <SpikeButton title="close spike" onPress={dismissDuoSpike} />
    </SpikeScroll>
  )
}

function DetailScreen({
  depth,
  pane,
  push,
  routeKey,
}: {
  depth: number
  pane: string
  push: (depth: number) => void
  routeKey: string
}) {
  const mountsSoFar = useMountCount(`${pane}:detail:${routeKey}`)
  const [count, setCount] = useState(depth * 10)
  useEffect(() => {
    if (depth >= 2) return
    const timer = setTimeout(() => push(depth + 1), 800)
    return () => clearTimeout(timer)
  }, [])
  return (
    <SpikeScroll>
      <Probe label={`${pane} depth ${depth}`} mounts={mountsSoFar} />
      <SpikeButton
        title={`count ${count} (+1)`}
        onPress={() => setCount((n) => n + 1)}
      />
      <SpikeButton title="push deeper" onPress={() => push(depth + 1)} />
      <SpikeButton
        title="push outer full page"
        onPress={() => pushDuoSpikeOuter(`outer from ${pane} ${depth}`)}
      />
    </SpikeScroll>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
})
