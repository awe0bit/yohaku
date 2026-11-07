import { clamp, rnd, TAU } from './math'

export const NOISE_SIZE = 256

const N = NOISE_SIZE

let cached: HTMLCanvasElement | null = null

const makeFiberNoise = () => {
  const c = document.createElement('canvas')
  c.width = N
  c.height = N
  const x = c.getContext('2d')!
  x.fillStyle = 'rgb(90,90,90)'
  x.fillRect(0, 0, N, N)
  x.lineCap = 'round'
  for (let k = 0; k < 900; k++) {
    const px = rnd(0, N)
    const py = rnd(0, N)
    const a = rnd(0, TAU)
    const L = rnd(6, 40)
    const v = Math.round(rnd(110, 255))
    x.strokeStyle = `rgba(${v},${v},${v},${rnd(0.25, 0.7)})`
    x.lineWidth = rnd(0.6, 1.8)
    for (const ox of [-N, 0, N])
      for (const oy of [-N, 0, N]) {
        x.beginPath()
        x.moveTo(px + ox, py + oy)
        x.quadraticCurveTo(
          px + ox + Math.cos(a + 0.4) * L * 0.5,
          py + oy + Math.sin(a + 0.4) * L * 0.5,
          px + ox + Math.cos(a) * L,
          py + oy + Math.sin(a) * L,
        )
        x.stroke()
      }
  }
  const img = x.getImageData(0, 0, N, N)
  for (let i = 0; i < img.data.length; i += 4) {
    const v = clamp(img.data[i] + rnd(-30, 30), 0, 255)
    img.data[i] = v
    img.data[i + 1] = v
    img.data[i + 2] = v
    img.data[i + 3] = 255
  }
  x.putImageData(img, 0, 0)
  return c
}

export const fiberNoise = () => (cached ??= makeFiberNoise())
