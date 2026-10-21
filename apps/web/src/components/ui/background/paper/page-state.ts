export type PageState = 'browse' | 'read' | 'immersive'

export interface LayerVisibility {
  bok: number
  dye: number
  elem: number
  fiber: number
  paper: number
  sheet: number
  suki: number
  sunago: number
}

export interface LayerMotion {
  bok: number
  fiber: number
  suki: number
  sunago: number
}

export interface Profile {
  glint: number
  move: LayerMotion
  vis: LayerVisibility
}

const STILL: LayerMotion = { fiber: 0, suki: 0, sunago: 0, bok: 0 }

export const PAGE_PROFILES: Record<PageState, Profile> = {
  browse: {
    vis: {
      paper: 1,
      fiber: 1,
      suki: 1,
      sunago: 1,
      elem: 1,
      bok: 1,
      dye: 1,
      sheet: 1,
    },
    move: { fiber: 1, suki: 1, sunago: 1, bok: 1 },
    glint: 1,
  },
  read: {
    vis: {
      paper: 0.5,
      fiber: 0.7,
      suki: 0.3,
      sunago: 0.5,
      elem: 0,
      bok: 0.6,
      dye: 1,
      sheet: 1,
    },
    move: STILL,
    glint: 0,
  },
  immersive: {
    vis: {
      paper: 0.3,
      fiber: 0.45,
      suki: 0,
      sunago: 0,
      elem: 0,
      bok: 0.35,
      dye: 0.6,
      sheet: 1,
    },
    move: STILL,
    glint: 0,
  },
}

const SETTLE_TAU = 0.2
const SNAP = 0.001

const approach = (value: number, target: number, k: number) => {
  const next = value + (target - value) * k
  return Math.abs(target - next) < SNAP ? target : next
}

const easeRecord = <T extends object>(cur: T, target: T, k: number): T => {
  const out = {} as Record<string, number>
  for (const key of Object.keys(target))
    out[key] = approach(
      (cur as Record<string, number>)[key],
      (target as Record<string, number>)[key],
      k,
    )
  return out as T
}

export const easeProfile = (
  cur: Profile,
  target: Profile,
  dt: number,
): Profile => {
  const k = 1 - Math.exp(-dt / SETTLE_TAU)
  return {
    vis: easeRecord(cur.vis, target.vis, k),
    move: easeRecord(cur.move, target.move, k),
    glint: approach(cur.glint, target.glint, k),
  }
}

const sameRecord = (a: object, b: object) =>
  Object.entries(b).every(
    ([key, value]) => (a as Record<string, number>)[key] === value,
  )

export const profileSettled = (cur: Profile, target: Profile) =>
  cur.glint === target.glint &&
  sameRecord(cur.vis, target.vis) &&
  sameRecord(cur.move, target.move)

export const isMoving = ({ move }: Profile) =>
  move.fiber + move.suki + move.sunago + move.bok > 0
