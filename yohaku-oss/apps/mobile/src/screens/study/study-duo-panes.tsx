import { NativeDuoArrangement, NativeDuoPane } from '@modules/yohaku/duo-shell'
import { Image } from 'expo-image'
import type { ReactNode } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'

import { useOwner } from '@/owner/store'
import { usePalette } from '@/theme/palette'

import { OwnerHero } from './owner-hero'

export function StudyDuoPanes({ children }: { children: ReactNode }) {
  const owner = useOwner()
  const palette = usePalette()

  return (
    <NativeDuoArrangement style={styles.fill}>
      <NativeDuoPane placement="primary" style={styles.pane}>
        <View style={styles.profile}>
          {owner?.avatarUrl ? (
            <Image
              source={{ uri: owner.avatarUrl }}
              style={[styles.avatar, { borderColor: palette.neutral[4] }]}
            />
          ) : null}
          <OwnerHero feature />
        </View>
      </NativeDuoPane>
      <NativeDuoPane placement="secondary" style={styles.pane}>
        <ScrollView
          contentContainerStyle={styles.content}
          contentInsetAdjustmentBehavior="automatic"
          style={styles.fill}
        >
          {children}
        </ScrollView>
      </NativeDuoPane>
    </NativeDuoArrangement>
  )
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  pane: {
    left: 0,
    position: 'absolute',
    top: 0,
  },
  profile: {
    alignItems: 'center',
    flex: 1,
    gap: 16,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  avatar: {
    borderRadius: 50,
    borderWidth: StyleSheet.hairlineWidth,
    height: 100,
    width: 100,
  },
  content: {
    flexGrow: 1,
    gap: 16,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
})
