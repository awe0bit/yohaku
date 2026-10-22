import { and, eq } from 'drizzle-orm'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ScrollView, type ScrollViewInstance, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { AppText } from '@/components/ui'
import { db } from '@/db'
import { posts } from '@/db/schema'
import { useLocale } from '@/i18n'
import { extractHeadings } from '@/lib/lexical-headings'
import { siteHref } from '@/lib/site-url'
import { markdownArticle } from '@/rich/markdown/parse'
import { ArticleBody } from '@/screens/details/article-body'
import { usePalette } from '@/theme/palette'

const BODY_MAX = 560
const TOC_WIDTH = 170
const TOC_GAP = 40
const SIDE_PADDING = 20

export function DuoPostDetail({ id }: { id: string }) {
  const locale = useLocale()
  useEffect(() => {
    console.info(`[DuoShellJS] mount ${`detail:${id}`}`)
    return () => console.info(`[DuoShellJS] unmount ${`detail:${id}`}`)
  }, [id])
  const palette = usePalette()
  const insets = useSafeAreaInsets()
  const scrollRef = useRef<ScrollViewInstance>(null)
  const [width, setWidth] = useState(0)
  const query = useMemo(
    () =>
      db
        .select()
        .from(posts)
        .where(and(eq(posts.id, id), eq(posts.lang, locale)))
        .limit(1),
    [id, locale],
  )
  const { data } = useLiveQuery(query, [id, locale])
  const post = data?.[0]
  const body =
    post?.contentFormat === 'lexical' && post.content ? post.content : null
  const markdown = useMemo(
    () =>
      post?.contentFormat === 'markdown' && post.text
        ? markdownArticle(post.text)
        : null,
    [post?.contentFormat, post?.text],
  )
  const headings = useMemo(
    () => markdown?.headings ?? extractHeadings(body ?? ''),
    [body, markdown],
  )

  const safeWidth = Math.max(0, width - insets.left - insets.right)
  const bodyWidth = Math.min(BODY_MAX, safeWidth - SIDE_PADDING * 2)
  const showToc =
    headings.length > 0 &&
    safeWidth >= bodyWidth + TOC_GAP + TOC_WIDTH + SIDE_PADDING * 2
  const groupWidth = bodyWidth + (showToc ? TOC_GAP + TOC_WIDTH : 0)
  const groupLeft = insets.left + (safeWidth - groupWidth) / 2

  return (
    <View
      style={[styles.screen, { backgroundColor: palette.surface.desk }]}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      {width > 0 && post ? (
        <>
          <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            ref={scrollRef}
            contentContainerStyle={[
              styles.content,
              { paddingLeft: groupLeft, width: groupLeft + bodyWidth },
            ]}
          >
            <AppText color={palette.accent} variant="eyebrow">
              {post.categoryName ?? ''}
            </AppText>
            <AppText variant="largeTitle">{post.title}</AppText>
            <ArticleBody
              content={body ?? ''}
              enrichments={post.enrichments ?? null}
              markdown={markdown}
              refId={post.id}
              refType="post"
              scrollRef={scrollRef}
              variant="article"
              webUrl={siteHref(`/posts/${post.categorySlug}/${post.slug}`)}
            />
          </ScrollView>
          {showToc ? (
            <View
              pointerEvents="none"
              style={[
                styles.toc,
                {
                  left: groupLeft + bodyWidth + TOC_GAP,
                  top: insets.top + 64,
                },
              ]}
            >
              <AppText variant="eyebrow">TOC</AppText>
              {headings.slice(0, 14).map((heading, index) => (
                <AppText
                  key={`${index}-${heading.text}`}
                  numberOfLines={2}
                  style={{ paddingLeft: (heading.level - 1) * 10 }}
                  variant="secondary"
                >
                  {heading.text}
                </AppText>
              ))}
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  content: { gap: 12, paddingBottom: 48, paddingTop: 16 },
  screen: { flex: 1 },
  toc: { gap: 10, position: 'absolute', width: TOC_WIDTH },
})
