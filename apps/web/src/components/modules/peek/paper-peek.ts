export const LOOSE_POSE = { rotate: -0.7, x: 28, y: 52 }
export const SET_DOWN_POSE = { rotate: -1.6, x: 30, y: 82 }

const TOP = 64
const BOTTOM_GAP = 32
const MIN_HEIGHT = 320

export function loosePeekFrame(
  column: { left: number; width: number },
  viewport: { height: number },
) {
  return {
    height: Math.max(
      MIN_HEIGHT,
      viewport.height - TOP - LOOSE_POSE.y - BOTTOM_GAP,
    ),
    left: column.left,
    top: TOP,
    width: column.width,
  }
}
