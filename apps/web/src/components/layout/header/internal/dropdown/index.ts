import type { FC } from 'react'

import { HomeDropdown } from './HomeDropdown'
import { MoreDropdown } from './MoreDropdown'
import { NotesDropdown } from './NotesDropdown'
import { PostsDropdown } from './PostsDropdown'
import type { DropdownProps } from './shared'
import { TimelineDropdown } from './TimelineDropdown'

export const dropdownTypeMap: Record<string, FC<DropdownProps>> = {
  Home: HomeDropdown,
  Post: PostsDropdown,
  Note: NotesDropdown,
  Timeline: TimelineDropdown,
  More: MoreDropdown,
}
