import { DuoReadableFrame } from '@/components/navigation/duo/readable'
import { ThinkingListScreen } from '@/screens/lists/thinking-list'

export default function ThinkingScreen() {
  return (
    <DuoReadableFrame maxWidth={600}>
      <ThinkingListScreen />
    </DuoReadableFrame>
  )
}
