import { drawElement } from '../../../elements'
import type { Program, SeasonFactory, Target } from '../types'
import { CAP_FLOATS, createBreath, MAX_CAPS, MAX_DRIPS } from './breath'
import { COMP_FS } from './composite'
import { createFernRaster } from './fern'
import { createFrost, type Frost } from './frost'
import { clamp, smooth } from './math'
import { BLUR_FS, HAZE_FS, NEEDLE_FS, PAGE_FS, SIM_FS } from './shaders'

const EXIT_DUR = 3.6
const THAW_T1 = 2.3
const SLICE_MS = 4

export const winterEffect: SeasonFactory = (live) => {
  const { gl, w, h, W, H, season } = live
  const program = (src: string) =>
    live.program(
      src,
      [...src.matchAll(/uniform\s+\w+\s+(\w+)/g)].map((m) => m[1]),
    )
  const pPage = program(PAGE_FS)
  const pBlur = program(BLUR_FS)
  const pNeedle = program(NEEDLE_FS)
  const pSim = program(SIM_FS)
  const pHaze = program(HAZE_FS)
  const pComp = program(COMP_FS)
  const fern = createFernRaster(live)
  const programs = [pPage, pBlur, pNeedle, pSim, pHaze, pComp]

  const simTarget = (): Target => {
    const tex = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA32F,
      w,
      h,
      0,
      gl.RGBA,
      gl.FLOAT,
      null,
    )
    const fb = gl.createFramebuffer()!
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      tex,
      0,
    )
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    return { tex, fb, w, h }
  }
  const sims = [simTarget(), simTarget()]
  let ping = 0

  const c2w = Math.ceil(w / 2)
  const c2h = Math.ceil(h / 2)
  const c4w = Math.ceil(w / 4)
  const c4h = Math.ceil(h / 4)
  const needle = live.target(W, H)
  const pg = live.target(w, h)
  const b1h = live.target(w, h)
  const b1 = live.target(w, h)
  const b2h = live.target(c2w, c2h)
  const b2 = live.target(c2w, c2h)
  const b3h = live.target(c4w, c4h)
  const b3 = live.target(c4w, c4h)
  const mBh = live.target(w, h)
  const mB = live.target(w, h)
  const mWh = live.target(c4w, c4h)
  const mW = live.target(c4w, c4h)
  const mW2 = live.target(c4w, c4h)
  const hz0 = live.target(c2w, c2h, { float: true })
  const hz1 = live.target(c2w, c2h, { float: true })
  const hz2 = live.target(c2w, c2h, { float: true })

  const blur = (
    src: WebGLTexture,
    dst: Target,
    dx: number,
    dy: number,
    sigma: number,
  ) => {
    pBlur.use()
    live.bind(4, src)
    gl.uniform1i(pBlur.u.uSrc, 4)
    gl.uniform2f(pBlur.u.uTRes, dst.w, dst.h)
    gl.uniform2f(pBlur.u.uDir, dx / dst.w, dy / dst.h)
    gl.uniform1f(pBlur.u.uSigma, sigma)
    live.draw(dst)
  }

  const maxD = Math.hypot(w / 2, h / 2) + 90
  const breath = createBreath(w, h)
  const capArr = new Float32Array(MAX_CAPS * 4)
  const capPArr = new Float32Array(MAX_CAPS * 4)
  const dropArr = new Float32Array(MAX_DRIPS * 4)
  const dropBArr = new Float32Array(MAX_DRIPS * 4)

  let maskTex: WebGLTexture | null = null
  let frost: Frost | null = null
  let baked = false
  let running = false
  let primed = false
  let disposed = false
  let cleanDrawn = false
  let T = 0
  let exitT = -1

  const buildMask = () => {
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const x = canvas.getContext('2d', { willReadFrequently: true })!
    x.globalCompositeOperation = 'lighter'
    for (const e of season.elements) {
      x.save()
      x.translate(e.x, e.y)
      x.rotate(e.rotation)
      if (e.flip) x.scale(-1, 1)
      drawElement(
        x,
        e.type,
        e.type === 'wintersweet'
          ? '#00FF00'
          : e.type === 'snow'
            ? '#0000FF'
            : '#FF0000',
        e.size,
        e.seed,
      )
      x.restore()
    }
    maskTex = live.upload(canvas, null, false)
    frost = createFrost({
      elements: season.elements,
      h,
      mask: x.getImageData(0, 0, w, h).data,
      term: season.term,
      w,
    })
  }

  const bake = (mask: WebGLTexture) => {
    blur(mask, mBh, 1, 0, 2.6)
    blur(mBh.tex, mB, 0, 1, 2.6)
    blur(mask, mWh, 1, 0, 2.2)
    blur(mWh.tex, mW, 0, 1, 2.2)
    blur(mW.tex, mWh, 1, 0, 3)
    blur(mWh.tex, mW2, 0, 1, 3)
    pNeedle.use()
    gl.uniform2f(pNeedle.u.uTRes, W, H)
    live.draw(needle)
    baked = true
  }

  const prepare = (deadline: number) => {
    if (!frost || !maskTex) {
      buildMask()
      return
    }
    if (!frost.done) frost.step(deadline)
    if (fern.ready()) fern.draw(frost.take())
    if (!baked && pBlur.ready() && pNeedle.ready()) bake(maskTex)
    if (
      frost.done &&
      baked &&
      fern.ready() &&
      programs.every((p) => p.ready())
    ) {
      fern.finish()
      frost = null
      running = true
    }
  }

  const setIce = (p: Program, sim: Target, thaw: number) => {
    live.bind(4, fern.cover)
    gl.uniform1i(p.u.uFern, 4)
    live.bind(13, fern.time)
    gl.uniform1i(p.u.uFernT, 13)
    live.bind(5, needle.tex)
    gl.uniform1i(p.u.uNeedle, 5)
    live.bind(6, sim.tex)
    gl.uniform1i(p.u.uSim, 6)
    live.bind(7, mB.tex)
    gl.uniform1i(p.u.uMaskB, 7)
    live.bind(8, mW2.tex)
    gl.uniform1i(p.u.uMaskW, 8)
    gl.uniform1f(p.u.uT, T)
    gl.uniform1f(p.u.uHoar, 0.7 * smooth(1.5, 9, T) + 0.3 * smooth(9, 50, T))
    gl.uniform1f(p.u.uRim, smooth(0.3, 2.6, T))
    gl.uniform2f(p.u.uDev, W, H)
    gl.uniform4f(p.u.uThaw, thaw, exitT >= 0 ? 1 : 0, 0, 0)
  }

  const render = (dt: number) => {
    T += dt
    if (exitT >= 0) exitT += dt
    const thaw =
      exitT < 0 ? -1000 : maxD * (1 - (1 - clamp(exitT / THAW_T1, 0, 1)) ** 2)
    breath.step(dt, exitT, thaw)
    const fade = exitT < 0 ? 1 : 1 - smooth(EXIT_DUR * 0.85, EXIT_DUR, exitT)
    const mix = smooth(0, 0.06, T) * fade

    pPage.use()
    gl.uniform2f(pPage.u.uTRes, w, h)
    live.draw(pg)
    blur(pg.tex, b1h, 1, 0, 1.3)
    blur(b1h.tex, b1, 0, 1, 1.3)
    blur(b1.tex, b2h, 1, 0, 1.8)
    blur(b2h.tex, b2, 0, 1, 1.8)
    blur(b2.tex, b3h, 1, 0, 2.3)
    blur(b3h.tex, b3, 0, 1, 2.3)

    const src = sims[ping]
    const sim = sims[1 - ping]
    pSim.use()
    live.bind(4, src.tex)
    gl.uniform1i(pSim.u.uPrev, 4)
    gl.uniform1f(pSim.u.uDt, dt)
    gl.uniform1f(pSim.u.uRefreeze, exitT < 0 ? 1 : 0)
    gl.uniform4fv(pSim.u.uBreath, breath.breathU)
    gl.uniform4fv(pSim.u.uFog, breath.fogU)
    const { caps } = breath
    const nc = Math.min(MAX_CAPS, caps.length / CAP_FLOATS)
    for (let i = 0; i < nc; i++) {
      const c = i * CAP_FLOATS
      capArr.set([caps[c], caps[c + 1], caps[c + 2], caps[c + 3]], i * 4)
      capPArr.set([caps[c + 4], caps[c + 5], caps[c + 6], 0], i * 4)
    }
    gl.uniform4fv(pSim.u.uCap, capArr)
    gl.uniform4fv(pSim.u.uCapP, capPArr)
    gl.uniform1i(pSim.u.uCapN, nc)
    live.draw(sim)
    ping ^= 1

    pHaze.use()
    setIce(pHaze, sim, thaw)
    gl.uniform2f(pHaze.u.uTRes, hz0.w, hz0.h)
    live.draw(hz0)
    blur(hz0.tex, hz1, 1, 0, 4)
    blur(hz1.tex, hz2, 0, 1, 4)

    pComp.use()
    setIce(pComp, sim, thaw)
    live.bind(9, hz2.tex)
    gl.uniform1i(pComp.u.uHaze, 9)
    live.bind(10, b1.tex)
    gl.uniform1i(pComp.u.uB1, 10)
    live.bind(11, b2.tex)
    gl.uniform1i(pComp.u.uB2, 11)
    live.bind(12, b3.tex)
    gl.uniform1i(pComp.u.uB3, 12)
    const { ptr } = breath
    gl.uniform2f(
      pComp.u.uPtr,
      ptr.has ? ptr.x : w * 0.5,
      ptr.has ? ptr.y : h * 0.4,
    )
    gl.uniform1f(
      pComp.u.uCast,
      smooth(0.4, 7.5, T) * (exitT < 0 ? 1 : 1 - smooth(0.1, 2.8, exitT)),
    )
    gl.uniform1f(
      pComp.u.uGlow,
      smooth(1.5, 8, T) * (exitT < 0 ? 1 : 1 - smooth(0.6, 3, exitT)),
    )
    gl.uniform1f(pComp.u.uMix, mix)
    gl.uniform1f(
      pComp.u.uWarm,
      exitT < 0 ? 0 : 0.7 * Math.sin(Math.PI * clamp(exitT / EXIT_DUR, 0, 1)),
    )
    gl.uniform1f(
      pComp.u.uWet,
      fade * (exitT < 0 ? 1 : 1 - 0.85 * smooth(0.3, 2.6, exitT)),
    )
    gl.uniform4f(
      pComp.u.uExit,
      Math.max(0, exitT),
      THAW_T1,
      maxD,
      exitT < 0 ? 0 : 1 - smooth(EXIT_DUR * 0.6, EXIT_DUR * 0.95, exitT),
    )
    const { drips } = breath
    const nd = Math.min(MAX_DRIPS, drips.length)
    for (let i = 0; i < nd; i++) {
      const d = drips[i]
      dropArr.set([d.x, d.y, d.r, d.a * fade], i * 4)
      dropBArr[i * 4] = d.el
    }
    gl.uniform4fv(pComp.u.uDrop, dropArr)
    gl.uniform4fv(pComp.u.uDropB, dropBArr)
    gl.uniform1i(pComp.u.uDropN, nd)
    live.draw(null)
    if (exitT >= EXIT_DUR && mix <= 0) cleanDrawn = true
  }

  return {
    frame: (dt) => {
      if (disposed) return
      if (!running) {
        if (exitT >= 0) cleanDrawn = true
        else if (primed) prepare(performance.now() + SLICE_MS)
        primed = true
      }
      if (running && !cleanDrawn) render(dt)
      else live.drawPage()
    },
    pointer: breath.pointer,
    exit: () => {
      if (exitT >= 0) return
      exitT = 0
      breath.exit()
    },
    get done() {
      return cleanDrawn
    },
    dispose: () => {
      if (disposed) return
      disposed = true
      frost = null
      fern.dispose()
      for (const s of sims) {
        gl.deleteFramebuffer(s.fb)
        gl.deleteTexture(s.tex)
      }
    },
  }
}
