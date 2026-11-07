import type { Live } from '../types'
import { SEGMENT_FLOATS } from './frost'
import { RASTER_FS, RASTER_VS } from './shaders'

const UNSET_TIME = 9999

export const createFernRaster = (live: Live) => {
  const { gl, W, H, dpr } = live
  const program = live.programWith(RASTER_VS, RASTER_FS, [
    'uDev',
    'uScale',
    'uPass',
  ])

  const texture = (internal: number, type: number) => {
    const tex = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, W, H, 0, gl.RED, type, null)
    const fb = gl.createFramebuffer()!
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      tex,
      0,
    )
    return { tex, fb }
  }
  const cover = texture(gl.R16F, gl.HALF_FLOAT)
  const time = texture(gl.R32F, gl.FLOAT)
  const depth = gl.createRenderbuffer()!
  gl.bindRenderbuffer(gl.RENDERBUFFER, depth)
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT32F, W, H)
  gl.framebufferRenderbuffer(
    gl.FRAMEBUFFER,
    gl.DEPTH_ATTACHMENT,
    gl.RENDERBUFFER,
    depth,
  )
  gl.bindRenderbuffer(gl.RENDERBUFFER, null)
  gl.clearBufferfv(gl.COLOR, 0, [UNSET_TIME, 0, 0, 0])
  gl.clearBufferfv(gl.DEPTH, 0, [1])
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)

  const vao = gl.createVertexArray()!
  const corners = gl.createBuffer()!
  const instances = gl.createBuffer()!
  gl.bindVertexArray(vao)
  gl.bindBuffer(gl.ARRAY_BUFFER, corners)
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW,
  )
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
  gl.bindBuffer(gl.ARRAY_BUFFER, instances)
  const stride = SEGMENT_FLOATS * 4
  for (const [loc, offset] of [
    [1, 0],
    [2, 16],
  ]) {
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, stride, offset)
    gl.vertexAttribDivisor(loc, 1)
  }
  gl.bindVertexArray(null)

  const pass = (fb: WebGLFramebuffer, which: number, count: number) => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
    gl.viewport(0, 0, W, H)
    gl.uniform1f(program.u.uPass, which)
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count)
  }
  let released = false
  const release = () => {
    if (released) return
    released = true
    gl.deleteRenderbuffer(depth)
    gl.deleteFramebuffer(cover.fb)
    gl.deleteFramebuffer(time.fb)
    gl.deleteVertexArray(vao)
    gl.deleteBuffer(corners)
    gl.deleteBuffer(instances)
  }

  return {
    cover: cover.tex,
    time: time.tex,
    ready: program.ready,
    draw: (segments: Float32Array) => {
      const count = segments.length / SEGMENT_FLOATS
      if (!count) return
      program.use()
      gl.uniform2f(program.u.uDev, W, H)
      gl.uniform1f(program.u.uScale, dpr)
      gl.bindVertexArray(vao)
      gl.bindBuffer(gl.ARRAY_BUFFER, instances)
      gl.bufferData(gl.ARRAY_BUFFER, segments, gl.STREAM_DRAW)
      gl.enable(gl.BLEND)
      gl.blendEquation(gl.MAX)
      pass(cover.fb, 0, count)
      gl.blendEquation(gl.FUNC_ADD)
      gl.disable(gl.BLEND)
      gl.enable(gl.DEPTH_TEST)
      gl.depthFunc(gl.LESS)
      pass(time.fb, 1, count)
      gl.disable(gl.DEPTH_TEST)
      gl.bindVertexArray(null)
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    },
    finish: release,
    dispose: () => {
      release()
      gl.deleteTexture(cover.tex)
      gl.deleteTexture(time.tex)
    },
  }
}
