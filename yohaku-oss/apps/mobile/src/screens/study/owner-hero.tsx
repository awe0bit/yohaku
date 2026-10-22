import { useQuery } from '@tanstack/react-query'
import { Image } from 'expo-image'
import * as Linking from 'expo-linking'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { api } from '@/api/client'
import { AppText, SinkPressable, SlotText } from '@/components/ui'
import { useLocale, useTranslations } from '@/i18n'
import { displaySite } from '@/owner/snapshot'
import { openSocialLink, socialLinks } from '@/owner/social-links'
import { useOwner } from '@/owner/store'
import { fonts } from '@/theme/fonts'
import { usePalette } from '@/theme/palette'

export function OwnerHero({ feature = false }: { feature?: boolean }) {
  const owner = useOwner()

  return (
    <View style={styles.hero}>
      {owner?.name ? (
        <AppText variant="entryTitle">{owner.name}</AppText>
      ) : null}
      {owner?.siteHost ? (
        <AppText style={styles.host} variant="eyebrow">
          {displaySite(owner.siteHost)}
        </AppText>
      ) : null}
      <WritingStats feature={feature} />
      <SocialRow />
    </View>
  )
}

function WritingStats({ feature }: { feature: boolean }) {
  const t = useTranslations('me')
  const locale = useLocale()
  const palette = usePalette()
  const { data } = useQuery({
    queryFn: () => api.siteInfo(),
    queryKey: ['site-info'],
    staleTime: 5 * 60_000,
  })

  const words = data?.totalWordCount
    ? Math.round(data.totalWordCount / (locale === 'en' ? 1000 : 10_000))
    : 0
  const [now] = useState(() => Date.now())
  const days = data?.firstPublishDate
    ? Math.floor((now - new Date(data.firstPublishDate).getTime()) / 86_400_000)
    : 0
  const stats = [
    {
      key: 'posts',
      value: (data?.postCount ?? 0) + (data?.noteCount ?? 0),
      label: t('statPosts'),
    },
    { key: 'words', value: words, label: t('statWordsUnit') },
    { key: 'days', value: days, label: t('statDays') },
  ]
  const textStyle = {
    ...fonts.sans,
    fontSize: 10,
    lineHeight: 14,
    color: palette.neutral[6],
  }
  const valueStyle = feature
    ? {
        ...fonts.sans,
        fontSize: 20,
        lineHeight: 26,
        color: palette.neutral[10],
      }
    : textStyle

  // The row keeps its line whether or not the counts have landed, so the hero
  // never reflows when they do.
  return (
    <View style={feature ? styles.statsFeature : styles.stats}>
      {data
        ? stats.map((stat, index) => (
            <View
              key={stat.key}
              style={feature ? styles.statFeature : styles.stat}
            >
              {index > 0 && !feature ? (
                <AppText color={palette.neutral[5]} style={textStyle}>
                  ·
                </AppText>
              ) : null}
              <SlotText textStyle={valueStyle} value={stat.value} />
              <AppText color={palette.neutral[6]} style={textStyle}>
                {stat.label}
              </AppText>
            </View>
          ))
        : null}
    </View>
  )
}

function SocialRow() {
  const owner = useOwner()
  const palette = usePalette()
  const links = socialLinks(owner?.socialIds)

  if (links.length === 0) return null

  return (
    <View style={styles.socials}>
      {links.map((link) => (
        <SinkPressable
          accessibilityLabel={link.label}
          accessibilityRole="link"
          key={link.type}
          style={styles.social}
          onPress={() => void openSocialLink(link, Linking)}
        >
          <Image
            contentFit="contain"
            source={link.icon}
            style={styles.socialIcon}
            tintColor={palette.neutral[6]}
          />
        </SinkPressable>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: 8,
    paddingBottom: 8,
  },
  host: {
    textTransform: 'uppercase',
  },
  stats: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    minHeight: 14,
  },
  statsFeature: {
    flexDirection: 'row',
    gap: 24,
    minHeight: 48,
    paddingTop: 8,
  },
  stat: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  statFeature: {
    alignItems: 'center',
  },
  socials: {
    flexDirection: 'row',
    gap: 4,
    paddingTop: 2,
  },
  social: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  socialIcon: {
    height: 18,
    width: 18,
  },
})
