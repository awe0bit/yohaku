export interface Drop {
  q: number
  t0: number
  x: number
  y: number
}

export interface Splat {
  r: number
  vx: number
  vy: number
  x: number
  y: number
}

export interface Fluid {
  cs: number
  DIV: Float32Array
  DX: Float32Array
  DY: Float32Array
  flow: Uint8Array
  gx: number
  gy: number
  h: number
  P: Float32Array
  splats: Splat[]
  U: Float32Array
  U0: Float32Array
  V: Float32Array
  V0: Float32Array
  vel: Uint8Array
  w: number
}

const V_MAX = 1500
const V_CLAMP = 1400
const JACOBI = 18
const DAMPING = 0.55
const DROP_LIFE_S = 0.9
const DROP_TAU_S = 0.28
const DISPLACE_MAX = 58
const DISPLACE_RANGE = 120

export const createFluid = (w: number, h: number, gx = 96): Fluid => {
  const gy = Math.max(16, Math.round((gx * h) / w))
  const n = gx * gy
  const field = () => new Float32Array(n)
  return {
    w,
    h,
    gx,
    gy,
    cs: w / gx,
    U: field(),
    V: field(),
    U0: field(),
    V0: field(),
    P: field(),
    DIV: field(),
    DX: field(),
    DY: field(),
    splats: [],
    vel: new Uint8Array(n * 4),
    flow: new Uint8Array(n * 4),
  }
}

export const addSplat = (f: Fluid, s: Splat) => {
  f.splats.push(s)
}

export const sampleField = (
  f: Fluid,
  F: Float32Array,
  x: number,
  y: number,
) => {
  const gx = Math.min(f.gx - 1.001, Math.max(0, x / f.cs - 0.5))
  const gy = Math.min(f.gy - 1.001, Math.max(0, y / f.cs - 0.5))
  const i = gx | 0
  const j = gy | 0
  const fx = gx - i
  const fy = gy - j
  const k = i + j * f.gx
  return (
    (F[k] * (1 - fx) + F[k + 1] * fx) * (1 - fy) +
    (F[k + f.gx] * (1 - fx) + F[k + f.gx + 1] * fx) * fy
  )
}

export const dropVelocity = (
  drops: Drop[],
  x: number,
  y: number,
  now: number,
): [number, number] => {
  let vx = 0
  let vy = 0
  for (const d of drops) {
    const age = (now - d.t0) / 1000
    if (age > DROP_LIFE_S) continue
    const q = d.q * Math.exp(-age / DROP_TAU_S)
    const dx = x - d.x
    const dy = y - d.y
    const k = q / (2 * Math.PI * Math.max(dx * dx + dy * dy, 144))
    vx += dx * k
    vy += dy * k
  }
  return [vx, vy]
}

export const liveDrops = (drops: Drop[], now: number) =>
  drops.filter((d) => now - d.t0 < DROP_LIFE_S * 1000)

const applySplats = (f: Fluid, stir: number) => {
  const { gx, gy, cs, U, V } = f
  for (const s of f.splats) {
    const r2 = s.r * s.r
    const i0 = Math.max(0, Math.floor((s.x - 2 * s.r) / cs))
    const i1 = Math.min(gx - 1, Math.ceil((s.x + 2 * s.r) / cs))
    const j0 = Math.max(0, Math.floor((s.y - 2 * s.r) / cs))
    const j1 = Math.min(gy - 1, Math.ceil((s.y + 2 * s.r) / cs))
    for (let j = j0; j <= j1; j++)
      for (let i = i0; i <= i1; i++) {
        const dx = (i + 0.5) * cs - s.x
        const dy = (j + 0.5) * cs - s.y
        const w = Math.exp(-(dx * dx + dy * dy) / r2) * 0.4 * stir
        U[i + j * gx] += s.vx * w
        V[i + j * gx] += s.vy * w
      }
  }
  f.splats.length = 0
}

const applyAmbient = (f: Fluid, dt: number, now: number, ambient: number) => {
  const t = now / 1000
  for (let j = 0; j < f.gy; j++)
    for (let i = 0; i < f.gx; i++) {
      const k = i + j * f.gx
      f.U[k] +=
        Math.sin(j * 0.21 + t * 0.13) *
        Math.cos(i * 0.07 - t * 0.09) *
        ambient *
        dt
      f.V[k] +=
        Math.cos(i * 0.19 - t * 0.11) *
        Math.sin(j * 0.09 + t * 0.07) *
        ambient *
        dt
    }
}

const advectVelocity = (f: Fluid, dt: number) => {
  const { gx, gy, cs, U, V, U0, V0 } = f
  U0.set(U)
  V0.set(V)
  for (let j = 0; j < gy; j++)
    for (let i = 0; i < gx; i++) {
      const k = i + j * gx
      const x = (i + 0.5) * cs - dt * U0[k]
      const y = (j + 0.5) * cs - dt * V0[k]
      U[k] = sampleField(f, U0, x, y)
      V[k] = sampleField(f, V0, x, y)
    }
}

const project = (f: Fluid, dt: number) => {
  const { gx, gy, cs, U, V, P, DIV } = f
  for (let j = 1; j < gy - 1; j++)
    for (let i = 1; i < gx - 1; i++) {
      const k = i + j * gx
      DIV[k] = (U[k + 1] - U[k - 1] + V[k + gx] - V[k - gx]) / (2 * cs)
      P[k] = 0
    }
  for (let it = 0; it < JACOBI; it++)
    for (let j = 1; j < gy - 1; j++)
      for (let i = 1; i < gx - 1; i++) {
        const k = i + j * gx
        P[k] =
          (P[k - 1] + P[k + 1] + P[k - gx] + P[k + gx] - DIV[k] * cs * cs) / 4
      }
  const damp = Math.exp(-dt * DAMPING)
  for (let j = 1; j < gy - 1; j++)
    for (let i = 1; i < gx - 1; i++) {
      const k = i + j * gx
      const u = (U[k] - (P[k + 1] - P[k - 1]) / (2 * cs)) * damp
      const v = (V[k] - (P[k + gx] - P[k - gx]) / (2 * cs)) * damp
      U[k] = Math.max(-V_CLAMP, Math.min(V_CLAMP, u))
      V[k] = Math.max(-V_CLAMP, Math.min(V_CLAMP, v))
    }
}

const clearBorder = (f: Fluid) => {
  const { gx, gy, U, V } = f
  for (let i = 0; i < gx; i++) {
    const b = i + (gy - 1) * gx
    U[i] = V[i] = U[b] = V[b] = 0
  }
  for (let j = 0; j < gy; j++) {
    const l = j * gx
    const r = gx - 1 + j * gx
    U[l] = V[l] = U[r] = V[r] = 0
  }
}

export const stepFluid = (
  f: Fluid,
  dt: number,
  now: number,
  ambient: number,
  stir = 1,
) => {
  applySplats(f, stir)
  if (ambient > 0) applyAmbient(f, dt, now, ambient)
  advectVelocity(f, dt)
  project(f, dt)
  clearBorder(f)
}

export const encodeVelocity = (v: number) => {
  const e = Math.sign(v) * Math.sqrt(Math.min(1, Math.abs(v) / V_MAX))
  return Math.round(128 + e * 127)
}

export const decodeVelocity = (byte: number) => {
  const e = (byte - 128) / 127
  return Math.sign(e) * e * e * V_MAX
}

export const velocityBytes = (f: Fluid) => {
  const { gx, gy, U, V, vel } = f
  for (let j = 0; j < gy; j++)
    for (let i = 0; i < gx; i++) {
      const k = i + j * gx
      const o = (i + (gy - 1 - j) * gx) * 4
      vel[o] = encodeVelocity(U[k])
      vel[o + 1] = encodeVelocity(-V[k])
      vel[o + 3] = 255
    }
  return vel
}

export const stepDisplacement = (
  f: Fluid,
  dt: number,
  now: number,
  settle: boolean,
  drops: Drop[],
  drift = 1,
) => {
  const { gx, gy, cs, U, V, DX, DY } = f
  const back = Math.exp(-dt * (settle ? 4 : 0.32))
  const live = liveDrops(drops, now)
  for (let j = 0; j < gy; j++)
    for (let i = 0; i < gx; i++) {
      const k = i + j * gx
      const [dvx, dvy] = live.length
        ? dropVelocity(live, (i + 0.5) * cs, (j + 0.5) * cs, now)
        : [0, 0]
      const dx = (DX[k] + (U[k] * 0.16 + dvx * 0.5) * drift * dt) * back
      const dy = (DY[k] + (V[k] * 0.16 + dvy * 0.5) * drift * dt) * back
      DX[k] = Math.max(-DISPLACE_MAX, Math.min(DISPLACE_MAX, dx))
      DY[k] = Math.max(-DISPLACE_MAX, Math.min(DISPLACE_MAX, dy))
    }
}

const toByte = (d: number) =>
  Math.round(Math.min(1, Math.max(0, d / DISPLACE_RANGE + 0.5)) * 255)

export const flowBytes = (f: Fluid) => {
  const { DX, DY, flow } = f
  for (let k = 0; k < DX.length; k++) {
    flow[k * 4] = toByte(DX[k])
    flow[k * 4 + 1] = toByte(DY[k])
    flow[k * 4 + 3] = 255
  }
  return flow
}
