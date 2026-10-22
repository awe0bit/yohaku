import { type DuoArticleLayoutMode, isDuo } from '@modules/yohaku/duo-shell'
import { useState, useSyncExternalStore } from 'react'

import type { ScrollMetrics } from '@/lib/article-reading-position'

export type ReadingStore = {
  get: () => ScrollMetrics
  publish: (metrics: ScrollMetrics) => void
  subscribe: (listener: () => void) => () => void
}

function createReadingStore(): ReadingStore {
  let metrics: ScrollMetrics = { contentHeight: 0, viewportHeight: 0, y: 0 }
  const listeners = new Set<() => void>()
  return {
    get: () => metrics,
    publish: (next) => {
      metrics = next
      for (const listener of listeners) listener()
    },
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

export function useReadingValue<T extends boolean | number | string>(
  store: ReadingStore,
  select: (metrics: ScrollMetrics) => T,
) {
  return useSyncExternalStore(store.subscribe, () => select(store.get()))
}

export function useDuoArticle(
  onScrollMetrics?: (metrics: ScrollMetrics) => void,
) {
  const [reading] = useState(createReadingStore)
  const [layout, setLayout] = useState<DuoArticleLayoutMode>()
  return {
    asideShown: layout !== undefined && layout.mode !== 'single',
    bodyWidth: layout?.bodyWidth,
    columnBleed:
      layout && layout.mode !== 'book'
        ? {
            left: layout.contentLeft - layout.bodyLeft,
            width: layout.bodyWidth,
          }
        : undefined,
    onScrollMetrics: isDuo
      ? (metrics: ScrollMetrics) => {
          onScrollMetrics?.(metrics)
          reading.publish(metrics)
        }
      : onScrollMetrics,
    onLayoutChange: setLayout,
    reading,
  }
}
