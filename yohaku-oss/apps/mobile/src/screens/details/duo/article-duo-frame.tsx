import {
  type DuoArticleLayoutMode,
  isDuo,
  NativeDuoArticleFrame,
  NativeDuoArticleSlot,
} from '@modules/yohaku/duo-shell'
import { type ReactNode, useState } from 'react'
import { type StyleProp, StyleSheet, type ViewStyle } from 'react-native'

import { duoArticleColumn } from '@/components/navigation/duo/readable'
import { ReadingColumnContext } from '@/rich/reading-column'

export type ArticleAsideMode = 'book' | 'flat'

export function ArticleDuoFrame({
  aside,
  asideAvailable,
  children,
  onLayoutChange,
}: {
  aside: (mode: ArticleAsideMode) => ReactNode
  asideAvailable: boolean
  children: (column: StyleProp<ViewStyle>) => ReactNode
  onLayoutChange?: (layout: DuoArticleLayoutMode) => void
}) {
  const [layout, setLayout] = useState<DuoArticleLayoutMode>()
  if (!isDuo) return children(null)

  const mode = layout?.mode ?? 'single'
  const column =
    layout && layout.mode !== 'book'
      ? {
          alignSelf: 'flex-start' as const,
          marginLeft: layout.contentLeft,
          width: layout.contentWidth,
        }
      : duoArticleColumn

  return (
    <NativeDuoArticleFrame
      asideAvailable={asideAvailable}
      style={styles.fill}
      onLayoutMode={(event) => {
        setLayout(event.nativeEvent)
        onLayoutChange?.(event.nativeEvent)
      }}
    >
      <NativeDuoArticleSlot
        style={[
          styles.slot,
          layout
            ? { left: layout.bodyLeft, width: layout.bodyWidth }
            : styles.slotFill,
        ]}
      >
        <ReadingColumnContext value={layout?.contentWidth ?? null}>
          {children(column)}
        </ReadingColumnContext>
      </NativeDuoArticleSlot>
      <NativeDuoArticleSlot
        crossfades
        pointerEvents="box-none"
        style={[
          styles.slot,
          { left: layout?.asideLeft ?? 0, width: layout?.asideWidth ?? 0 },
        ]}
      >
        {mode === 'single' ? null : aside(mode)}
      </NativeDuoArticleSlot>
    </NativeDuoArticleFrame>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  slot: { bottom: 0, position: 'absolute', top: 0 },
  slotFill: { left: 0, right: 0 },
})
