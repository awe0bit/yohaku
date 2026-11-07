import type { ElementPlacement } from '../../../layout'
import { clamp, mulberry, n2, smooth } from './math'

interface Tip {
  a: number
  ba: number
  bend: number
  blen: number
  curl: number
  dens: number
  depth: number
  id: number
  len: number
  nb: number
  one: boolean
  parent: number
  s: number
  side: number
  star: boolean
  t: number
  v: number
  w: number
  x: number
  y: number
}

interface StemOptions {
  ba?: number
  blen?: number
  dens?: number
  star?: boolean
}

export interface FrostInput {
  elements: ElementPlacement[]
  h: number
  mask: Uint8ClampedArray
  term: number
  w: number
}

export interface Frost {
  readonly done: boolean
  step: (deadline: number) => void
  take: () => Float32Array
}

export const SEGMENT_FLOATS = 8
const CELL = 2.4
const MAX_STEPS = 3e6
const CHECK_EVERY = 128

export const createFrost = ({
  elements,
  h,
  mask,
  term,
  w,
}: FrostInput): Frost => {
  const rnd = mulberry(20261207 + term * 977 + w * 7 + h * 13)
  const fo = rnd() * 100
  const gw = Math.ceil(w / CELL) + 2
  const gh = Math.ceil(h / CELL) + 2
  const occ = new Int32Array(gw * gh).fill(-1)
  const parentOf: number[] = []
  const heap: Tip[] = []
  let segs = new Float32Array(SEGMENT_FLOATS * 16384)
  let count = 0
  let taken = 0
  let guard = 0

  const emit = (
    ax: number,
    ay: number,
    bx: number,
    by: number,
    w0: number,
    w1: number,
    t0: number,
    t1: number,
  ) => {
    if (count + SEGMENT_FLOATS > segs.length) {
      const grown = new Float32Array(segs.length * 2)
      grown.set(segs)
      segs = grown
    }
    segs[count] = ax
    segs[count + 1] = ay
    segs[count + 2] = bx
    segs[count + 3] = by
    segs[count + 4] = w0
    segs[count + 5] = w1
    segs[count + 6] = t0
    segs[count + 7] = t1
    count += SEGMENT_FLOATS
  }

  const push = (tip: Tip) => {
    heap.push(tip)
    let i = heap.length - 1
    while (i > 0) {
      const p = (i - 1) >> 1
      if (heap[p].t <= heap[i].t) break
      const tmp = heap[p]
      heap[p] = heap[i]
      heap[i] = tmp
      i = p
    }
  }
  const pop = () => {
    const top = heap[0]
    const last = heap.pop()!
    if (heap.length) {
      heap[0] = last
      let i = 0
      for (;;) {
        const l = 2 * i + 1
        const r = l + 1
        let m = i
        if (l < heap.length && heap[l].t < heap[m].t) m = l
        if (r < heap.length && heap[r].t < heap[m].t) m = r
        if (m === i) break
        const tmp = heap[m]
        heap[m] = heap[i]
        heap[i] = tmp
        i = m
      }
    }
    return top
  }

  const warm = elements
    .filter((e) => e.type === 'wintersweet')
    .map((e) => [e.x, e.y, e.size] as const)
  const warmAt = (x: number, y: number) => {
    let k = 0
    for (const [ex, ey, s] of warm) {
      const dx = x - ex
      const dy = y - ey
      const r = s * 2.4
      const q = (dx * dx + dy * dy) / (r * r)
      if (q < 4) k = Math.max(k, Math.exp(-q))
    }
    return k
  }
  const vapor = (x: number, y: number) => {
    const d = Math.min(x, w - x, y, h - y)
    return (
      (0.22 + 0.78 * smooth(420, 30, d)) *
      (0.65 + 0.7 * n2(x * 0.008 + fo, y * 0.008)) *
      (1 - 0.85 * warmAt(x, y))
    )
  }
  const stem = (
    x: number,
    y: number,
    a: number,
    len: number,
    wd: number,
    v: number,
    t: number,
    depth: number,
    parent: number,
    o: StemOptions = {},
  ) => {
    const id = parentOf.length
    parentOf.push(parent)
    const nb = depth === 0 ? (o.star ? 3 : 4 + rnd() * 6) : 1.6 + rnd() * 2.4
    const side = rnd() < 0.5 ? 1 : -1
    const curl = (rnd() - 0.5) * (depth === 0 ? 0.004 : 0.012)
    const bend =
      depth === 0 && !o.star && rnd() < 0.25 ? (rnd() - 0.5) * 0.009 : 0
    const ba = o.star ? Math.PI / 3 : (o.ba ?? 0.82 + 0.5 * rnd())
    const dens = o.dens ?? (o.star ? 1.3 : 0.55 + 1.05 * rnd())
    const blen = o.blen ?? (o.star ? 0.55 : 0.45 + 1.15 * rnd())
    const one = !o.star && depth === 0 && rnd() < 0.22
    push({
      a,
      ba,
      bend,
      blen,
      curl,
      dens,
      depth,
      id,
      len,
      nb,
      one,
      parent,
      s: 0,
      side,
      star: !!o.star,
      t,
      v,
      w: wd,
      x,
      y,
    })
  }
  const W0 = (k: number) => 1.2 + k * rnd()

  const edge = (x: number, y: number, a0: number) => {
    const n = rnd() < 0.18 ? 3 : rnd() < 0.3 ? 2 : 1
    for (let k = 0; k < n; k++) {
      const L = rnd() < 0.1 ? 520 + 300 * rnd() : 140 + 380 * rnd()
      stem(
        x,
        y,
        a0 + (rnd() - 0.5) * (n > 1 ? 2 : 1.4),
        L,
        W0(1.4),
        46 + 36 * rnd(),
        0.1 + 2.2 * rnd(),
        0,
        -1,
      )
    }
  }
  for (let x = rnd() * 50; x < w; x += 40 + rnd() * 130) {
    edge(x, -1, Math.PI / 2)
    edge(x + rnd() * 40, h + 1, -Math.PI / 2)
  }
  for (let y = rnd() * 50; y < h; y += 40 + rnd() * 130) {
    edge(-1, y, 0)
    edge(w + 1, y + rnd() * 40, Math.PI)
  }
  for (const [cx, cy, a0] of [
    [0, 0, 0],
    [w, 0, Math.PI / 2],
    [w, h, Math.PI],
    [0, h, -Math.PI / 2],
  ]) {
    const n = 3 + Math.floor(rnd() * 3)
    for (let k = 0; k < n; k++)
      stem(
        cx,
        cy,
        a0 + 0.15 + (k / (n - 1)) * 1.25 + (rnd() - 0.5) * 0.3,
        260 + 340 * rnd(),
        2 + 0.9 * rnd(),
        60 + 22 * rnd(),
        0.05 + 0.6 * rnd(),
        0,
        -1,
      )
  }

  for (let k = 0; k < 2; k++) {
    const x0 = w * (0.15 + 0.7 * rnd())
    const y0 = h * (0.15 + 0.7 * rnd())
    const a = rnd() * Math.PI
    const L = 140 + 260 * rnd()
    const tt = 1.5 + 3 * rnd()
    const ux = Math.cos(a)
    const uy = Math.sin(a)
    for (let s = 0; s < L; s += 18 + rnd() * 26) {
      const sx = x0 + ux * (s - L / 2)
      const sy = y0 + uy * (s - L / 2)
      if (sx < 0 || sy < 0 || sx > w || sy > h) continue
      for (const sd of [1, -1])
        if (rnd() < 0.8)
          stem(
            sx,
            sy,
            a + sd * (Math.PI / 2 + (rnd() - 0.5) * 0.9),
            40 + 120 * rnd(),
            W0(0.6),
            30 + 14 * rnd(),
            tt + s * 0.01 + rnd() * 0.4,
            0,
            -1,
          )
    }
  }

  for (let k = 0; k < 8; k++) {
    const x = w * (0.08 + 0.84 * rnd())
    const y = h * (0.08 + 0.84 * rnd())
    const t = 0.8 + 4.5 * rnd()
    if (rnd() < 0.4) {
      const a0 = rnd() * Math.PI * 2
      const arm = 45 + 120 * rnd()
      for (let j = 0; j < 6; j++)
        if (rnd() < 0.85)
          stem(
            x,
            y,
            a0 + (j * Math.PI) / 3 + (rnd() - 0.5) * 0.12,
            arm * (0.7 + 0.5 * rnd()),
            1.1 + 0.6 * rnd(),
            34 + 10 * rnd(),
            t + rnd() * 0.2,
            0,
            -1,
            { star: true },
          )
    } else {
      const n = 2 + Math.floor(rnd() * 3)
      for (let j = 0; j < n; j++)
        stem(
          x,
          y,
          rnd() * Math.PI * 2,
          70 + 220 * rnd(),
          W0(0.8),
          34 + 14 * rnd(),
          t + rnd() * 0.5,
          0,
          -1,
        )
    }
  }

  const leafAt = (x: number, y: number) => {
    const ix = Math.round(x)
    const iy = Math.round(y)
    if (ix < 0 || iy < 0 || ix >= w || iy >= h) return 0
    return mask[(iy * w + ix) * 4]
  }
  for (const e of elements) {
    if (e.type.startsWith('maple') || e.type.startsWith('ginkgo')) {
      const n = 3 + Math.floor(rnd() * 4)
      for (let k = 0; k < n; k++) {
        const a = rnd() * Math.PI * 2
        const ux = Math.cos(a)
        const uy = Math.sin(a)
        let r = e.size * 0.9
        while (r > 1 && leafAt(e.x + ux * r, e.y + uy * r) < 100) r -= 0.7
        if (r <= 1) continue
        const L = rnd() < 0.25 ? 200 + 200 * rnd() : 60 + 170 * rnd()
        stem(
          e.x + ux * (r + 1),
          e.y + uy * (r + 1),
          a + (rnd() - 0.5) * 0.9,
          L,
          1.3 + 0.9 * rnd(),
          36 + 22 * rnd(),
          0.9 + 1.8 * rnd(),
          0,
          -1,
        )
      }
    } else if (e.type === 'snow') {
      const arm = 45 + 110 * rnd()
      const t = 0.3 + 0.8 * rnd()
      for (let j = 0; j < 6; j++) {
        const a = e.rotation + (j * Math.PI) / 3
        stem(
          e.x + Math.cos(a) * e.size * 0.45,
          e.y + Math.sin(a) * e.size * 0.45,
          a,
          arm * (0.8 + 0.35 * rnd()),
          1.2 + 0.5 * rnd(),
          32 + 10 * rnd(),
          t + rnd() * 0.15,
          0,
          -1,
          { star: true },
        )
      }
    }
  }

  const advance = (p: Tip) => {
    const d0 = p.depth === 0
    const ds = d0 ? 2.4 : p.depth === 1 ? 1.8 : 1.4
    p.curl = clamp(
      p.curl + (rnd() - 0.5) * (d0 ? 0.0012 : 0.0018),
      d0 ? -0.008 : -0.014,
      d0 ? 0.008 : 0.014,
    )
    if (p.bend && rnd() < 0.004) p.bend = -p.bend
    const flow = n2(p.x * 0.005 + fo, p.y * 0.005 - fo) - 0.5
    p.a +=
      (p.curl + p.bend + (p.star ? 0 : flow * 0.016 * (d0 ? 1 : 0.4))) * ds +
      (rnd() - 0.5) * (d0 ? 0.022 : 0.035)
    const ca = Math.cos(p.a)
    const sa = Math.sin(p.a)
    const nx = p.x + ca * ds
    const ny = p.y + sa * ds
    if (nx < -4 || ny < -4 || nx > w + 4 || ny > h + 4) return
    if (p.s > 3) {
      const gx = Math.floor((p.x + ca * (ds + 1.6)) / CELL) + 1
      const gy = Math.floor((p.y + sa * (ds + 1.6)) / CELL) + 1
      if (gx >= 0 && gy >= 0 && gx < gw && gy < gh) {
        const o = occ[gy * gw + gx]
        if (o !== -1 && o !== p.id && o !== p.parent && parentOf[o] !== p.id)
          return
      }
    }
    if (warm.length && warmAt(nx, ny) > 0.75) return
    const gx = Math.floor(nx / CELL) + 1
    const gy = Math.floor(ny / CELL) + 1
    if (gx >= 0 && gy >= 0 && gx < gw && gy < gh && occ[gy * gw + gx] === -1)
      occ[gy * gw + gx] = p.id
    const fr0 = p.s / p.len
    const fr1 = (p.s + ds) / p.len
    const w0 = p.w * Math.max(0.28, Math.max(0, 1 - fr0) ** 0.6)
    const w1 = p.w * Math.max(0.28, Math.max(0, 1 - fr1) ** 0.6)
    const t1 = p.t + ds / (p.v * Math.max(0.08, vapor(nx, ny)))
    emit(p.x, p.y, nx, ny, w0, w1, p.t, t1)
    p.s += ds
    if (d0 && !p.star && p.s > 30 && p.len - p.s > 60 && rnd() < 0.014)
      stem(
        nx,
        ny,
        p.a + (rnd() < 0.5 ? 1 : -1) * (0.35 + 0.55 * rnd()),
        (p.len - p.s) * (0.45 + 0.5 * rnd()),
        p.w * 0.85,
        p.v * (0.8 + 0.25 * rnd()),
        t1 + 0.05,
        0,
        p.id,
      )
    while (p.depth < 2 && p.s >= p.nb && p.s < p.len - 2) {
      const sides = p.one
        ? [p.side]
        : p.star || (d0 && rnd() < 0.6)
          ? [1, -1]
          : [p.side]
      if (!p.one) p.side = -p.side
      for (const sd of sides) {
        const ang = p.a + sd * (p.ba + (rnd() - 0.5) * (p.star ? 0.08 : 0.3))
        let cl: number
        let sub: StemOptions = {}
        if (d0) {
          const env = Math.sin(Math.PI * Math.min(1, 0.12 + fr1))
          cl =
            (6 + 30 * rnd()) *
            (0.35 + 0.65 * env) *
            Math.min(1, p.len / 260 + 0.4) *
            p.blen
          if (!p.star && rnd() < 0.08) cl = 30 + 70 * rnd()
          if (p.star) sub = { ba: Math.PI / 3, blen: 0.7, dens: 1.3 }
        } else cl = (2.5 + 8 * rnd()) * (1 - fr1 * 0.7) * Math.min(1.4, p.blen)
        cl = Math.min(cl, (p.len - p.s) * (d0 ? 0.9 : 0.8))
        if (cl > 2.5)
          stem(
            nx,
            ny,
            ang,
            cl,
            Math.max(0.42, w1 * 0.58),
            p.v * (d0 ? 0.62 : 0.5),
            t1 + 0.04 + rnd() * 0.25,
            p.depth + 1,
            p.id,
            sub,
          )
      }
      p.nb += (d0 ? 2.6 + rnd() * 4.4 : 1.6 + rnd() * 2.4) / p.dens
    }
    p.x = nx
    p.y = ny
    p.t = t1
    if (p.s < p.len) push(p)
  }

  return {
    get done() {
      return heap.length === 0 || guard >= MAX_STEPS
    },
    step: (deadline) => {
      while (heap.length && guard < MAX_STEPS) {
        for (
          let k = 0;
          k < CHECK_EVERY && heap.length && guard < MAX_STEPS;
          k++
        ) {
          guard++
          const p = pop()
          if (p.t <= 80) advance(p)
        }
        if (performance.now() >= deadline) return
      }
    },
    take: () => {
      const out = segs.subarray(taken, count)
      taken = count
      return out
    },
  }
}
