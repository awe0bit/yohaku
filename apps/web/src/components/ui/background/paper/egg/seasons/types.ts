import type { Light } from '~/lib/paper/light'
import type { Rgb } from '~/lib/paper/oklab'

import type { ElementPlacement } from '../../layout'

export interface SeasonInfo {
  accent: Rgb
  dark: boolean
  elements: ElementPlacement[]
  light: Light
  paperRgb: Rgb
  season: number
  term: number
}

export interface Glyph {
  block: number
  ch: string
  h: number
  line: number
  size: number
  w: number
  x: number
  y: number
}

export interface Box {
  h: number
  w: number
  x: number
  y: number
}

export interface Program {
  readonly program: WebGLProgram
  ready: () => boolean
  readonly u: Record<string, WebGLUniformLocation | null>
  use: () => void
}

export interface Target {
  fb: WebGLFramebuffer
  h: number
  tex: WebGLTexture
  w: number
}

export interface TargetOptions {
  filter?: number
  float?: boolean
  wrap?: number
}

export interface Live {
  bind: (unit: number, tex: WebGLTexture) => void
  boxes: Box[]
  canvas: HTMLCanvasElement
  dpr: number
  draw: (target?: Target | null) => void
  drawPage: () => void
  elemVisibility: () => number
  gl: WebGL2RenderingContext
  glyphs: Glyph[]
  H: number
  h: number
  inkTex: WebGLTexture
  paperBareTex: WebGLTexture
  paperFlatTex: WebGLTexture
  paperTex: WebGLTexture
  program: (fragmentBody: string, uniforms?: readonly string[]) => Program
  programWith: (
    vertex: string,
    fragmentBody: string,
    uniforms?: readonly string[],
  ) => Program
  season: SeasonInfo
  setCursor: (cursor: string) => void
  target: (w: number, h: number, options?: TargetOptions) => Target
  time: number
  upload: (
    source: TexImageSource,
    tex?: WebGLTexture | null,
    premultiply?: boolean,
  ) => WebGLTexture
  W: number
  w: number
}

export interface PointerInput {
  kind: 'down' | 'leave' | 'move'
  now: number
  x: number
  y: number
}

export interface SeasonEffect {
  dispose: () => void
  readonly done: boolean
  exit: () => void
  frame: (dt: number, t: number) => void
  pointer: (input: PointerInput) => void
}

export type SeasonFactory = (live: Live) => SeasonEffect
