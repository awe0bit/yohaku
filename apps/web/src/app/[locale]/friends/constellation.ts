export type StarPoint<T> = { link: T; x: number; y: number }
export type StarEdge = { from: number; to: number; faint: boolean }
export type StarMap<T> = { points: StarPoint<T>[]; edges: StarEdge[] }
export type Body = {
  x: number
  y: number
  vx: number
  vy: number
  tx: number
  ty: number
  alpha: number
  scale: number
  phase: 'stay' | 'enter' | 'leave'
}

export const CHAOS_MS = 720
export const SETTLE_MIN_MS = CHAOS_MS + 360
export const SETTLE_MAX_MS = 2600
export const SKY_TURN_MS = 1500
export const SKY_TURN_DEG = 7

const hash = (text: string) => {
  let h = 2166136261
  for (const ch of text) h = Math.imul(h ^ ch.codePointAt(0)!, 16777619)
  return h >>> 0
}

export const seededRandom = (seed: number) => {
  let state = seed | 0
  return () => {
    state = (state + 1831565813) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2

export const linkDomain = (url: string) =>
  url
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '')

export const matchesQuery = (
  link: { name: string; url: string; description?: string | null },
  query: string,
) => {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return `${link.name} ${link.url} ${link.description ?? ''}`
    .toLowerCase()
    .includes(q)
}

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(Math.max(v, lo), hi)

export const seededShuffle = <T extends { id: string }>(
  links: readonly T[],
  seed: number,
) => {
  const rand = seededRandom(seed)
  return links
    .map((link) => ({
      link,
      key: (hash(link.id) ^ Math.floor(rand() * 2 ** 32)) >>> 0,
    }))
    .sort((a, b) => a.key - b.key)
    .map((entry) => entry.link)
}

export const mapPadding = (compact: boolean) =>
  compact ? { x: 36, top: 70, bottom: 92 } : { x: 70, top: 84, bottom: 100 }

export const layoutStars = <T extends { id: string }>(
  links: readonly T[],
  options: {
    width: number
    height: number
    count: number
    seed: number
    compact?: boolean
  },
): StarMap<T> => {
  const { width, height, count, seed, compact = false } = options
  const pad = mapPadding(compact)
  // Labels sit under each star, so vertical neighbours need more room than horizontal ones.
  const yScale = compact ? 1.4 : 1.7

  const points: StarPoint<T>[] = []
  for (const link of seededShuffle(links, seed).slice(0, count)) {
    const rand = seededRandom(hash(link.id) ^ seed)
    let best = { x: 0, y: 0 }
    let bestScore = -1
    for (let i = 0; i < 24; i++) {
      const x = pad.x + rand() * (width - pad.x * 2)
      const y = pad.top + rand() * (height - pad.top - pad.bottom)
      let score = Infinity
      for (const p of points) {
        score = Math.min(score, Math.hypot(p.x - x, (p.y - y) * yScale))
      }
      if (score > bestScore) {
        bestScore = score
        best = { x, y }
      }
    }
    points.push({ link, ...best })
  }

  const dist = (a: number, b: number) =>
    Math.hypot(points[a].x - points[b].x, points[a].y - points[b].y)
  const edges: StarEdge[] = []
  const inTree = new Set(points.length ? [0] : [])
  while (inTree.size < points.length) {
    let pick: { from: number; to: number; d: number } | null = null
    for (const from of inTree) {
      for (let to = 0; to < points.length; to++) {
        if (inTree.has(to)) continue
        const d = dist(from, to)
        if (!pick || d < pick.d) pick = { from, to, d }
      }
    }
    inTree.add(pick!.to)
    edges.push({ from: pick!.from, to: pick!.to, faint: false })
  }

  const key = (a: number, b: number) => `${Math.min(a, b)}-${Math.max(a, b)}`
  const linked = new Set(edges.map((e) => key(e.from, e.to)))
  const reach = compact ? 150 : 240
  for (let i = 0; i < points.length; i++) {
    const second = points
      .map((_, j) => ({ j, d: dist(i, j) }))
      .filter((n) => n.j !== i)
      .sort((a, b) => a.d - b.d)[1]
    if (!second || linked.has(key(i, second.j)) || second.d >= reach) continue
    if (edges.length >= points.length * 1.3) break
    linked.add(key(i, second.j))
    edges.push({ from: i, to: second.j, faint: true })
  }

  return { points, edges }
}

export type StepTiming = {
  /** Heat ramps up over this window, then dissipates over `heatDecay`. */
  chaos: number
  heatDecay: number
  /** `enter` stars fade/scale in from `fadeStart` over `fade`. */
  fadeStart: number
  fade: number
  /** Pull toward the target slot engages at `pullStart` over `pullRamp`. */
  pullStart: number
  pullRamp: number
  /** Nothing settles before this. */
  settleMin: number
}

const STEP_TIMING: StepTiming = {
  chaos: CHAOS_MS,
  fade: 560,
  fadeStart: 160,
  heatDecay: 520,
  pullRamp: 340,
  pullStart: CHAOS_MS - 80,
  settleMin: SETTLE_MIN_MS,
}

/** Cold start: no lingering in the core — the cloud bursts and scatters at once. */
export const GENESIS_TIMING: StepTiming = {
  chaos: 170,
  fade: 240,
  fadeStart: 40,
  heatDecay: 300,
  pullRamp: 190,
  pullStart: 70,
  settleMin: 480,
}

export const stepBodies = (
  bodies: Body[],
  t: number,
  dt: number,
  rand: () => number,
  bounds: { width: number; height: number },
  timing: StepTiming = STEP_TIMING,
) => {
  const { width, height } = bounds
  const { chaos, heatDecay, fadeStart, fade, pullStart, pullRamp, settleMin } =
    timing
  const heat =
    t < chaos
      ? easeInOutCubic(t / chaos)
      : Math.max(0, 1 - (t - chaos) / heatDecay)
  const pull = clamp((t - pullStart) / pullRamp, 0, 1)
  let restless = t < settleMin

  for (const b of bodies) {
    let ax = (rand() - 0.5) * 2 * 5200 * heat - (b.y - height / 2) * 1.6 * heat
    let ay = (rand() - 0.5) * 2 * 5200 * heat + (b.x - width / 2) * 1.6 * heat
    if (b.phase !== 'leave') {
      ax += pull * 150 * (b.tx - b.x)
      ay += pull * 150 * (b.ty - b.y)
    }
    const drag = 1.5 + 15 * pull
    b.vx += (ax - drag * b.vx) * dt
    b.vy += (ay - drag * b.vy) * dt
    b.x += b.vx * dt
    b.y += b.vy * dt
    if (b.x < 20 || b.x > width - 20) {
      b.vx *= -0.6
      b.x = clamp(b.x, 20, width - 20)
    }
    if (b.y < 20 || b.y > height - 20) {
      b.vy *= -0.6
      b.y = clamp(b.y, 20, height - 20)
    }

    if (b.phase === 'leave') {
      const k = Math.min(1, t / 620)
      b.alpha = 1 - k
      b.scale = 1 - 0.6 * k
      continue
    }
    if (b.phase === 'enter') {
      const k = clamp((t - fadeStart) / fade, 0, 1)
      b.alpha = k
      b.scale = 0.4 + 0.6 * easeInOutCubic(k)
    }
    if (
      Math.hypot(b.tx - b.x, b.ty - b.y) > 0.6 ||
      Math.hypot(b.vx, b.vy) > 6
    ) {
      restless = true
    }
  }
  return restless
}

export const settleBodies = (bodies: Body[]) => {
  for (const b of bodies) {
    if (b.phase === 'leave') {
      b.alpha = 0
      continue
    }
    Object.assign(b, { x: b.tx, y: b.ty, vx: 0, vy: 0, alpha: 1, scale: 1 })
  }
}
