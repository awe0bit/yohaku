const MAX_TEXELS = 2_200_000
const MAX_SIDE = 2048

export const textureScale = (w: number, h: number) =>
  Math.min(
    1,
    MAX_SIDE / Math.max(w, h, 1),
    Math.sqrt(MAX_TEXELS / Math.max(w * h, 1)),
  )
