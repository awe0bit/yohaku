import { ELEM_COLORS } from '~/lib/paper/season'

import { drawElement } from '../../../elements'
import type { SeasonFactory } from '../types'
import { MAX_POINTS } from './drops'
import { clamp } from './math'
import { fiberNoise, NOISE_SIZE } from './noise'
import type { PaintCell } from './petals'
import { createRain } from './rain'
import { CELL, FINAL_FS, NF, POINT_FS, POINT_VS, SIM_FS } from './shaders'

export const springEffect: SeasonFactory = (live) => {
  const { gl, W, H, dpr } = live
  const points = live.programWith(POINT_VS, POINT_FS, [
    'uView',
    'uScale',
    'uMaxPt',
  ])
  const sim = live.program(SIM_FS, [
    'uPrev',
    'uH',
    'uNoise',
    'uTex',
    'uDt',
    'uExit',
    'uStamp',
    'uNS',
  ])
  const fin = live.program(FINAL_FS, [
    'uH',
    'uWet',
    'uNoise',
    'uAtlas',
    'uAmt',
    'uK1',
    'uK2',
    'uLift',
    'uFlA',
    'uFlB',
  ])

  const vao = gl.createVertexArray()
  const buf = gl.createBuffer()
  gl.bindVertexArray(vao)
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 32, 0)
  gl.enableVertexAttribArray(1)
  gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 32, 16)
  gl.bindVertexArray(null)

  const noise = live.upload(fiberNoise(), null, false)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)

  const atlas = document.createElement('canvas')
  atlas.width = Math.round(CELL * NF * dpr)
  atlas.height = Math.round(CELL * dpr)
  const actx = atlas.getContext('2d')!
  const atlasTex = live.upload(atlas)

  const sw = Math.round(W / 2)
  const sh = Math.round(H / 2)
  const height = live.target(W, H, { float: true })
  const wet = [
    live.target(sw, sh, { float: true }),
    live.target(sw, sh, { float: true }),
  ]
  for (const t of wet) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  let cur = 0
  const maxPt = (
    gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE) as Float32Array
  )[1]
  const data = new Float32Array(MAX_POINTS * 8)
  const lift = new Float32Array(NF * 4)
  const flA = new Float32Array(NF * 4)
  const flB = new Float32Array(NF * 4)

  const paint: PaintCell = (cell, type, colorIndex, size, seed, flip) => {
    const colors = ELEM_COLORS[type]
    actx.setTransform(1, 0, 0, 1, 0, 0)
    actx.clearRect(cell * CELL * dpr, 0, CELL * dpr, CELL * dpr)
    actx.setTransform(
      dpr * (flip ? -1 : 1),
      0,
      0,
      dpr,
      (cell * CELL + CELL / 2) * dpr,
      (CELL / 2) * dpr,
    )
    actx.globalAlpha = 1
    drawElement(
      actx,
      type,
      colors[Math.floor(colorIndex * colors.length)],
      size,
      seed,
    )
    live.upload(atlas, atlasTex)
  }

  const rain = createRain({
    boxes: live.boxes,
    dark: live.season.dark,
    elemVisibility: live.elemVisibility,
    elements: live.season.elements,
    glyphs: live.glyphs,
    h: live.h,
    paint,
    w: live.w,
  })
  const S = rain.state

  const render = () => {
    const k = rain.pack(data)
    gl.bindFramebuffer(gl.FRAMEBUFFER, height.fb)
    gl.viewport(0, 0, W, H)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    if (!k) return
    points.use()
    gl.uniform2f(points.u.uView, live.w, live.h)
    gl.uniform1f(points.u.uScale, W / live.w)
    gl.uniform1f(points.u.uMaxPt, maxPt)
    gl.bindVertexArray(vao)
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW, 0, k * 8)
    gl.enable(gl.BLEND)
    gl.blendEquation(gl.MAX)
    gl.blendFunc(gl.ONE, gl.ONE)
    gl.drawArrays(gl.POINTS, 0, k)
    gl.disable(gl.BLEND)
    gl.blendEquation(gl.FUNC_ADD)
    gl.bindVertexArray(null)
  }

  const simulate = (dt: number) => {
    sim.use()
    live.bind(4, wet[cur].tex)
    live.bind(5, height.tex)
    live.bind(6, noise)
    gl.uniform1i(sim.u.uPrev, 4)
    gl.uniform1i(sim.u.uH, 5)
    gl.uniform1i(sim.u.uNoise, 6)
    gl.uniform2f(sim.u.uTex, 1 / sw, 1 / sh)
    gl.uniform1f(sim.u.uDt, dt)
    gl.uniform1f(sim.u.uExit, S.exiting ? 1 : 0)
    gl.uniform1f(sim.u.uStamp, S.exiting ? clamp(1 - S.exitT / 2.2, 0, 1) : 1)
    gl.uniform1f(sim.u.uNS, sw / NOISE_SIZE)
    live.draw(wet[1 - cur])
    cur = 1 - cur
  }

  const composite = (amt: number) => {
    fin.use()
    live.bind(4, height.tex)
    live.bind(5, wet[cur].tex)
    live.bind(6, noise)
    live.bind(7, atlasTex)
    gl.uniform1i(fin.u.uH, 4)
    gl.uniform1i(fin.u.uWet, 5)
    gl.uniform1i(fin.u.uNoise, 6)
    gl.uniform1i(fin.u.uAtlas, 7)
    gl.uniform1f(fin.u.uAmt, amt)
    gl.uniform1f(fin.u.uK1, 1.5)
    gl.uniform1f(fin.u.uK2, 0.12)
    lift.fill(0)
    flA.fill(0)
    flB.fill(0)
    for (let i = 0; i < Math.min(NF, S.lifts.length); i++) {
      const l = S.lifts[i]
      lift[i * 4] = l.x
      lift[i * 4 + 1] = l.y
      lift[i * 4 + 2] = l.r
      lift[i * 4 + 3] = l.a
    }
    for (let i = 0; i < Math.min(NF, S.floaters.length); i++) {
      const f = S.floaters[i]
      flA[i * 4] = f.x
      flA[i * 4 + 1] = f.y
      flA[i * 4 + 2] = f.rot
      flA[i * 4 + 3] = f.a
      flB[i * 4] = f.cell
      flB[i * 4 + 1] = f.soak
      flB[i * 4 + 3] = f.under
    }
    gl.uniform4fv(fin.u.uLift, lift)
    gl.uniform4fv(fin.u.uFlA, flA)
    gl.uniform4fv(fin.u.uFlB, flB)
    live.draw(null)
  }

  let ready = false
  let finalDrawn = false

  return {
    frame: (dt) => {
      if (!ready)
        ready = !S.exiting && points.ready() && sim.ready() && fin.ready()
      if (!ready) {
        live.drawPage()
        finalDrawn = S.exiting
        return
      }
      if (dt > 0) rain.update(dt)
      render()
      if (dt > 0) simulate(dt)
      const settled = rain.settled
      composite(settled ? 0 : 1)
      if (settled) finalDrawn = true
    },
    pointer: (e) => {
      if (e.kind === 'move') rain.move(e.x, e.y, e.now)
      else if (e.kind === 'down') rain.drip(e.x, e.y)
      else rain.leave()
    },
    exit: rain.exit,
    get done() {
      return finalDrawn
    },
    dispose: () => {
      gl.deleteVertexArray(vao)
      gl.deleteBuffer(buf)
    },
  }
}
