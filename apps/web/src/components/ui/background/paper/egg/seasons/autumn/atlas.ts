import { ELEM_COLORS } from '~/lib/paper/season'

import { drawElement } from '../../../elements'
import type { ElementPlacement } from '../../../layout'
import type { Live } from '../types'

export const MAXS = 32
export const ABOX = 1.8
const ACELL = 160

export interface Pressed extends ElementPlacement {
  color: string
  i: number
}

export const pressedOf = (elements: ElementPlacement[]): Pressed[] =>
  elements.slice(0, MAXS).map((e, i) => {
    const pal = ELEM_COLORS[e.type]
    return { ...e, i, color: pal[Math.floor(e.colorIndex * pal.length)] }
  })

export const idMapOf = (live: Live, els: Pressed[]) => {
  const { gl } = live
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(live.w))
  c.height = Math.max(1, Math.round(live.h))
  const x = c.getContext('2d')!
  for (const e of els) {
    x.fillStyle = `rgb(${e.i + 1},0,0)`
    x.beginPath()
    x.arc(e.x, e.y, e.size * 0.72 + 7, 0, Math.PI * 2)
    x.fill()
  }
  const tex = live.upload(c, null, false)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  return tex
}

export const atlasOf = (live: Live, els: Pressed[]) => {
  const { gl } = live
  const c = document.createElement('canvas')
  c.width = ACELL * 8
  c.height = ACELL * 4
  const x = c.getContext('2d')!
  for (const e of els) {
    x.save()
    x.translate(((e.i % 8) + 0.5) * ACELL, (Math.floor(e.i / 8) + 0.5) * ACELL)
    const k = ACELL / (ABOX * e.size)
    x.scale(k, k)
    if (e.flip) x.scale(-1, 1)
    drawElement(x, e.type, e.color, e.size, e.seed)
    x.restore()
  }
  const tex = live.upload(c)
  gl.generateMipmap(gl.TEXTURE_2D)
  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_MIN_FILTER,
    gl.LINEAR_MIPMAP_LINEAR,
  )
  return tex
}
