import { rootBgRgb } from '~/lib/paper/accent'
import type { Light } from '~/lib/paper/light'
import type { Rgb } from '~/lib/paper/oklab'
import { labToRgb } from '~/lib/paper/oklab'
import { accentLab, goldness, lerp3, paperColor } from '~/lib/paper/season'

import { textureScale } from './budget'
import type { Profile } from './page-state'
import type { Presence } from './presence'
import {
  FRAGMENT_SHADER,
  MAX_PRESSES,
  MAX_SHEETS,
  VERTEX_SHADER,
} from './shader'
import type { SeasonalTextures, Surface } from './textures'
import {
  makeFibers,
  makeSeasonal,
  makeSeasonalAsync,
  makeWitherMask,
  yieldToMain,
} from './textures'

const TERM_TRANSITION_S = 10

const UNIFORMS = [
  'uRes',
  'uDpr',
  'uT',
  'uPaper',
  'uDark',
  'uLayers',
  'uMotion',
  'uBok',
  'uGlint',
  'uSpinT',
  'uBokT',
  'uSrc',
  'uRadius',
  'uLC',
  'uGold',
  'uGoldB',
  'uMix',
  'uAccent',
  'uDyeA',
  'uDyeB',
  'uDyeMix',
  'uDeco',
  'uFootAmt',
  'uSheets',
  'uPress',
  'uRoot',
  'uIn',
  'uIn2',
  'uLeaf',
  'uPaperK',
  'uDyeBand',
] as const

const SAMPLERS = [
  'tFiber',
  'tFlake',
  'tSuki',
  'tElem',
  'tFlakeB',
  'tSukiB',
  'tElemB',
  'tWither',
] as const
type Sampler = (typeof SAMPLERS)[number]

export interface Press {
  age: number
  x: number
  y: number
}

export interface FrameInput {
  bokT: number
  dark: boolean
  dye: {
    amount: number
    band: [top: number, bottom: number]
    from: Rgb
    mix: number
    to: Rgb
  }
  leafClock: number
  light: Light
  presence: Presence
  presses: Press[]
  profile: Profile
  reduceMotion: boolean
  sheets: { bottom: number; left: number; right: number; top: number }[]
  spinT: number
  t: number
}

const smooth = (t: number) => t * t * (3 - 2 * t)

export class PaperRenderer {
  private gl: WebGLRenderingContext
  private program: WebGLProgram
  private buffer: WebGLBuffer
  private generation = 0
  private disposed = false
  private u = {} as Record<
    (typeof UNIFORMS)[number],
    WebGLUniformLocation | null
  >
  private textures = {} as Record<Sampler, WebGLTexture>
  private surface: Surface = { width: 0, height: 0, scale: 1 }
  private dpr = 1
  private term = -1
  private transition: { start: number; term: number } | null = null
  private incoming: number | null = null
  private termGeneration = 0

  static create(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl', {
      antialias: false,
      premultipliedAlpha: false,
    })
    if (!gl) return null
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type)!
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      return shader
    }
    const program = gl.createProgram()!
    const vertex = compile(gl.VERTEX_SHADER, VERTEX_SHADER)
    const fragment = compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER)
    gl.attachShader(program, vertex)
    gl.attachShader(program, fragment)
    gl.linkProgram(program)
    gl.deleteShader(vertex)
    gl.deleteShader(fragment)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program)
      return null
    }
    return new PaperRenderer(gl, program)
  }

  private constructor(gl: WebGLRenderingContext, program: WebGLProgram) {
    this.gl = gl
    this.program = program
    this.buffer = gl.createBuffer()!
    gl.useProgram(program)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    )
    const loc = gl.getAttribLocation(program, 'aP')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    for (const name of UNIFORMS) {
      const array = name === 'uSheets' || name === 'uPress'
      this.u[name] = gl.getUniformLocation(program, array ? `${name}[0]` : name)
    }
    SAMPLERS.forEach((name, unit) => {
      const texture = gl.createTexture()!
      gl.activeTexture(gl.TEXTURE0 + unit)
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        1,
        1,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        null,
      )
      gl.uniform1i(gl.getUniformLocation(program, name), unit)
      this.textures[name] = texture
    })
  }

  private upload(name: Sampler, source: HTMLCanvasElement) {
    const { gl } = this
    gl.activeTexture(gl.TEXTURE0 + SAMPLERS.indexOf(name))
    gl.bindTexture(gl.TEXTURE_2D, this.textures[name])
    gl.pixelStorei(
      gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,
      name.startsWith('tSuki') ||
        name.startsWith('tElem') ||
        name === 'tWither',
    )
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)
  }

  private uploadSeasonal(set: 'A' | 'B', textures: SeasonalTextures) {
    const suffix = set === 'A' ? '' : 'B'
    this.upload(`tFlake${suffix}` as Sampler, textures.flakes)
    this.upload(`tSuki${suffix}` as Sampler, textures.suki)
    this.upload(`tElem${suffix}` as Sampler, textures.elements)
  }

  async rebuild(width: number, height: number, dpr: number) {
    const generation = ++this.generation
    const surface = { width, height, scale: textureScale(width, height) }
    const fibers = makeFibers(surface)
    await yieldToMain()
    const term = this.pendingTerm
    const seasonal = term >= 0 ? await makeSeasonalAsync(surface, term) : null
    if (this.disposed || generation !== this.generation) return false
    const canvas = this.gl.canvas as HTMLCanvasElement
    this.dpr = dpr
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    this.surface = surface
    this.upload('tFiber', fibers)
    const latest = this.pendingTerm
    this.transition = null
    this.incoming = null
    this.termGeneration++
    this.term = latest
    if (latest >= 0)
      this.uploadSeasonal(
        'A',
        latest === term && seasonal ? seasonal : makeSeasonal(surface, latest),
      )
    return true
  }

  setTerm(term: number, animate: boolean) {
    if (term === this.pendingTerm) return
    const generation = ++this.termGeneration
    if (!animate || this.term < 0 || !this.surface.width) {
      this.transition = null
      this.incoming = null
      this.term = term
      if (this.surface.width)
        this.uploadSeasonal('A', makeSeasonal(this.surface, term))
      return
    }
    this.incoming = term
    const { surface } = this
    void makeSeasonalAsync(surface, term).then((textures) => {
      if (
        this.disposed ||
        generation !== this.termGeneration ||
        surface !== this.surface
      )
        return
      this.incoming = null
      this.commit()
      this.uploadSeasonal('B', textures)
      this.upload('tWither', makeWitherMask(surface, this.term, term))
      this.transition = { start: performance.now() / 1000, term }
    })
  }

  private commit() {
    if (!this.transition) return
    const { gl } = this
    for (const name of ['tFlake', 'tSuki', 'tElem'] as const) {
      const a = this.textures[name]
      this.textures[name] = this.textures[`${name}B`]
      this.textures[`${name}B`] = a
      gl.activeTexture(gl.TEXTURE0 + SAMPLERS.indexOf(name))
      gl.bindTexture(gl.TEXTURE_2D, this.textures[name])
      gl.activeTexture(gl.TEXTURE0 + SAMPLERS.indexOf(`${name}B`))
      gl.bindTexture(gl.TEXTURE_2D, a)
    }
    this.term = this.transition.term
    this.transition = null
  }

  termMix(now: number) {
    if (!this.transition) return 0
    const m = (now - this.transition.start) / TERM_TRANSITION_S
    if (m >= 1) {
      this.commit()
      return 0
    }
    return smooth(m)
  }

  get pendingTerm() {
    return this.incoming ?? this.transition?.term ?? this.term
  }

  get animating() {
    return this.transition !== null || this.incoming !== null
  }

  render(input: FrameInput, now: number) {
    const { gl, u } = this
    const canvas = gl.canvas as HTMLCanvasElement
    const mix = this.termMix(now)
    const from = this.term
    const to = this.transition?.term ?? this.term
    const { profile, light, dark, presence, reduceMotion } = input
    const { vis, move } = profile
    const pv = presence.v
    const entering = presence.phase === 'in' ? 1 : 0
    const accent = labToRgb(
      lerp3(accentLab(from, dark), accentLab(to, dark), mix),
    )
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.uniform2f(u.uRes, canvas.width, canvas.height)
    gl.uniform1f(u.uDpr, this.dpr)
    gl.uniform1f(u.uT, input.t)
    gl.uniform3fv(
      u.uPaper,
      lerp3(paperColor(from, dark), paperColor(to, dark), mix),
    )
    gl.uniform1f(u.uDark, dark ? 1 : 0)
    gl.uniform1f(u.uPaperK, vis.paper)
    gl.uniform4f(u.uLayers, vis.fiber, vis.sunago, vis.suki, vis.elem)
    gl.uniform4f(u.uMotion, move.fiber, move.suki, move.sunago, move.bok)
    const bok = dark
      ? lerp3(light.bokashi, [0.72, 0.74, 0.8], 0.3)
      : light.bokashi
    gl.uniform4f(
      u.uBok,
      bok[0],
      bok[1],
      bok[2],
      light.amount * vis.bok * Math.sqrt(pv.tone),
    )
    gl.uniform1f(u.uGlint, profile.glint)
    gl.uniform1f(u.uSpinT, input.spinT)
    gl.uniform1f(u.uBokT, input.bokT)
    gl.uniform2f(u.uSrc, light.src[0], light.src[1])
    gl.uniform1f(u.uRadius, light.radius)
    gl.uniform3fv(u.uLC, dark ? light.color.map((v) => v * 0.9) : light.color)
    gl.uniform1f(u.uGold, goldness(from))
    gl.uniform1f(u.uGoldB, goldness(to))
    gl.uniform1f(u.uMix, mix)
    gl.uniform3fv(u.uAccent, accent)
    gl.uniform3fv(u.uRoot, rootBgRgb(accent, dark))
    gl.uniform4f(u.uIn, pv.base, pv.tone, pv.fiber, pv.suki)
    gl.uniform4f(u.uIn2, pv.sunago, pv.elem, pv.deco, entering)
    gl.uniform4f(
      u.uLeaf,
      reduceMotion ? (entering ? 99 : 0) : input.leafClock,
      entering,
      reduceMotion ? pv.elem : 1,
      reduceMotion ? 0 : 1,
    )
    gl.uniform3fv(u.uDyeA, input.dye.from)
    gl.uniform3fv(u.uDyeB, input.dye.to)
    gl.uniform1f(u.uDyeMix, input.dye.mix)
    gl.uniform2f(u.uDyeBand, input.dye.band[0], input.dye.band[1])
    const decoIn = Math.sqrt(pv.deco)
    gl.uniform4f(
      u.uDeco,
      vis.dye * input.dye.amount * decoIn,
      vis.foot * decoIn,
      0,
      vis.sheet,
    )
    gl.uniform1f(u.uFootAmt, light.amount + 0.04)
    const sheets = new Float32Array(MAX_SHEETS * 4)
    input.sheets
      .slice(0, MAX_SHEETS)
      .forEach((r, i) => sheets.set([r.left, r.top, r.right, r.bottom], i * 4))
    gl.uniform4fv(u.uSheets, sheets)
    const presses = new Float32Array(MAX_PRESSES * 4)
    input.presses
      .slice(-MAX_PRESSES)
      .forEach((p, i) => presses.set([p.x, p.y, p.age, 1], i * 4))
    gl.uniform4fv(u.uPress, presses)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  dispose() {
    const { gl } = this
    this.disposed = true
    for (const texture of Object.values(this.textures))
      gl.deleteTexture(texture)
    gl.deleteBuffer(this.buffer)
    gl.deleteProgram(this.program)
  }
}
