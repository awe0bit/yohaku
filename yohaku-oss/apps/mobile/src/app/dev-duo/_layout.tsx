import { DuoTabs } from '@/components/navigation/duo/navigators'

export default function DuoTabsLayout() {
  return (
    <DuoTabs>
      <DuoTabs.Screen
        name="(feed)"
        options={{ systemImage: 'newspaper', title: 'Posts' }}
      />
      <DuoTabs.Screen
        name="(notes)"
        options={{ systemImage: 'pencil.and.scribble', title: 'Notes' }}
      />
      <DuoTabs.Screen
        name="(thinking)"
        options={{ systemImage: 'lightbulb', title: 'Thinking' }}
      />
    </DuoTabs>
  )
}
