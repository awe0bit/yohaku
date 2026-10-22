import { DuoReadableFrame } from '@/components/navigation/duo/readable'
import { PostsListScreen } from '@/screens/lists/posts-list'

export default function PostsScreen() {
  return (
    <DuoReadableFrame maxWidth={600}>
      <PostsListScreen />
    </DuoReadableFrame>
  )
}
