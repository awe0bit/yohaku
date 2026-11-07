export const cl = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))

export const ease = (k: number) => k * k * (3 - 2 * k)

export const ease5 = (k: number) => k * k * k * (k * (k * 6 - 15) + 10)

export const rnd = (a: number, b: number) => a + Math.random() * (b - a)
