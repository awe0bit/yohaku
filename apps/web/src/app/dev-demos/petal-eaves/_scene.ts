export interface Eave {
  bottom: number
  left: number
  right: number
  top: number
}

export interface SceneStep {
  bottom: number
  density: number
  dt: number
  eaves: Eave[]
  top: number
  width: number
  wind: number
}

export interface Scene {
  draw: (
    ctx: CanvasRenderingContext2D,
    eaves: Eave[],
    offsetY: number,
    dark: boolean,
  ) => void
  step: (step: SceneStep) => void
}

export type Season = 'spring' | 'summer' | 'autumn' | 'winter'

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const ease = (t: number) => 1 - (1 - t) ** 3

export const insideBlock = (eaves: Eave[], x: number, y: number) =>
  eaves.some((e) => x > e.left && x < e.right && y > e.top && y < e.bottom)

export const pushOutOfSides = (
  eaves: Eave[],
  body: { vx: number; x: number; y: number },
  margin: number,
) => {
  for (const e of eaves) {
    if (body.y <= e.top || body.y >= e.bottom) continue
    if (body.x <= e.left - margin || body.x >= e.right + margin) continue
    const toLeft = body.x - (e.left - margin)
    const toRight = e.right + margin - body.x
    body.x = toLeft < toRight ? e.left - margin : e.right + margin
    body.vx = (toLeft < toRight ? -1 : 1) * Math.abs(body.vx) * 0.4
    return
  }
}
