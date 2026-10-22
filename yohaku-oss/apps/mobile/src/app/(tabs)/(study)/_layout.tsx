import { isDuo } from '@modules/yohaku/duo-shell'
import { Stack } from 'expo-router'

import { DuoStack } from '@/components/navigation/duo/navigators'
import { getStackScreenOptions } from '@/components/navigation/stack-screen-options'
import { usePalette } from '@/theme/palette'

export default function StudyLayout() {
  const palette = usePalette()
  return isDuo ? (
    <DuoStack />
  ) : (
    <Stack screenOptions={getStackScreenOptions(palette.surface.desk)} />
  )
}
