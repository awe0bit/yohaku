import { useRouter } from 'expo-router'
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native'

import type { ArticleAiGenValue } from '@/api/article-meta'
import { AppText, NativePressable } from '@/components/ui'
import { usePalette } from '@/theme/palette'

import { ArticleMetaLine } from './article-meta-line'

export function PostDetailHeader({
  aiGen,
  categoryName,
  categorySlug,
  metaParts,
  onLayout,
  tags,
  title,
}: {
  aiGen?: ArticleAiGenValue[] | null
  categoryName: string | null
  categorySlug: string | null
  metaParts: (string | null | undefined)[]
  onLayout: (event: LayoutChangeEvent) => void
  tags: string[]
  title: string
}) {
  const palette = usePalette()
  const router = useRouter()

  return (
    <View style={styles.header} onLayout={onLayout}>
      {categoryName && categorySlug ? (
        <NativePressable
          accessibilityRole="link"
          onPress={() =>
            router.push({
              pathname: '/categories/[slug]',
              params: { slug: categorySlug },
            })
          }
        >
          <AppText color={palette.accent} variant="eyebrow">
            {categoryName}
          </AppText>
        </NativePressable>
      ) : categoryName ? (
        <AppText variant="eyebrow">{categoryName}</AppText>
      ) : null}
      <AppText variant="largeTitleSans">{title}</AppText>
      <ArticleMetaLine aiGen={aiGen} parts={metaParts} />
      {tags.length > 0 ? (
        <View style={styles.tags}>
          {tags.map((tag) => (
            <NativePressable
              accessibilityRole="link"
              key={tag}
              style={[
                styles.tag,
                {
                  backgroundColor: palette.surface.paper,
                  borderColor: `${palette.neutral[10]}0f`,
                },
              ]}
              onPress={() =>
                router.push({
                  pathname: '/posts/tag/[name]',
                  params: { name: tag },
                })
              }
            >
              <AppText color={palette.accent} variant="meta">
                #{tag}
              </AppText>
            </NativePressable>
          ))}
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    gap: 8,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
  },
})
