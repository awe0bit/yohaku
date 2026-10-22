import {
  type DuoBarItem,
  type DuoImageSource,
  NativeDuoScreen,
  NativeDuoStack,
  NativeDuoTab,
  NativeDuoTabs,
} from '@modules/yohaku/duo-shell'
import {
  createStandardRouterNavigator,
  type NavigatorContentProps,
  StackRouter,
  TabRouter,
} from 'expo-router'
import {
  appendMissingPlaceholderTabDescriptors,
  appendMissingPlaceholderTabRoutes,
} from 'expo-router/build/standard-navigation/appendMissingPlaceholderTabRoutes'
import { HeaderHeightContext } from 'expo-router/react-navigation'
import { type ReactNode, useCallback, useRef, useState } from 'react'
import { StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  duoBarHandlers,
  DuoBarItemsContext,
  type DuoBarItemSpec,
  nativeDuoBarItems,
} from './bar-items'

type StackOptions = {
  animation?: string
  headerShown?: boolean
  headerTitle?: unknown
  presentation?: string
  sheetAllowedDetents?: number[] | 'fitToContents'
  sheetGrabberVisible?: boolean
  sheetLargestUndimmedDetentIndex?: number | 'all' | 'last' | 'none'
  title?: string
}

type StackEventMap = {
  transitionEnd: { canPreventDefault: false; data: { closing: boolean } }
  transitionStart: { canPreventDefault: false; data: { closing: boolean } }
}

function nativePresentation(presentation: string | undefined) {
  if (!presentation || presentation === 'card') return 'push'
  if (presentation === 'formSheet' || presentation === 'fullScreenModal') {
    return presentation
  }
  return 'modal'
}

function nativeAnimation(animation: string | undefined) {
  return animation === 'fade' || animation === 'none' ? animation : 'default'
}

function screenPresentationProps(options: StackOptions | undefined) {
  const detents = options?.sheetAllowedDetents
  const undimmed = options?.sheetLargestUndimmedDetentIndex
  return {
    animation: nativeAnimation(options?.animation),
    headerShown: options?.headerShown ?? true,
    presentation: nativePresentation(options?.presentation),
    sheetDetents: Array.isArray(detents) ? detents : undefined,
    sheetGrabberVisible: options?.sheetGrabberVisible,
    sheetLargestUndimmedDetentIndex:
      typeof undimmed === 'number' ? undimmed : undefined,
    titleHidden: typeof options?.headerTitle === 'function',
  } as const
}
type TabOptions = {
  icon?: DuoImageSource
  iconRenderingMode?: 'original' | 'template'
  selectedIcon?: DuoImageSource
  selectedSystemImage?: string
  systemImage?: string
  title?: string
}

function DuoScreenSlot({
  children,
  options,
  routeKey,
}: {
  children: ReactNode
  options: StackOptions | undefined
  routeKey: string
}) {
  const insets = useSafeAreaInsets()
  const [barItems, setBarItems] = useState<DuoBarItem[]>([])
  const handlersRef = useRef(new Map<string, () => void>())
  const publish = useCallback((items: DuoBarItemSpec[]) => {
    handlersRef.current = duoBarHandlers(items)
    const next = nativeDuoBarItems(items)
    setBarItems((previous) =>
      JSON.stringify(previous) === JSON.stringify(next) ? previous : next,
    )
  }, [])

  return (
    <NativeDuoScreen
      {...screenPresentationProps(options)}
      barItems={barItems}
      routeKey={routeKey}
      style={StyleSheet.absoluteFill}
      title={options?.title ?? ''}
      onBarItem={(event) => handlersRef.current.get(event.nativeEvent.id)?.()}
    >
      <DuoBarItemsContext value={publish}>
        <HeaderHeightContext value={insets.top}>{children}</HeaderHeightContext>
      </DuoBarItemsContext>
    </NativeDuoScreen>
  )
}

function StackContent({
  actions,
  descriptors,
  emitter,
  state,
}: NavigatorContentProps<StackOptions, StackEventMap>) {
  return (
    <NativeDuoStack
      style={styles.fill}
      onNativePop={(event) => {
        for (let i = 0; i < event.nativeEvent.count; i++) actions.back()
      }}
      onTransition={(event) => {
        const { closing, key, phase } = event.nativeEvent
        emitter.emit({
          data: { closing },
          target: key,
          type: phase === 'start' ? 'transitionStart' : 'transitionEnd',
        })
      }}
    >
      {state.routes.map((route) => {
        const descriptor = descriptors[route.key]
        return (
          <DuoScreenSlot
            key={route.key}
            options={descriptor?.options}
            routeKey={route.key}
          >
            {descriptor?.render()}
          </DuoScreenSlot>
        )
      })}
    </NativeDuoStack>
  )
}

type TabsNavigatorProps = {
  activeTintColor?: string
  inactiveTintColor?: string
}

function TabsContent({
  actions,
  activeTintColor,
  descriptors,
  inactiveTintColor,
  state,
}: NavigatorContentProps<
  TabOptions,
  Record<string, never>,
  TabsNavigatorProps
>) {
  return (
    <NativeDuoTabs
      activeTintColor={activeTintColor}
      inactiveTintColor={inactiveTintColor}
      selectedIndex={state.index}
      style={styles.fill}
      onTabSelect={(event) => {
        const route = state.routes[event.nativeEvent.index]
        if (route) actions.navigate(route.name)
      }}
    >
      {state.routes.map((route) => {
        const descriptor = descriptors[route.key]
        return (
          <NativeDuoTab
            icon={descriptor?.options.icon}
            iconRenderingMode={descriptor?.options.iconRenderingMode}
            key={route.key}
            selectedIcon={descriptor?.options.selectedIcon}
            selectedSystemImage={descriptor?.options.selectedSystemImage}
            style={StyleSheet.absoluteFill}
            title={descriptor?.options.title ?? route.name}
            systemImage={
              descriptor?.options.systemImage ??
              (descriptor?.options.icon ? undefined : 'circle')
            }
          >
            {descriptor?.render()}
          </NativeDuoTab>
        )
      })}
    </NativeDuoTabs>
  )
}

export const DuoStack = createStandardRouterNavigator(StackContent, StackRouter)
export const DuoTabs = createStandardRouterNavigator(TabsContent, TabRouter, {
  processDescriptors: appendMissingPlaceholderTabDescriptors,
  processState: appendMissingPlaceholderTabRoutes,
})

const styles = StyleSheet.create({
  fill: { flex: 1 },
})
