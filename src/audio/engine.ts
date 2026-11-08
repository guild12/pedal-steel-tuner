import { detectPitch, requiredSamples } from '../pitch/detect'

export interface Frame {
  frequency: number | null
  clarity: number
  rms: number
  timeMs: number
}

export type EngineStatus = 'idle' | 'running' | 'interrupted' | 'blocked' | 'insecure' | 'error'

type Sentinel = EventTarget & { release(): Promise<void> }

function nextPowerOfTwo(n: number): number {
  return Math.min(32768, 2 ** Math.ceil(Math.log2(n)))
}

/** Microphone capture + pitch detection loop, ported from the Phase 0 page (proven on iOS Safari). */
export class TunerEngine {
  private ctx: AudioContext | null = null
  private stream: MediaStream | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private analyser: AnalyserNode | null = null
  private wakeLock: Sentinel | null = null
  private buffer = new Float32Array(0)
  private needed = 0
  private running = false
  private rafId: number | null = null
  private listening = false
  private _inputLabel = ''
  private status: EngineStatus = 'idle'
  private starting: Promise<void> | null = null
  private _wakeLockMissing = false

  constructor(
    private readonly onFrame: (f: Frame) => void,
    private readonly onStatusChange: (s: EngineStatus, detail?: string) => void,
  ) {}

  private onStatus(s: EngineStatus, detail?: string): void {
    this.status = s
    this.onStatusChange(s, detail)
  }

  get sampleRate(): number | null {
    return this.ctx?.sampleRate ?? null
  }

  get inputLabel(): string {
    return this._inputLabel
  }

  /** True when the screen can't be kept awake (no Wake Lock API, or the request failed). */
  get wakeLockMissing(): boolean {
    return this._wakeLockMissing
  }

  /** A second call while one is in flight (double tap) shares it instead of opening the mic twice. */
  start(deviceId?: string): Promise<void> {
    if (this.starting) return this.starting
    const p = this.doStart(deviceId).finally(() => {
      this.starting = null
    })
    this.starting = p
    return p
  }

  private async doStart(deviceId?: string): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      this.onStatus('insecure')
      return
    }
    try {
      this.releaseStream()
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
        },
      })
      if (!this.ctx) {
        this.ctx = new AudioContext()
        this.ctx.addEventListener('statechange', () => {
          if (this.ctx && this.ctx.state !== 'running' && this.running) this.onStatus('interrupted')
        })
      }
      await this.ctx.resume()
      this.source = this.ctx.createMediaStreamSource(this.stream)
      this.analyser = this.ctx.createAnalyser()
      this.needed = requiredSamples(this.ctx.sampleRate)
      this.analyser.fftSize = nextPowerOfTwo(this.needed)
      this.buffer = new Float32Array(this.analyser.fftSize)
      this.source.connect(this.analyser)

      const track = this.stream.getAudioTracks()[0]
      this._inputLabel = track?.label ?? ''
      track.addEventListener('mute', this.interrupted)
      track.addEventListener('ended', this.interrupted)
      this.addGlobalListeners()
      await this.keepScreenAwake()
      this.onStatus('running')
      if (!this.running) {
        this.running = true
        this.rafId = requestAnimationFrame(this.loop)
      }
    } catch (err) {
      const name = err instanceof DOMException ? err.name : ''
      if (name === 'NotAllowedError') this.onStatus('blocked')
      else this.onStatus('error', err instanceof Error ? err.message : String(err))
    }
  }

  stop(): void {
    this.running = false
    if (this.rafId !== null) cancelAnimationFrame(this.rafId)
    this.rafId = null
    this.releaseStream()
    void this.ctx?.close()
    this.ctx = null
    this.analyser = null
    void this.wakeLock?.release().catch(() => {})
    this.wakeLock = null
    if (this.listening) {
      navigator.mediaDevices?.removeEventListener('devicechange', this.onDeviceChange)
      document.removeEventListener('visibilitychange', this.onVisibility)
      this.listening = false
    }
    this.onStatus('idle')
  }

  /** Audio inputs; labels fall back to "Input n" until permission is granted. */
  async inputs(): Promise<{ id: string; label: string }[]> {
    const devices = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'audioinput')
    return devices.map((d, i) => ({ id: d.deviceId, label: d.label || `Input ${i + 1}` }))
  }

  private releaseStream(): void {
    this.stream?.getTracks().forEach((t) => t.stop())
    this.source?.disconnect()
    this.stream = null
    this.source = null
  }

  private readonly interrupted = (): void => {
    this.onStatus('interrupted')
  }

  private readonly onDeviceChange = (): void => {
    // Input list changed: re-announce "running" so the UI re-reads inputs().
    if (this.stream && this.status === 'running') this.onStatus('running')
  }

  private readonly onVisibility = (): void => {
    if (document.visibilityState !== 'visible' || !this.running) return
    if (this.ctx && this.ctx.state !== 'running') this.onStatus('interrupted')
    else if (!this.wakeLock) void this.keepScreenAwake()
  }

  private addGlobalListeners(): void {
    if (this.listening) return
    navigator.mediaDevices?.addEventListener('devicechange', this.onDeviceChange)
    document.addEventListener('visibilitychange', this.onVisibility)
    this.listening = true
  }

  private async keepScreenAwake(): Promise<void> {
    // Wake Lock needs iOS 18.4+ in a Home Screen app; older versions just skip it.
    const nav = navigator as Navigator & { wakeLock?: { request(type: 'screen'): Promise<Sentinel> } }
    try {
      const sentinel = (await nav.wakeLock?.request('screen')) ?? null
      this._wakeLockMissing = sentinel === null
      // iOS releases the lock whenever the page is hidden; clear it so it's requested again.
      sentinel?.addEventListener('release', () => {
        this.wakeLock = null
      })
      this.wakeLock = sentinel
    } catch {
      this.wakeLock = null
      this._wakeLockMissing = true
    }
  }

  private readonly loop = (time: number): void => {
    if (!this.running) return
    // A suspended context's buffer is frozen; emitting it would show an old note as live.
    if (this.analyser && this.ctx && this.ctx.state === 'running') {
      this.analyser.getFloatTimeDomainData(this.buffer)
      // The newest samples are at the end of the analyser's buffer.
      const recent = this.buffer.subarray(this.buffer.length - this.needed)
      let sumSq = 0
      for (let i = 0; i < recent.length; i++) sumSq += recent[i] * recent[i]
      const rms = Math.sqrt(sumSq / recent.length)
      const result = detectPitch(recent, this.ctx.sampleRate)
      this.onFrame({
        frequency: result?.frequency ?? null,
        clarity: result?.clarity ?? 0,
        rms,
        timeMs: time,
      })
    }
    this.rafId = requestAnimationFrame(this.loop)
  }
}
