import type { Image } from '@mx-space/api-client'
import { thumbHashToRGBA } from 'thumbhash'

import type { Rgb } from './oklab'
import { hexToRgb, labToRgb, rgbToLab } from './oklab'

export interface InkPair {
  bottom: Rgb
  top: Rgb
}

const FALLBACK: InkPair = {
  top: [0.42, 0.4, 0.36],
  bottom: [0.52, 0.47, 0.4],
}

function decodeHash(hash: string): Uint8Array | undefined {
  try {
    if (hash.length % 2 === 0 && /^[\da-f]+$/i.test(hash)) {
      const out = new Uint8Array(hash.length / 2)
      for (let i = 0; i < hash.length; i += 2) {
        out[i / 2] = Number.parseInt(hash.slice(i, i + 2), 16)
      }
      return out
    }
    return Uint8Array.from(atob(hash), (c) => c.codePointAt(0)!)
  } catch {
    return undefined
  }
}

function averageBand(
  rgba: Uint8Array,
  w: number,
  h: number,
  from: number,
  to: number,
): Rgb {
  const y0 = Math.max(0, Math.floor(h * from))
  const y1 = Math.min(h, Math.ceil(h * to))
  let r = 0
  let g = 0
  let b = 0
  let n = 0
  for (let y = y0; y < y1; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      r += rgba[i]
      g += rgba[i + 1]
      b += rgba[i + 2]
      n++
    }
  }
  if (n === 0) return FALLBACK.top
  return [r / n / 255, g / n / 255, b / n / 255]
}

function splitFromAccent(accent: Rgb): InkPair {
  const [L, a, b] = rgbToLab(accent)
  return {
    top: labToRgb([Math.max(0, L - 0.08), a * 1.1, b * 0.85]),
    bottom: labToRgb([Math.min(1, L + 0.08), a * 0.85, b * 1.15]),
  }
}

const inkFromHash = (hash: string): InkPair | null => {
  const bytes = decodeHash(hash)
  if (!bytes) return null
  try {
    const { w, h, rgba } = thumbHashToRGBA(bytes)
    return {
      top: averageBand(rgba, w, h, 0, 0.42),
      bottom: averageBand(rgba, w, h, 0.58, 1),
    }
  } catch {
    return null
  }
}

export function inkPairOf(image: Image): InkPair {
  const hashed = image.thumbhash ? inkFromHash(image.thumbhash) : null
  if (hashed) return hashed
  const accent = image.accent ? hexToRgb(image.accent) : null
  return accent ? splitFromAccent(accent) : FALLBACK
}
