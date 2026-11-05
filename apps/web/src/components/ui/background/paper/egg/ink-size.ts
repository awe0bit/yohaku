export interface SourceRect {
  height: number
  sheight: number
  swidth: number
  sx: number
  sy: number
  width: number
}

export const inkScale = (dpr: number) => Math.min(2, Math.max(1, dpr || 1))

export const sourceRect = (
  rootTop: number,
  rootHeight: number,
  viewport: { height: number; width: number },
  scale: number,
): SourceRect => {
  const sy = Math.max(0, -rootTop)
  const sheight = Math.max(1, Math.min(viewport.height, rootHeight - sy))
  return {
    sx: 0,
    sy,
    swidth: viewport.width,
    sheight,
    width: Math.round(viewport.width * scale),
    height: Math.round(sheight * scale),
  }
}
