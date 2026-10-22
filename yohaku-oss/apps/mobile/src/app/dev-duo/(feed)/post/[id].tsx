import { useLocalSearchParams } from 'expo-router'

import { DuoPostDetail } from '@/screens/dev/duo-shell/post-detail'

export default function DuoPostRoute() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return <DuoPostDetail id={String(id)} />
}
