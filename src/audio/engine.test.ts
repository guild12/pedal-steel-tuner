import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TunerEngine, type EngineStatus } from './engine'

describe('TunerEngine status', () => {
  const mediaDevices = new EventTarget() as EventTarget & Record<string, unknown>
  let track: EventTarget

  beforeEach(() => {
    track = Object.assign(new EventTarget(), { label: "Fake mic", stop: vi.fn() })
    const stream = { getTracks: () => [track], getAudioTracks: () => [track] }
    mediaDevices.getUserMedia = vi.fn(async () => stream)
    Object.defineProperty(navigator, 'mediaDevices', { value: mediaDevices, configurable: true })
    class FakeContext extends EventTarget {
      state = 'running'
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
})
