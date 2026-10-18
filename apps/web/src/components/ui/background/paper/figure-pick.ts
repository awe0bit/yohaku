export const pickFigure = (
  rects: { height: number; top: number }[],
  viewportHeight: number,
) => {
  let index = -1
  let weight = 0
  rects.forEach((r, i) => {
    const t = (viewportHeight - r.top) / (viewportHeight + r.height)
    if (t <= 0 || t >= 1) return
    const w = Math.sin(Math.PI * t) ** 2
    if (w > weight) {
      weight = w
      index = i
    }
  })
  return { index, weight }
}
