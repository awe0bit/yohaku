import type { Drop } from './fluid'
import { ADVECT_FS, COPY_FS, FLIP_FS, INK_VS, SHOW_FS } from './ink-shaders'
import type { SourceRect } from './ink-size'

export interface DyeSplat {
  a?: number
  erase?: boolean
  r: number
  rgb?: [number, number, number]
  x: number
  y: number
}

export interface InkShow {
  accent: [number, number, number]
  crisp: number
  dark: boolean
  dyeK: number
  now: number
  reprint: number
  veil: number
}

const MILK_LIGHT = [0.975, 0.968, 0.948]
const MILK_DARK = [0.34, 0.33, 0.315]
const DROP_TAU_S = 0.28

type GL = WebGLRenderingContext

interface ElementGL extends GL {
  texElementSubImage2D: (
    target: number,
    level: number,
    x: number,
    y: number,
    element: Element,
    config: SourceRect,
  ) => void
}

const makeProgram = (gl: GL, fs: string, names: string[]) => {
  const compile = (type: number, code: string) => {
    const shader = gl.createShader(type)!
    gl.shaderSource(shader, code)
    gl.compileShader(shader)
    return shader
  }
  const program = gl.createProgram()!
  const vs = compile(gl.VERTEX_SHADER, INK_VS)
  const frag = compile(gl.FRAGMENT_SHADER, fs)
  gl.attachShader(program, vs)
  gl.attachShader(program, frag)
  gl.bindAttribLocation(program, 0, 'p')
  gl.linkProgram(program)
  gl.deleteShader(vs)
  gl.deleteShader(frag)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null
  const u: Record<string, WebGLUniformLocation | null> = {}
  for (const name of names) u[name] = gl.getUniformLocation(program, name)
  return { program, u }
}

const makeTexture = (gl: GL, w: number, h: number) => {
  const t = gl.createTexture()!
  gl.bindTexture(gl.TEXTURE_2D, t)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    w,
    h,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    null,
  )
  return t
}

export const createInk = (canvas: HTMLCanvasElement) => {
  const gl = canvas.getContext('webgl', {
    premultipliedAlpha: false,
    antialias: false,
  }) as ElementGL | null
  if (!gl) return null
  const pAdvect = makeProgram(gl, ADVECT_FS, [
    'tDye',
    'tVel',
    'uSize',
    'uScale',
    'uSharp',
    'uDt',
    'uDecay',
    'uDiff',
    'uFrame',
    'uDrops',
    'uSplat',
    'uSplatCol',
  ])
  const pCopy = makeProgram(gl, COPY_FS, ['tInk', 'uSize'])
  const pFlip = makeProgram(gl, FLIP_FS, ['tInk', 'uSize'])
  const pShow = makeProgram(gl, SHOW_FS, [
    'uRes',
    'uDpr',
    'tDye',
    'tInk',
    'uCrisp',
    'uDyeK',
    'uRe',
    'uDark',
    'uAccent',
    'uT',
    'uVeil',
    'uMilk',
  ])
  if (!pAdvect || !pCopy || !pFlip || !pShow) return null
  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW,
  )
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

  const inkTex = makeTexture(gl, 1, 1)
  const velTex = makeTexture(gl, 1, 1)
  let dye: WebGLTexture[] = []
  let fbo: WebGLFramebuffer[] = []
  let W = 1
  let H = 1
  let CW = 1
  let CH = 1
  let cur = 0
  let frameNo = 0
  const pending: DyeSplat[] = []
  const dropArr = new Float32Array(16)
  const noDrops = new Float32Array(16)

  const bind = (unit: number, t: WebGLTexture) => {
    gl.activeTexture(gl.TEXTURE0 + unit)
    gl.bindTexture(gl.TEXTURE_2D, t)
  }

  const clear = () => {
    for (const f of fbo) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, f)
      gl.viewport(0, 0, W, H)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    pending.length = 0
  }

  const resize = (cssW: number, cssH: number, scale: number) => {
    CW = Math.max(1, Math.round(cssW))
    CH = Math.max(1, Math.round(cssH))
    W = Math.max(1, Math.round(CW * scale))
    H = Math.max(1, Math.round(CH * scale))
    for (const t of dye) gl.deleteTexture(t)
    for (const f of fbo) gl.deleteFramebuffer(f)
    dye = [makeTexture(gl, W, H), makeTexture(gl, W, H)]
    fbo = dye.map((t) => {
      const f = gl.createFramebuffer()!
      gl.bindFramebuffer(gl.FRAMEBUFFER, f)
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        t,
        0,
      )
      return f
    })
    clear()
  }

  const seedElement = (
    element: Element,
    rect: SourceRect,
    full: { height: number; width: number },
  ) => {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
    const raw = makeTexture(gl, full.width, full.height)
    gl.texElementSubImage2D(gl.TEXTURE_2D, 0, 0, 0, element, rect)
    bind(0, inkTex)
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      full.width,
      full.height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null,
    )
    const flipFbo = gl.createFramebuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, flipFbo)
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      inkTex,
      0,
    )
    gl.useProgram(pFlip.program)
    bind(0, raw)
    gl.uniform1i(pFlip.u.tInk, 0)
    gl.uniform2f(pFlip.u.uSize, full.width, full.height)
    gl.viewport(0, 0, full.width, full.height)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.deleteFramebuffer(flipFbo)
    gl.deleteTexture(raw)
    bind(0, inkTex)
    clear()
    gl.useProgram(pCopy.program)
    gl.uniform1i(pCopy.u.tInk, 0)
    gl.uniform2f(pCopy.u.uSize, W, H)
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo[cur])
    gl.viewport(0, 0, W, H)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  }

  const advect = (
    vel: Uint8Array,
    gx: number,
    gy: number,
    dt: number,
    now: number,
    decay: number,
    diffusion: number,
    drops: Drop[],
  ) => {
    bind(1, velTex)
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gx,
      gy,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      vel,
    )
    dropArr.fill(0)
    drops
      .slice(-4)
      .forEach((d, i) =>
        dropArr.set(
          [d.x, d.y, d.q * Math.exp(-(now - d.t0) / 1000 / DROP_TAU_S), 1],
          i * 4,
        ),
      )
    const u = pAdvect.u
    const passes = Math.max(1, pending.length)
    gl.useProgram(pAdvect.program)
    gl.uniform1i(u.tDye, 0)
    gl.uniform1i(u.tVel, 1)
    gl.uniform2f(u.uSize, W, H)
    gl.uniform1f(u.uScale, CW / W)
    gl.uniform1f(u.uSharp, 1)
    for (let pass = 0; pass < passes; pass++) {
      const sp = pending[pass]
      const first = pass === 0
      bind(0, dye[cur])
      gl.uniform1f(u.uDt, first ? dt : 0)
      gl.uniform1f(u.uDecay, first ? decay : 0)
      gl.uniform1f(u.uDiff, first ? diffusion : 0)
      gl.uniform1f(u.uFrame, ++frameNo % 997)
      gl.uniform4fv(u.uDrops, first ? dropArr : noDrops)
      gl.uniform4f(
        u.uSplat,
        sp?.x ?? 0,
        sp?.y ?? 0,
        sp?.r ?? 0,
        sp ? (sp.erase ? 2 : 1) : 0,
      )
      const rgb = sp?.rgb ?? [0, 0, 0]
      gl.uniform4f(
        u.uSplatCol,
        rgb[0],
        rgb[1],
        rgb[2],
        sp?.rgb ? (sp.a ?? 1) : 0,
      )
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo[1 - cur])
      gl.viewport(0, 0, W, H)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      cur = 1 - cur
    }
    pending.length = 0
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  }

  const setOutputScale = (scale: number) => {
    const tw = Math.round(CW * scale)
    const th = Math.round(CH * scale)
    if (canvas.width !== tw || canvas.height !== th) {
      canvas.width = tw
      canvas.height = th
    }
  }

  const show = (o: InkShow) => {
    const u = pShow.u
    gl.useProgram(pShow.program)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    bind(0, dye[cur])
    gl.uniform1i(u.tDye, 0)
    bind(1, inkTex)
    gl.uniform1i(u.tInk, 1)
    gl.uniform2f(u.uRes, CW, CH)
    gl.uniform1f(u.uDpr, canvas.width / CW)
    gl.uniform1f(u.uCrisp, o.crisp)
    gl.uniform1f(u.uDyeK, o.dyeK)
    gl.uniform1f(u.uRe, o.reprint)
    gl.uniform1f(u.uDark, o.dark ? 1 : 0)
    gl.uniform3fv(u.uAccent, o.accent)
    gl.uniform1f(u.uT, o.now / 1000)
    gl.uniform1f(u.uVeil, o.veil)
    gl.uniform3fv(u.uMilk, o.dark ? MILK_DARK : MILK_LIGHT)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  const dispose = () => {
    for (const t of [...dye, inkTex, velTex]) gl.deleteTexture(t)
    for (const f of fbo) gl.deleteFramebuffer(f)
    for (const p of [pAdvect, pCopy, pFlip, pShow]) gl.deleteProgram(p.program)
    gl.deleteBuffer(buffer)
  }

  return {
    resize,
    seedElement,
    clear,
    advect,
    show,
    setOutputScale,
    dispose,
    pushDye: (splat: DyeSplat) => pending.push(splat),
  }
}

export type Ink = NonNullable<ReturnType<typeof createInk>>
