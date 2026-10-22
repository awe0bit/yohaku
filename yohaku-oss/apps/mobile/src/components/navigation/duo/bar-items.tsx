import type { DuoBarItem } from '@modules/yohaku/duo-shell'
import { createContext, use, useEffect } from 'react'

export type DuoBarMenuActionSpec = {
  group?: string
  id: string
  onPress: () => void
  systemImage?: string
  title: string
}

export type DuoBarItemSpec = {
  id: string
  label: string
  menu?: DuoBarMenuActionSpec[]
  onPress?: () => void
  systemImage: string
}

export const DuoBarItemsContext = createContext<
  ((items: DuoBarItemSpec[]) => void) | null
>(null)

export function useInDuoStack() {
  return use(DuoBarItemsContext) !== null
}

export function useDuoBarItems(items: DuoBarItemSpec[]) {
  const publish = use(DuoBarItemsContext)
  useEffect(() => {
    publish?.(items)
  }, [publish, items])
  useEffect(() => () => publish?.([]), [publish])
}

export function duoBarHandlers(items: DuoBarItemSpec[]) {
  const handlers = new Map<string, () => void>()
  for (const item of items) {
    if (item.onPress) handlers.set(item.id, item.onPress)
    for (const action of item.menu ?? []) handlers.set(action.id, action.onPress)
  }
  return handlers
}

export function nativeDuoBarItems(items: DuoBarItemSpec[]): DuoBarItem[] {
  return items.map((item) => ({
    id: item.id,
    label: item.label,
    menu: (item.menu ?? []).map((action) => ({
      group: action.group,
      id: action.id,
      systemImage: action.systemImage,
      title: action.title,
    })),
    systemImage: item.systemImage,
  }))
}
