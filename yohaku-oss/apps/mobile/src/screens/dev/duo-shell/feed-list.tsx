import { desc, eq } from 'drizzle-orm'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { type Href, useRouter } from 'expo-router'
import { useEffect, useMemo } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'

import { DuoReadable } from '@/components/navigation/duo/readable'
import { AppText } from '@/components/ui'
import { db } from '@/db'
import { posts } from '@/db/schema'
import { useLocale } from '@/i18n'
import { formatRelativeTime } from '@/lib/datetime'
import { usePalette } from '@/theme/palette'

export function DuoFeedList({ heading }: { heading: string }) {
  const locale = useLocale()
  useEffect(() => {
    console.info(`[DuoShellJS] mount ${`list:${heading}`}`)
    return () => console.info(`[DuoShellJS] unmount ${`list:${heading}`}`)
  }, [heading])
  const router = useRouter()
  const palette = usePalette()
  const query = useMemo(
    () =>
      db
        .select({
          categoryName: posts.categoryName,
          createdAt: posts.createdAt,
          id: posts.id,
          title: posts.title,
        })
        .from(posts)
        .where(eq(posts.lang, locale))
        .orderBy(desc(posts.createdAt))
        .limit(40),
    [locale],
  )
  const { data } = useLiveQuery(query, [locale])
  return (
    <View style={[styles.screen, { backgroundColor: palette.surface.desk }]}>
      <DuoReadable maxWidth={600}>
        <ScrollView
          contentContainerStyle={styles.content}
          contentInsetAdjustmentBehavior="automatic"
        >
          <AppText variant="largeTitle">{heading}</AppText>
          {(data ?? []).map((post) => (
            <Pressable
              key={post.id}
              style={[styles.row, { borderBottomColor: palette.neutral[3] }]}
              onPress={() => router.push(`/dev-duo/post/${post.id}` as Href)}
            >
              <AppText variant="entryTitleSans">{post.title}</AppText>
              <AppText variant="meta">
                {formatRelativeTime(post.createdAt, locale)}
                {post.categoryName ? ` · ${post.categoryName}` : ''}
              </AppText>
            </Pressable>
          ))}
        </ScrollView>
      </DuoReadable>
    </View>
  )
}

const styles = StyleSheet.create({
  content: { gap: 14, paddingHorizontal: 20, paddingVertical: 16 },
  row: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 6,
    paddingBottom: 14,
  },
  screen: { flex: 1 },
})
