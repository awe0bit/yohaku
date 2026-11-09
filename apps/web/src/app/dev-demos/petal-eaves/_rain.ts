import type { Eave, Scene, SceneStep } from './_scene'
import { insideBlock } from './_scene'

interface Streak {
  len: number
  vx: number
  vy: number
  x: number
  y: number
}

interface Bead {
  r: number
  vx: number
  vy: number
  x: number
  y: number
}

const GRAVITY = 1400
const DRIP_AT = 9
const MAX_STREAKS = 600
const MAX_BEADS = 400

const crossedTop = (eaves: Eave[], x: number, prevY: number, y: number) =>
  eaves.findIndex(
    (e) => prevY <= e.top && y >= e.top && x >= e.left && x <= e.right,
  )

export const createRainScene = (): Scene => {
  let streaks: Streak[] = []
  let beads: Bead[] = []
  let debt = 0
  const water = new Map<string, number>()

  const splash = (x: number, y: number, strength: number, wind: number) => {
    const n = 2 + Math.floor(Math.random() * 3 * strength)
    for (let i = 0; i < n && beads.length < MAX_BEADS; i++)
      beads.push({
        x,
        y: y - 1,
        vx: (Math.random() - 0.5) * 160 * strength + wind * 0.6,
        vy: -(90 + Math.random() * 190) * strength,
        r: 0.6 + Math.random() * 0.7,
      })
  }

  const collect = (i: number, e: Eave, x: number) => {
    const key = `${i}:${x < (e.left + e.right) / 2 ? 'l' : 'r'}`
    water.set(key, (water.get(key) ?? 0) + 1)
  }

  const drip = (step: SceneStep) => {
    for (const [key, amount] of water) {
      if (amount < DRIP_AT) continue
      const [index, side] = key.split(':')
      const e = step.eaves[Number(index)]
      water.set(key, 0)
      if (!e) continue
      beads.push({
        x: side === 'l' ? e.left + 2 : e.right - 2,
        y: e.bottom + 3,
        vx: 0,
        vy: 20,
        r: 2.4,
      })
    }
  }

  const step = (s: SceneStep) => {
    const { dt, eaves } = s
    debt += s.density * 45 * dt
    while (debt >= 1) {
      debt -= 1
      if (streaks.length >= MAX_STREAKS) continue
      const vy = 900 + Math.random() * 300
      streaks.push({
        x: Math.random() * (s.width + 200) - 100 - s.wind * 2,
        y: s.top - 30 - Math.random() * 60,
        vx: s.wind * 4,
        vy,
        len: vy * 0.016,
      })
    }

    streaks = streaks.filter((d) => {
      const prevY = d.y
      d.x += d.vx * dt
      d.y += d.vy * dt
      const hit = crossedTop(eaves, d.x, prevY, d.y)
      const e = eaves[hit]
      if (e) {
        splash(d.x, e.top, 1, s.wind)
        collect(hit, e, d.x)
        return false
      }
      return !insideBlock(eaves, d.x, d.y) && d.y < s.bottom + 40
    })

    beads = beads.filter((b) => {
      const prevY = b.y
      b.vy += GRAVITY * dt
      b.x += b.vx * dt
      b.y += b.vy * dt
      const e = eaves[crossedTop(eaves, b.x, prevY, b.y)]
      if (e) {
        if (b.r > 1.6) splash(b.x, e.top, 0.6, s.wind)
        return false
      }
      return !insideBlock(eaves, b.x, b.y) && b.y < s.bottom + 40
    })

    drip(s)
  }

  const draw = (
    ctx: CanvasRenderingContext2D,
    eaves: Eave[],
    offsetY: number,
    dark: boolean,
  ) => {
    const ink = dark ? '190, 200, 215' : '80, 92, 110'
    ctx.lineCap = 'round'
    ctx.lineWidth = 1
    ctx.strokeStyle = `rgba(${ink}, ${dark ? 0.3 : 0.32})`
    ctx.beginPath()
    for (const d of streaks) {
      const k = d.len / Math.hypot(d.vx, d.vy)
      ctx.moveTo(d.x, d.y - offsetY)
      ctx.lineTo(d.x - d.vx * k, d.y - d.vy * k - offsetY)
    }
    ctx.stroke()

    ctx.fillStyle = `rgba(${ink}, ${dark ? 0.55 : 0.5})`
    ctx.beginPath()
    for (const b of beads) {
      ctx.moveTo(b.x + b.r, b.y - offsetY)
      ctx.arc(b.x, b.y - offsetY, b.r, 0, Math.PI * 2)
    }
    for (const [key, amount] of water) {
      if (amount <= 0) continue
      const [index, side] = key.split(':')
      const e = eaves[Number(index)]
      if (!e) continue
      const r = 0.8 + 1.6 * Math.min(1, amount / DRIP_AT)
      const x = side === 'l' ? e.left + 2 : e.right - 2
      const y = e.bottom + r - offsetY
      ctx.moveTo(x + r, y)
      ctx.arc(x, y, r, 0, Math.PI * 2)
    }
    ctx.fill()
  }

  return { step, draw }
}
