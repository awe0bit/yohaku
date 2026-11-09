const ARMS = 6

const branches: [at: number, length: number][][] = [
  [],
  [[0.5, 0.34]],
  [
    [0.36, 0.22],
    [0.66, 0.3],
  ],
]

const build = (pairs: [number, number][], hub: boolean) => {
  const path = new Path2D()
  for (let k = 0; k < ARMS; k++) {
    const a = (k / ARMS) * Math.PI * 2
    const ux = Math.cos(a)
    const uy = Math.sin(a)
    path.moveTo(0, 0)
    path.lineTo(ux, uy)
    for (const [at, length] of pairs)
      for (const side of [-1, 1]) {
        const b = a + (side * Math.PI) / 3
        path.moveTo(ux * at, uy * at)
        path.lineTo(
          ux * at + Math.cos(b) * length,
          uy * at + Math.sin(b) * length,
        )
      }
  }
  if (hub) {
    for (let k = 0; k <= ARMS; k++) {
      const a = (k / ARMS) * Math.PI * 2 + Math.PI / 6
      const x = Math.cos(a) * 0.18
      const y = Math.sin(a) * 0.18
      if (k === 0) path.moveTo(x, y)
      else path.lineTo(x, y)
    }
  }
  return path
}

export const CRYSTALS =
  typeof Path2D === 'undefined'
    ? []
    : branches.map((pairs, i) => build(pairs, i === 2))

export const LUMP_POINTS = 7

export const lumpShape = () =>
  Array.from({ length: LUMP_POINTS }, () => 0.6 + Math.random() * 0.55)

export const traceLump = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  spin: number,
  shape: number[],
) => {
  for (const [k, scale] of shape.entries()) {
    const a = (k / shape.length) * Math.PI * 2 + spin
    const px = x + Math.cos(a) * r * scale
    const py = y + Math.sin(a) * r * scale
    if (k === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
}
