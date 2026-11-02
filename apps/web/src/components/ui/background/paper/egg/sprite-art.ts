import { drawElement } from '../elements'
import type { SpriteType } from './reactions'
import { drawTypeOf } from './reactions'

export interface SpriteArt {
  back: HTMLCanvasElement
  face: HTMLCanvasElement
  S: number
  shadow: HTMLCanvasElement
  SS: number
}

const PAD = 6
const SHADOW_PAD = 10

const filtered = (source: HTMLCanvasElement, filter: string, pad = 0) => {
  const out = document.createElement('canvas')
  out.width = source.width + pad * 2
  out.height = source.height + pad * 2
  const ctx = out.getContext('2d')!
  ctx.filter = filter
  ctx.drawImage(source, pad, pad)
  return out
}

export const makeSpriteArt = (
  type: SpriteType,
  color: string,
  size: number,
  seed: number,
  dpr: number,
  dark: boolean,
): SpriteArt => {
  const S = Math.ceil(size * 1.3 + PAD * 2)
  const base = document.createElement('canvas')
  base.width = Math.round(S * dpr)
  base.height = Math.round(S * dpr)
  const ctx = base.getContext('2d')!
  ctx.setTransform(dpr, 0, 0, dpr, (S * dpr) / 2, (S * dpr) / 2)
  drawElement(ctx, drawTypeOf(type), color, size, seed)
  const pad = Math.ceil(SHADOW_PAD * dpr)
  return {
    S,
    SS: S + (pad * 2) / dpr,
    face: dark ? filtered(base, 'brightness(0.86)') : base,
    back: filtered(
      base,
      dark
        ? 'saturate(0.55) brightness(1.02)'
        : 'saturate(0.55) brightness(1.18)',
    ),
    shadow: filtered(base, 'brightness(0) blur(3px)', pad),
  }
}
