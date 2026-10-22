import { type LayoutChangeEvent, StyleSheet, View } from 'react-native'

import type { ArticleAiGenValue } from '@/api/article-meta'
import { AppText } from '@/components/ui'

import { ArticleMetaLine } from './article-meta-line'
import { type ColumnBleed, NoteCoverBleed } from './note-cover-bleed'

export function NoteDetailHeader({
  aiGen,
  columnBleed,
  hasCover,
  headerHeight,
  heroHeight,
  metaParts,
  onLayout,
  sharedHero,
  title,
}: {
  aiGen?: ArticleAiGenValue[] | null
  columnBleed?: ColumnBleed
  hasCover: boolean
  headerHeight: number
  heroHeight: number
  metaParts: (string | null | undefined)[]
  onLayout: (event: LayoutChangeEvent) => void
  sharedHero: boolean
  title: string
}) {
  if (sharedHero) {
    return (
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        style={[
          styles.heroPlaceholder,
          { height: heroHeight },
          hasCover ? { marginTop: -headerHeight } : null,
        ]}
        onLayout={onLayout}
      />
    )
  }
  return (
    <>
      {hasCover ? (
        <NoteCoverBleed columnBleed={columnBleed} headerHeight={headerHeight} />
      ) : null}
      <View style={styles.header} onLayout={onLayout}>
        <AppText variant="largeTitle">{title}</AppText>
        <ArticleMetaLine aiGen={aiGen} parts={metaParts} />
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  heroPlaceholder: {
    marginHorizontal: -20,
  },
  header: {
    gap: 8,
  },
})
