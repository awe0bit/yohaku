import { DuoReadableFrame } from '@/components/navigation/duo/readable'
import { NotesListScreen } from '@/screens/lists/notes-list'

export default function NotesScreen() {
  return (
    <DuoReadableFrame>
      <NotesListScreen />
    </DuoReadableFrame>
  )
}
