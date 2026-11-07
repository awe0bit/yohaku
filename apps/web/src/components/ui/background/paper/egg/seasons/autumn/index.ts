import { lerp, lerp3 } from '~/lib/paper/season'

import type { Program, SeasonFactory } from '../types'
import { atlasOf, idMapOf, MAXS, pressedOf } from './atlas'
import { createFloaters, updateFloaters } from './floaters'
import { CELL, MOON_R, moonSpot, waterOf } from './geometry'
import { cl, ease, ease5 } from './math'
import { moonAge } from './moon'
import {
  breezeTouches,
  createPond,
  MAX_IMP,
  NRING,
  RING_LIFE,
  runDue,
} from './pond'
import { COMP_FS, SCENE_FS, SCENE_U, SIM_FS, SPR_FS, SPR_VS } from './shaders'
import type { PointerSample } from './wake'
import { drag, stone } from './wake'

const SIM_HZ = 60
const LINE_U = ['uYW', 'uYL', 'uLine', 'uBreeze', 'uT'] as const

export const autumnEffect: SeasonFactory = (live) => {
  const { gl, w, h } = live
  const { dark, light } = live.season
  const water = waterOf(live.glyphs, w, h)
  const { yL, D, PL, Nx, Ny } = water

  const moon = moonSpot(live.glyphs, w, light.src[0] >= 0.5)
  const th = moonAge(Date.now()) * Math.PI * 2
  const illum = (1 - Math.cos(th)) / 2
  const bok = dark
    ? lerp3(light.bokashi, [0.72, 0.74, 0.8], 0.3)
    : light.bokashi

  const els = pressedOf(live.season.elements)
  const idTex = idMapOf(live, els)
  const atlasTex = atlasOf(live, els)
  const fl = createFloaters(els, yL, w)

  const sim = live.program(SIM_FS, ['uS', 'uN', 'uImp', 'uNI', 'uDamp', 'uC2'])
  const scene = live.program(SCENE_FS, SCENE_U)
  const comp = live.program(COMP_FS, [
    ...SCENE_U,
    ...LINE_U,
    'uScene',
    'uSim',
    'uSimN',
    'uD',
    'uFx',
    'uMoonK',
    'uSimK',
    'uCellK',
    'uRing',
    'uGust',
  ])
  const spr = live.programWith(SPR_VS, SPR_FS, [
    ...LINE_U,
    'uShadow',
    'uAtlas',
    'uDusk',
  ])
  const programs = [sim, scene, comp, spr]
  let simA = live.target(Nx, Ny, { float: true })
  let simB = live.target(Nx, Ny, { float: true })
  const sceneT = live.target(Math.round(w), Math.round(h))

  const vao = gl.createVertexArray()
  gl.bindVertexArray(vao)
  const corners = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, corners)
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW,
  )
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
  const inst = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, inst)
  gl.bufferData(gl.ARRAY_BUFFER, MAXS * 48, gl.DYNAMIC_DRAW)
  for (let k = 0; k < 3; k++) {
    gl.enableVertexAttribArray(1 + k)
    gl.vertexAttribPointer(1 + k, 4, gl.FLOAT, false, 48, k * 16)
    gl.vertexAttribDivisor(1 + k, 1)
  }
  gl.bindVertexArray(null)

  const sprData = new Float32Array(MAXS * 12)
  const impBuf = new Float32Array(MAX_IMP * 4)
  const liftBuf = new Float32Array(MAXS)
  const ringBuf = new Float32Array(NRING * 4)

  const pond = createPond(h + 16)
  let dusk = 0
  let moonA = 0
  let moonY = moon.y
  let line = 0
  let simAcc = 0
  let outAt = 0
  let out0 = { yW: 0, dusk: 0, moonA: 0, moonY: 0, breeze: 0 }
  let ptr: PointerSample | null = null
  let ptrQ: (PointerSample | null)[] = []
  let done = false
  let disposed = false

  const lineUniforms = (p: Program) => {
    gl.uniform1f(p.u.uYW, pond.yW)
    gl.uniform1f(p.u.uYL, yL)
    gl.uniform1f(p.u.uLine, line)
    gl.uniform1f(p.u.uBreeze, pond.breeze)
    gl.uniform1f(p.u.uT, pond.time)
  }
  const sceneUniforms = (p: Program) => {
    live.bind(7, idTex)
    gl.uniform1i(p.u.uIds, 7)
    gl.uniform1fv(p.u.uLift, liftBuf)
    gl.uniform1f(p.u.uDusk, dusk)
    gl.uniform1f(p.u.uHz, yL)
    gl.uniform4f(p.u.uMoon, moon.x, moonY, MOON_R, moonA)
    gl.uniform3f(p.u.uPh, Math.sin(th), -Math.cos(th), illum)
    gl.uniform3fv(p.u.uBok, bok)
  }

  const handlePointer = () => {
    const q = ptrQ
    ptrQ = []
    for (const p of q) {
      if (ptr && p) drag(pond, water, fl, w, h, ptr, p)
      ptr = p
    }
  }

  const simulate = (dt: number) => {
    simAcc += dt * SIM_HZ
    const steps = Math.min(3, Math.floor(simAcc))
    simAcc -= steps
    if (simAcc > 3) simAcc = 0
    if (!steps) return
    sim.use()
    gl.uniform2f(sim.u.uN, Nx, Ny)
    gl.uniform1i(sim.u.uS, 4)
    gl.uniform1f(sim.u.uDamp, 0.988)
    gl.uniform1f(sim.u.uC2, 0.36)
    for (let i = 0; i < steps; i++) {
      const n = i === 0 ? pond.imp.length : 0
      if (n) {
        impBuf.fill(0)
        pond.imp.forEach((p, j) => impBuf.set(p, j * 4))
        gl.uniform4fv(sim.u.uImp, impBuf)
      }
      gl.uniform1i(sim.u.uNI, n)
      live.bind(4, simA.tex)
      live.draw(simB)
      ;[simA, simB] = [simB, simA]
    }
    pond.imp.length = 0
  }

  const drawFloaters = (ns: number) => {
    spr.use()
    gl.bindVertexArray(vao)
    gl.bindBuffer(gl.ARRAY_BUFFER, inst)
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, sprData, 0, ns * 12)
    live.bind(6, atlasTex)
    gl.uniform1i(spr.u.uAtlas, 6)
    gl.uniform1f(spr.u.uDusk, dusk)
    lineUniforms(spr)
    gl.enable(gl.BLEND)
    gl.uniform1f(spr.u.uShadow, 1)
    gl.blendFuncSeparate(gl.ZERO, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE)
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, ns)
    gl.uniform1f(spr.u.uShadow, 0)
    gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE)
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, ns)
    gl.disable(gl.BLEND)
    gl.bindVertexArray(null)
  }

  const frame = (dt: number) => {
    if (disposed) return
    if (!programs.every((p) => p.ready())) {
      live.drawPage()
      if (pond.out) done = true
      return
    }
    pond.time += dt
    const T = pond.time
    if (pond.out) {
      const U = T - outAt
      const k = cl(U / 2.6)
      pond.yW = lerp(out0.yW, h + 16, ease5(k))
      dusk = out0.dusk * (1 - ease(cl((U - 0.1) / 2.5)))
      moonA = out0.moonA * (1 - ease(cl(U / 2.2)))
      moonY = out0.moonY + 60 * ease(cl(U / 2.4))
      pond.breeze = out0.breeze * (1 - k)
      line = 1
    } else {
      dusk = ease(cl((T - 0.3) / 5))
      const rise = ease(cl((T - 0.8) / 4.2))
      pond.yW = lerp(h + 16, yL, rise)
      moonA = ease(cl((T - 1.2) / 4.8))
      moonY = moon.y + 80 * (1 - cl((T - 0.8) / 8)) ** 3
      pond.breeze = ease(cl((T - 3) / 4))
      line = rise > 0 && rise < 1 ? 1 : lerp(1, 0.12, ease(cl((T - 5) / 2)))
    }
    runDue(pond)
    handlePointer()
    breezeTouches(pond, dt, w, PL)
    updateFloaters(fl, pond, water, dt, w, dark, live.elemVisibility())

    let ns = 0
    let anyLift = false
    for (const L of fl) {
      liftBuf[L.e.i] = L.mask
      if (L.mask > 0) anyLift = true
      const P = L.pose
      if (!P || P.a <= 0.001) continue
      sprData.set(
        [
          P.x,
          P.y,
          P.ang,
          L.e.size,
          L.e.i,
          P.a,
          P.lift,
          P.sq,
          P.sub,
          P.wet,
          P.shad,
          P.grow,
        ],
        ns * 12,
      )
      ns++
    }
    pond.rings = pond.rings.filter((r) => T - r.t0 < RING_LIFE)
    ringBuf.fill(0)
    pond.rings.forEach((r, i) => ringBuf.set([r.x, r.z, T - r.t0, r.a], i * 4))
    const gust = pond.gustAt && T - pond.gustAt.t0 < 5 ? pond.gustAt : null
    const fx = dusk > 0 || moonA > 0 || pond.yW < h + 8 || anyLift || ns > 0
    if (pond.out && T - outAt >= 2.9 && !fx) done = true

    const simK = fx ? cl((pond.simUntil - T) / 0.8) : 0
    if (fx && T < pond.simUntil) simulate(dt)
    else {
      pond.imp.length = 0
      simAcc = 0
    }

    if (fx) {
      scene.use()
      sceneUniforms(scene)
      live.draw(sceneT)
    }

    comp.use()
    const { u } = comp
    sceneUniforms(comp)
    lineUniforms(comp)
    live.bind(4, sceneT.tex)
    live.bind(5, simA.tex)
    gl.uniform1i(u.uScene, 4)
    gl.uniform1i(u.uSim, 5)
    gl.uniform2f(u.uSimN, Nx, Ny)
    gl.uniform1f(u.uD, D)
    gl.uniform1f(u.uFx, fx ? 1 : 0)
    gl.uniform1f(u.uSimK, simK)
    gl.uniform1f(u.uCellK, CELL / 4)
    gl.uniform1f(u.uMoonK, moonA * Math.max(dusk, 0.2) * (0.4 + 0.6 * illum))
    gl.uniform4fv(u.uRing, ringBuf)
    if (gust)
      gl.uniform4f(u.uGust, gust.x, gust.z, T - gust.t0, gust.k * pond.breeze)
    else gl.uniform4f(u.uGust, 0, 0, 0, 0)
    live.draw(null)

    if (fx && ns > 0) drawFloaters(ns)
  }

  return {
    frame,
    pointer: ({ kind, x, y, now }) => {
      if (disposed || pond.out) return
      if (kind === 'move') ptrQ.push({ x, y, t: now })
      else if (kind === 'leave') ptrQ.push(null)
      else stone(pond, water, fl, w, h, x, y)
    },
    exit: () => {
      if (pond.out || disposed) return
      pond.out = true
      outAt = pond.time
      out0 = { yW: pond.yW, dusk, moonA, moonY, breeze: pond.breeze }
    },
    get done() {
      return done
    },
    dispose: () => {
      if (disposed) return
      disposed = true
      pond.sched.length = 0
      pond.imp.length = 0
      ptrQ = []
      gl.deleteVertexArray(vao)
      gl.deleteBuffer(corners)
      gl.deleteBuffer(inst)
    },
  }
}
