import { useSyncExternalStore } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import type { ArticleSummaryMeta } from '@/api/article-meta'
import { AppText, SinkPressable } from '@/components/ui'
import { useTranslations } from '@/i18n'
import {
  activeHeadingIndex,
  readingMinutesLeft,
  readingProgress,
} from '@/lib/article-reading-position'
import {
  emitTocJump,
  subscribeTocOffsets,
  tocHeadingOffset,
} from '@/lib/article-toc'
import type { LexicalHeading } from '@/lib/lexical-headings'
import { usePalette } from '@/theme/palette'

import type { ArticleAsideMode } from './article-duo-frame'
import { type ReadingStore, useReadingValue } from './reading-store'

const FLAT_TOP = 96
const FLAT_BELOW_COVER = 48

export function ArticleAside({
  coverHeight = 0,
  eyebrow,
  headings,
  mode,
  reading,
  summary,
  title,
  totalMinutes,
}: {
  coverHeight?: number
  eyebrow?: string | null
  headings: LexicalHeading[]
  mode: ArticleAsideMode
  reading: ReadingStore
  summary?: ArticleSummaryMeta | null
  title: string
  totalMinutes: number
}) {
  const palette = usePalette()
  const insets = useSafeAreaInsets()
  const tc = useTranslations('common')
  const tn = useTranslations('notice')

  if (mode === 'flat') {
    return (
      <ScrollView
        contentContainerStyle={styles.flat}
        showsVerticalScrollIndicator={false}
        style={[
          styles.flatScroll,
          {
            marginTop: Math.max(
              insets.top + FLAT_TOP,
              coverHeight + FLAT_BELOW_COVER,
            ),
          },
        ]}
      >
        <AppText variant="eyebrow">{tc('toc')}</AppText>
        <TocRail headings={headings} reading={reading} />
        <View style={[styles.rule, { backgroundColor: palette.neutral[4] }]} />
        <ReadingLine reading={reading} totalMinutes={totalMinutes} />
      </ScrollView>
    )
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.book, { paddingTop: insets.top + 40 }]}
      showsVerticalScrollIndicator={false}
    >
      {eyebrow ? (
        <AppText color={palette.accent} variant="eyebrow">
          {eyebrow}
        </AppText>
      ) : null}
      <AppText variant="largeTitle">{title}</AppText>
      <ReadingLine bar reading={reading} totalMinutes={totalMinutes} />
      {headings.length > 0 ? (
        <View style={styles.section}>
          <AppText variant="eyebrow">{tc('toc')}</AppText>
          <TocRail headings={headings} reading={reading} />
        </View>
      ) : null}
      {summary ? (
        <View
          style={[styles.summary, { backgroundColor: palette.surface.paper }]}
        >
          <AppText color={palette.accent} variant="meta">
            {tn('summary')}
          </AppText>
          <AppText variant="secondary">{summary.text}</AppText>
        </View>
      ) : null}
    </ScrollView>
  )
}

function TocRail({
  headings,
  reading,
}: {
  headings: LexicalHeading[]
  reading: ReadingStore
}) {
  const palette = usePalette()
  const active = useSyncExternalStore(
    (listener) => {
      const stopReading = reading.subscribe(listener)
      const stopOffsets = subscribeTocOffsets(listener)
      return () => {
        stopReading()
        stopOffsets()
      }
    },
    () => {
      const metrics = reading.get()
      return activeHeadingIndex(
        headings.map((heading) => tocHeadingOffset(heading.blockId)),
        metrics.y,
        metrics.viewportHeight,
      )
    },
  )
  const minLevel = headings.reduce(
    (lowest, heading) => Math.min(lowest, heading.level),
    6,
  )

  return (
    <View style={styles.rail}>
      {headings.map((heading, index) => {
        const current = index === active
        return (
          <SinkPressable
            accessibilityRole="button"
            key={heading.blockId}
            style={[
              styles.railRow,
              { paddingLeft: (heading.level - minLevel) * 12 },
            ]}
            onPress={() => emitTocJump(heading.blockId)}
          >
            <View
              style={[
                styles.railMark,
                { backgroundColor: current ? palette.accent : 'transparent' },
              ]}
            />
            <AppText
              color={current ? palette.accent : palette.neutral[7]}
              numberOfLines={2}
              style={styles.railText}
              variant="secondary"
            >
              {heading.text}
            </AppText>
          </SinkPressable>
        )
      })}
    </View>
  )
}

function ReadingLine({
  bar = false,
  reading,
  totalMinutes,
}: {
  bar?: boolean
  reading: ReadingStore
  totalMinutes: number
}) {
  const palette = usePalette()
  const t = useTranslations('detail')
  const percent = useReadingValue(reading, (metrics) =>
    Math.round(readingProgress(metrics) * 100),
  )
  const label =
    percent >= 100
      ? t('readFinished')
      : `${t('readPercent', { percent })} · ${t('minutesLeft', {
          count: readingMinutesLeft(totalMinutes, percent / 100),
        })}`

  return (
    <View style={styles.progress}>
      {bar ? (
        <View style={[styles.track, { backgroundColor: palette.neutral[3] }]}>
          <View
            style={[
              styles.fillBar,
              { backgroundColor: palette.accent, width: `${percent}%` },
            ]}
          />
        </View>
      ) : null}
      <AppText variant="meta">{label}</AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  flat: {
    gap: 12,
    paddingBottom: 24,
  },
  flatScroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  book: {
    gap: 16,
    paddingBottom: 40,
    paddingHorizontal: 40,
  },
  section: {
    gap: 10,
    paddingTop: 8,
  },
  rule: {
    height: StyleSheet.hairlineWidth,
  },
  rail: {
    gap: 2,
  },
  railRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    minHeight: 32,
    paddingVertical: 4,
  },
  railMark: {
    alignSelf: 'stretch',
    borderRadius: 1,
    width: 2,
  },
  railText: {
    flex: 1,
  },
  progress: {
    gap: 8,
  },
  track: {
    borderRadius: 2,
    height: 3,
    overflow: 'hidden',
  },
  fillBar: {
    height: 3,
  },
  summary: {
    borderRadius: 14,
    borderCurve: 'continuous',
    gap: 6,
    padding: 14,
  },
})
