export const TAU = Math.PI * 2

export const rnd = (a: number, b: number) => a + Math.random() * (b - a)

export const clamp = (v: number, a: number, b: number) =>
  Math.max(a, Math.min(b, v))

export const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}
