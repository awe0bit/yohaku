import type {
  Box,
  Glyph,
  Live,
  Program,
  SeasonInfo,
  Target,
  TargetOptions,
} from '../seasons/types'
import { BASE_UNIFORMS, GLSL_HEADER, PAGE_FS, QUAD_VS } from './header'

interface LiveInput {
  boxes: Box[]
  canvas: HTMLCanvasElement
  dpr: number
  elemVisibility: () => number
  glyphs: Glyph[]
  h: number
  season: SeasonInfo
  setCursor: (cursor: string) => void
  w: number
}

const COMPLETION_STATUS_KHR = 0x91_B1

export const createLive = (
  input: LiveInput,
): { live: Live; release: () => void } | null => {
  const { canvas, w, h, dpr, season } = input
  const W = Math.round(w * dpr)
  const H = Math.round(h * dpr)
  canvas.width = W
  canvas.height = H
  const gl = canvas.getContext('webgl2', {
    antialias: false,
    premultipliedAlpha: true,
    alpha: false,
  })
  if (!gl) return null
  gl.getExtension('EXT_color_buffer_float')
  gl.getExtension('OES_texture_float_linear')
  const parallel = !!gl.getExtension('KHR_parallel_shader_compile')

  const quad = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, quad)
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW,
  )
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

  const textures: WebGLTexture[] = []
  const framebuffers: WebGLFramebuffer[] = []
  const programs: WebGLProgram[] = []

  const texture = (tw: number, th: number, options: TargetOptions = {}) => {
    const tex = gl.createTexture()!
    textures.push(tex)
    gl.bindTexture(gl.TEXTURE_2D, tex)
    const filter = options.filter ?? gl.LINEAR
    const wrap = options.wrap ?? gl.CLAMP_TO_EDGE
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap)
    if (tw > 0)
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        options.float ? gl.RGBA16F : gl.RGBA8,
        tw,
        th,
        0,
        gl.RGBA,
        options.float ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE,
        null,
      )
    return tex
  }

  const bind = (unit: number, tex: WebGLTexture) => {
    gl.activeTexture(gl.TEXTURE0 + unit)
    gl.bindTexture(gl.TEXTURE_2D, tex)
  }

  const inkTex = texture(W, H)
  const paperTex = texture(0, 0)
  const paperBareTex = texture(0, 0)
  const paperFlatTex = texture(0, 0)

  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type)!
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    return shader
  }

  const programWith = (
    vertex: string,
    fragmentBody: string,
    uniforms: readonly string[] = [],
  ): Program => {
    const program = gl.createProgram()!
    programs.push(program)
    const vs = compile(gl.VERTEX_SHADER, vertex)
    const fs = compile(gl.FRAGMENT_SHADER, GLSL_HEADER + fragmentBody)
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.bindAttribLocation(program, 0, 'p')
    gl.linkProgram(program)
    let linked = false
    const u: Record<string, WebGLUniformLocation | null> = {}
    const base: Record<string, WebGLUniformLocation | null> = {}
    const ready = () => {
      if (linked) return true
      if (parallel && !gl.getProgramParameter(program, COMPLETION_STATUS_KHR))
        return false
      if (!gl.getProgramParameter(program, gl.LINK_STATUS))
        throw new Error(
          `${gl.getProgramInfoLog(program)}\n${gl.getShaderInfoLog(fs)}`,
        )
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      for (const name of BASE_UNIFORMS)
        base[name] = gl.getUniformLocation(program, name)
      for (const name of uniforms)
        u[name] = gl.getUniformLocation(program, name)
      linked = true
      return true
    }
    return {
      program,
      u,
      ready,
      use: () => {
        ready()
        gl.useProgram(program)
        bind(0, inkTex)
        gl.uniform1i(base.uInk, 0)
        bind(1, paperTex)
        gl.uniform1i(base.uPaper, 1)
        bind(2, paperBareTex)
        gl.uniform1i(base.uPaperBare, 2)
        bind(3, paperFlatTex)
        gl.uniform1i(base.uPaperFlat, 3)
        gl.uniform2f(base.uRes, w, h)
        gl.uniform1f(base.uDpr, dpr)
        gl.uniform1f(base.uDark, season.dark ? 1 : 0)
        gl.uniform1f(base.uTime, live.time)
        gl.uniform3fv(base.uAccent, season.accent)
        gl.uniform3fv(base.uPaperRgb, season.paperRgb)
        gl.uniform3fv(base.uLightColor, season.light.color)
        gl.uniform2fv(base.uLightSrc, season.light.src)
      },
    }
  }

  const draw = (target: Target | null = null) => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.fb : null)
    gl.viewport(0, 0, target ? target.w : W, target ? target.h : H)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  const page = programWith(QUAD_VS, PAGE_FS)

  const live: Live = {
    gl,
    canvas,
    w,
    h,
    W,
    H,
    dpr,
    time: 0,
    season,
    glyphs: input.glyphs,
    boxes: input.boxes,
    inkTex,
    paperTex,
    paperBareTex,
    paperFlatTex,
    setCursor: input.setCursor,
    elemVisibility: input.elemVisibility,
    bind,
    draw,
    program: (fragmentBody, uniforms) =>
      programWith(QUAD_VS, fragmentBody, uniforms),
    programWith,
    drawPage: () => {
      page.use()
      draw()
    },
    target: (tw, th, options = {}) => {
      const tex = texture(tw, th, options)
      const fb = gl.createFramebuffer()!
      framebuffers.push(fb)
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        tex,
        0,
      )
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      return { tex, fb, w: tw, h: th }
    },
    upload: (source, tex = null, premultiply = true) => {
      const out = tex ?? texture(0, 0)
      gl.bindTexture(gl.TEXTURE_2D, out)
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, premultiply)
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        source,
      )
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
      return out
    },
  }
  const release = () => {
    if (gl.isContextLost()) return
    for (const program of programs) gl.deleteProgram(program)
    for (const fb of framebuffers) gl.deleteFramebuffer(fb)
    for (const tex of textures) gl.deleteTexture(tex)
    gl.deleteBuffer(quad)
  }
  return { live, release }
}
