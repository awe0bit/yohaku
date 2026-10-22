// Matches the ratio a TOC jump scrolls a heading to, so the jumped-to heading
// reads as current.
const READING_LINE = 0.12
const READING_LINE_SLOP = 8
const CHARS_PER_MINUTE = 500

export type ScrollMetrics = {
  contentHeight: number
  viewportHeight: number
  y: number
}

export function activeHeadingIndex(
  offsets: (number | null)[],
  y: number,
  viewportHeight: number,
) {
  const line = y + viewportHeight * READING_LINE + READING_LINE_SLOP
  let active = -1
  offsets.forEach((offset, index) => {
    if (offset !== null && offset <= line) active = index
  })
  return active
}

export function readingProgress({
  contentHeight,
  viewportHeight,
  y,
}: ScrollMetrics) {
  if (contentHeight <= 0) return 0
  const scrollable = contentHeight - viewportHeight
  if (scrollable <= 0) return 1
  return Math.min(1, Math.max(0, y / scrollable))
}

export function estimateReadingMinutes(textLength: number) {
  return Math.max(1, Math.round(textLength / CHARS_PER_MINUTE))
}

export function readingMinutesLeft(totalMinutes: number, progress: number) {
  return Math.max(0, Math.ceil(totalMinutes * (1 - progress)))
}
