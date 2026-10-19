import type { AggregateTop } from '@mx-space/api-client'

import { buildNotePath } from '~/lib/note-route'

export const DROPDOWN_INDEX_ROWS = 5

export const fillPlaceholderRows = <T>(
  items: readonly T[] | null | undefined,
  count: number,
): (T | null)[] =>
  Array.from({ length: count }, (_, index) => items?.[index] ?? null)

export interface TimelineEntry {
  createdAt: string
  href: string
  id: string
  title: string
  type: 'post' | 'note'
}

export function mergeAndSortTopEntries(
  topData: AggregateTop | null | undefined,
): TimelineEntry[] {
  if (!topData) return []
  const entries: TimelineEntry[] = []

  for (const post of topData.posts ?? []) {
    entries.push({
      id: post.id,
      title: post.title,
      createdAt: post.createdAt,
      href: `/posts/${post.category.slug}/${post.slug}`,
      type: 'post',
    })
  }
  for (const note of topData.notes ?? []) {
    entries.push({
      id: note.id,
      title: note.title,
      createdAt: note.createdAt,
      href: buildNotePath(note),
      type: 'note',
    })
  }

  entries.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
  return entries.slice(0, DROPDOWN_INDEX_ROWS)
}
