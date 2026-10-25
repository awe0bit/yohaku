import type { BgmScene } from './scene'

const SOURCE = '/bgm/ma.mp3'

const SCENES: Record<BgmScene, { gain: number; lowpass: number }> = {
  home: { gain: 0.9, lowpass: 20000 },
  reading: { gain: 0.68, lowpass: 5000 },
  night: { gain: 0.78, lowpass: 3400 },
}

export interface BgmState {
  enabled: boolean
  pending: boolean
  scene: BgmScene
}

type Listener = (state: BgmState) => void

/**
 * A single loop for the whole site. The decoded buffer is held at module scope
 * so route changes and layout remounts do not restart the piece. Nothing is
 * fetched until the footer switch is turned on.
 */
class BgmEngine {
  private ctx: AudioContext | null = null
  private gain: GainNode | null = null
  private filter: BiquadFilterNode | null = null
  private source: AudioBufferSourceNode | null = null
  private buffer: AudioBuffer | null = null
  private loading: Promise<AudioBuffer> | null = null
  private listeners = new Set<Listener>()
  private state: BgmState = { enabled: false, pending: false, scene: 'home' }
  private token = 0

  getState = () => this.state

  subscribe = (listener: Listener) => {
    this.listeners.add(listener)
    listener(this.state)
    return () => {
      this.listeners.delete(listener)
    }
  }

  setEnabled = async (enabled: boolean) => {
    if (enabled) await this.enable()
    else this.disable()
  }

  toggle = async () => {
    await this.setEnabled(!this.state.enabled)
  }

  setScene = (scene: BgmScene) => {
    if (this.state.scene === scene) return
    this.emit({ scene })
    const ctx = this.ctx
    const filter = this.filter
    if (ctx && filter) {
      const now = ctx.currentTime
      filter.frequency.cancelScheduledValues(now)
      filter.frequency.setValueAtTime(filter.frequency.value, now)
      filter.frequency.linearRampToValueAtTime(SCENES[scene].lowpass, now + 1.2)
    }
    if (this.state.enabled) this.fadeTo(SCENES[scene].gain, 1.2)
  }

  private emit(patch: Partial<BgmState>) {
    this.state = { ...this.state, ...patch }
    for (const listener of this.listeners) listener(this.state)
  }

  private ensure() {
    if (this.ctx) return
    const ctx = new AudioContext()
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = SCENES[this.state.scene].lowpass
    filter.Q.value = 0.4
    const gain = ctx.createGain()
    gain.gain.value = 0
    filter.connect(gain).connect(ctx.destination)
    this.ctx = ctx
    this.filter = filter
    this.gain = gain
  }

  private load() {
    if (this.buffer) return Promise.resolve(this.buffer)
    this.loading ??= fetch(SOURCE)
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status} ${SOURCE}`)
        return res.arrayBuffer()
      })
      .then((data) => this.ctx!.decodeAudioData(data))
      .then((buffer) => {
        this.buffer = buffer
        return buffer
      })
      .catch((error) => {
        this.loading = null
        throw error
      })
    return this.loading
  }

  private async enable() {
    if (this.state.enabled || this.state.pending) return
    const token = ++this.token
    this.emit({ pending: true })
    try {
      this.ensure()
      const ctx = this.ctx!
      // Stay inside the footer click gesture while asking the context to run.
      const resumed = ctx.state === 'running' ? Promise.resolve() : ctx.resume()
      const buffer = await this.load()
      await resumed
      if (token !== this.token) return
      if (!this.source) {
        const source = ctx.createBufferSource()
        source.buffer = buffer
        source.loop = true
        source.connect(this.filter!)
        source.start()
        this.source = source
      }
      this.emit({ enabled: true, pending: false })
      this.fadeTo(SCENES[this.state.scene].gain, 1.2)
    } catch {
      if (token !== this.token) return
      this.emit({ enabled: false, pending: false })
      this.fadeTo(0, 0.2)
    }
  }

  private disable() {
    ++this.token
    this.emit({ enabled: false, pending: false })
    this.fadeTo(0, 0.6)
  }

  private fadeTo(value: number, seconds: number) {
    const ctx = this.ctx
    const gain = this.gain
    if (!ctx || !gain) return
    const now = ctx.currentTime
    gain.gain.cancelScheduledValues(now)
    gain.gain.setValueAtTime(gain.gain.value, now)
    gain.gain.linearRampToValueAtTime(value, now + seconds)
  }
}

export const bgmEngine = new BgmEngine()
