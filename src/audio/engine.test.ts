import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TunerEngine, type EngineStatus } from './engine'

describe('TunerEngine status', () => {
  const mediaDevices = new EventTarget() as EventTarget & Record<string, unknown>
  let track: EventTarget
  const contexts: { state: string }[] = []

  beforeEach(() => {
    contexts.length = 0
    track = Object.assign(new EventTarget(), { label: "Fake mic", stop: vi.fn() })
    const stream = { getTracks: () => [track], getAudioTracks: () => [track] }
    mediaDevices.getUserMedia = vi.fn(async () => stream)
    Object.defineProperty(navigator, 'mediaDevices', { value: mediaDevices, configurable: true })
    class FakeContext extends EventTarget {
      state = 'running'
      constructor() {
        super()
        contexts.push(this)
      }
      sampleRate = 48000
      resume = async () => {}
      close = async () => {}
      createMediaStreamSource = () => ({ connect: () => {}, disconnect: () => {} })
      createAnalyser = () => ({ fftSize: 0, getFloatTimeDomainData: () => {} })
    }
    vi.stubGlobal('AudioContext', FakeContext)
    vi.stubGlobal('requestAnimationFrame', () => 1)
    vi.stubGlobal('cancelAnimationFrame', () => {})
  })

  afterEach(() => vi.unstubAllGlobals())

  it('a devicechange while interrupted does not flip the status back to running', async () => {
    const statuses: EngineStatus[] = []
    const engine = new TunerEngine(() => {}, (s) => statuses.push(s))
    await engine.start()
    expect(statuses.at(-1)).toBe('running')

    track.dispatchEvent(new Event('mute'))
    expect(statuses.at(-1)).toBe('interrupted')

    mediaDevices.dispatchEvent(new Event('devicechange'))
    expect(statuses.at(-1)).toBe('interrupted')
    engine.stop()
  })

  it('concurrent start() calls only open the microphone once', async () => {
    const engine = new TunerEngine(() => {}, () => {})
    await Promise.all([engine.start(), engine.start()])
    expect(mediaDevices.getUserMedia).toHaveBeenCalledTimes(1)
    engine.stop()
  })

  it('reports a missing Wake Lock so the UI can hint', async () => {
    const engine = new TunerEngine(() => {}, () => {})
    await engine.start()
    expect(engine.wakeLockMissing).toBe(true)
    engine.stop()
  })

  it('reports Wake Lock present when the request succeeds', async () => {
    Object.defineProperty(navigator, 'wakeLock', {
      value: { request: async () => Object.assign(new EventTarget(), { release: async () => {} }) },
      configurable: true,
    })
    const engine = new TunerEngine(() => {}, () => {})
    await engine.start()
    expect(engine.wakeLockMissing).toBe(false)
    engine.stop()
    delete (navigator as unknown as Record<string, unknown>).wakeLock
  })

  it('emits no frames while the audio context is not running', async () => {
    let tick: ((t: number) => void) | null = null
    vi.stubGlobal('requestAnimationFrame', (cb: (t: number) => void) => {
      tick = cb
      return 1
    })
    const onFrame = vi.fn()
    const engine = new TunerEngine(onFrame, () => {})
    await engine.start()
    tick!(0)
    expect(onFrame).toHaveBeenCalledTimes(1)
    contexts[0].state = 'suspended'
    tick!(16)
    tick!(32)
    expect(onFrame).toHaveBeenCalledTimes(1)
    engine.stop()
  })
})
