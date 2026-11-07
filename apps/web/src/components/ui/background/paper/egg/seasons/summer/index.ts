import type { SeasonFactory } from '../types'
import { createSwarm } from './flies'
import { drawGrass, GRASS_H } from './grass'
import { smoothstep } from './math'
import {
  MAX_FLIES,
  NIGHT_FS,
  NIGHT_UNIFORMS,
  SPARK_FS,
  SPARK_UNIFORMS,
} from './shaders'

const DAWN_S = 3.6

export const summerEffect: SeasonFactory = (live) => {
  const { gl } = live
  const { dark } = live.season
  const prog = live.program(NIGHT_FS, NIGHT_UNIFORMS)
  const sparkProg = live.program(SPARK_FS, SPARK_UNIFORMS)
  const spark = live.target(Math.ceil(live.w / 2), Math.ceil(live.h / 2), {
    float: true,
  })
  const grassTex = live.upload(drawGrass(live.w))
  const night = dark ? [0.0045, 0.0055, 0.0105] : [0.0011, 0.0017, 0.0046]
  const floor = dark ? [0.0016, 0.0021, 0.0042] : [0, 0, 0]
  const swarm = createSwarm(live)
  const F = new Float32Array(MAX_FLIES * 4)
  const G = new Float32Array(MAX_FLIES * 4)

  let T = 0
  let dawn = false
  let dawnT = 0
  let kExit = 0
  let started = false
  let finished = false
  live.setCursor('none')

  return {
    frame: (dt) => {
      if (finished || (dawn && kExit <= 0)) {
        live.drawPage()
        if (!finished) live.setCursor('')
        finished = true
        return
      }
      if (!started) {
        if (!prog.ready() || !sparkProg.ready()) {
          live.drawPage()
          return
        }
        started = true
      }
      T += dt
      if (dawn) dawnT += dt
      const pd = Math.min(1, dawnT / DAWN_S)
      const fadeAll = swarm.step(dt, T, dawn ? pd : null)
      const end = dawn && dawnT >= DAWN_S
      const K = dawn ? kExit : smoothstep(0.15, 5.6, T)
      const front = dawn
        ? -0.02 + 1.62 * (0.5 - 0.5 * Math.cos(Math.PI * pd))
        : -1
      const dawnOn = dawn ? Math.sin(Math.PI * pd) : 0

      const n = swarm.pack(T, F, G)
      const any = !end && (n > 0 || swarm.pouch.a > 0.001) ? 1 : 0

      if (K > 0 && !end) {
        sparkProg.use()
        gl.uniform1f(sparkProg.u.uK, K)
        gl.uniform1i(sparkProg.u.uN, n)
        gl.uniform4fv(sparkProg.u.uF, F)
        gl.uniform4fv(sparkProg.u.uG, G)
        live.draw(spark)
      }

      const { u } = prog
      prog.use()
      live.bind(4, grassTex)
      live.bind(5, spark.tex)
      gl.uniform1i(u.uGrass, 4)
      gl.uniform1i(u.uSpark, 5)
      gl.uniform1f(u.uK, end ? 0 : K)
      gl.uniform1f(u.uFront, front)
      gl.uniform1f(u.uDawnOn, end ? 0 : dawnOn)
      gl.uniform1f(u.uT, T)
      gl.uniform1f(u.uAny, any)
      gl.uniform1f(u.uGrassH, GRASS_H)
      gl.uniform1f(u.uLift, dark ? 3 : 1)
      gl.uniform3fv(u.uNight, night)
      gl.uniform3fv(u.uFloor, floor)
      gl.uniform3fv(u.uBok, live.season.light.bokashi)
      gl.uniform1i(u.uN, end ? 0 : n)
      gl.uniform4fv(u.uF, F)
      gl.uniform4fv(u.uG, G)
      const { ptr, pouch } = swarm
      gl.uniform4f(
        u.uPouch,
        ptr.x,
        ptr.y,
        pouch.th,
        end ? 0 : pouch.a * fadeAll,
      )
      gl.uniform1f(u.uSack, swarm.glow)
      live.draw()
      if (end) {
        finished = true
        live.setCursor('')
      }
    },
    pointer: ({ kind, x, y }) => {
      const { ptr } = swarm
      if (kind === 'leave') {
        ptr.on = false
        return
      }
      ptr.x = x
      ptr.y = y
      ptr.on = true
      ptr.moved = true
    },
    exit: () => {
      if (dawn) return
      dawn = true
      kExit = smoothstep(0.15, 5.6, T)
    },
    get done() {
      return finished
    },
    dispose: () => live.setCursor(''),
  }
}
