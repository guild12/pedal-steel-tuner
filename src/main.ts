import { createGauge } from './gauge'
import { detectPitch, requiredSamples } from './pitch/detect'
import { noteFromFrequency } from './pitch/notes'
import { SteadinessTracker } from './stats'

const style = document.createElement('style')
style.textContent = `
  :root { color-scheme: dark; }
  body { margin: 0; background: #0f1216; color: #e8ecf1; font-family: -apple-system, system-ui, sans-serif; }
  #app { max-width: 420px; margin: 0 auto; padding: 20px 16px 32px; text-align: center; }
  h1 { font-size: 15px; font-weight: 600; color: #94a0ad; margin: 0 0 14px; }
  button, select { font: inherit; font-size: 16px; border-radius: 10px; border: 0; padding: 10px 14px; }
  button { background: #35c46f; color: #06170d; font-weight: 700; width: 100%; }
  select { background: #1d232a; color: #e8ecf1; width: 100%; margin-top: 10px; }
  .note { font-size: 64px; font-weight: 800; line-height: 1; margin-top: 18px; }
  .note small { font-size: 26px; color: #94a0ad; font-weight: 600; }
  .gauge { display: flex; justify-content: center; margin: 10px 0 4px; }
  .cents { font-size: 34px; font-weight: 700; font-variant-numeric: tabular-nums; }
  .row { color: #94a0ad; font-size: 15px; margin-top: 6px; font-variant-numeric: tabular-nums; }
  .steady { font-size: 20px; color: #e8ecf1; font-weight: 600; }
  .msg { background: #3b1d1d; color: #ffb4b4; border-radius: 10px; padding: 12px; margin-top: 12px; text-align: left; }
  footer { margin-top: 22px; font-size: 12px; color: #6b7682; }
`
document.head.appendChild(style)

const app = document.getElementById('app')!
app.innerHTML = `
  <h1>Steel Tuner · Phase 0 accuracy test</h1>
  <button id="start">Start</button>
  <select id="input" hidden></select>
  <div id="msg" class="msg" hidden></div>
  <div class="note" id="note">—</div>
  <div class="gauge" id="gauge"></div>
  <div class="cents" id="cents">&nbsp;</div>
  <div class="row" id="hz">&nbsp;</div>
  <div class="row">Steadiness <span class="steady" id="steady">—</span> · Note jumps <span id="jumps">0</span></div>
  <div class="row">Level <span id="level">—</span></div>
  <footer id="footer">A = 440 Hz</footer>
`

const $ = (id: string) => document.getElementById(id)!
const startBtn = $('start') as HTMLButtonElement
const inputSel = $('input') as HTMLSelectElement
const gauge = createGauge($('gauge'))
const steadiness = new SteadinessTracker()

let ctx: AudioContext | null = null
let stream: MediaStream | null = null
let source: MediaStreamAudioSourceNode | null = null
let analyser: AnalyserNode | null = null
let wakeLock: { release(): Promise<void> } | null = null
let buffer = new Float32Array(0)
let needed = 0
let running = false

function showMessage(text: string | null): void {
  const el = $('msg')
  el.hidden = text === null
  el.textContent = text ?? ''
}

function showResume(): void {
  startBtn.textContent = 'Tap to resume'
  startBtn.hidden = false
  showMessage('Listening stopped (the phone locked or another app took the audio). Tap to resume.')
}

function nextPowerOfTwo(n: number): number {
  return Math.min(32768, 2 ** Math.ceil(Math.log2(n)))
}

function activeTrack(): MediaStreamTrack | undefined {
  return stream?.getAudioTracks()[0]
}

async function refreshInputs(): Promise<void> {
  const track = activeTrack()
  const activeId = track?.getSettings().deviceId
  const devices = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'audioinput')
  inputSel.innerHTML = ''
  devices.forEach((d, i) => {
    const opt = document.createElement('option')
    opt.value = d.deviceId
    opt.textContent = d.label || `Input ${i + 1}`
    opt.selected = d.deviceId === activeId
    inputSel.appendChild(opt)
  })
  inputSel.hidden = devices.length === 0
  if (ctx) $('footer').textContent = `A = 440 Hz · Sample rate ${ctx.sampleRate} Hz · Input: ${track?.label || 'default'}`
}

async function keepScreenAwake(): Promise<void> {
  // Wake Lock needs iOS 18.4+ in a Home Screen app; older versions just skip it.
  type Sentinel = EventTarget & { release(): Promise<void> }
  const nav = navigator as Navigator & { wakeLock?: { request(type: 'screen'): Promise<Sentinel> } }
  try {
    const sentinel = (await nav.wakeLock?.request('screen')) ?? null
    // iOS releases the lock whenever the page is hidden; clear it so it's requested again.
    sentinel?.addEventListener('release', () => {
      wakeLock = null
    })
    wakeLock = sentinel
  } catch {
    wakeLock = null
  }
}

async function start(deviceId?: string): Promise<void> {
  if (!navigator.mediaDevices?.getUserMedia) {
    showMessage('This page must be opened over https.')
    return
  }
  try {
    stream?.getTracks().forEach((t) => t.stop())
    source?.disconnect()
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
      },
    })
    if (!ctx) {
      ctx = new AudioContext()
      ctx.addEventListener('statechange', () => {
        if (ctx && ctx.state !== 'running' && running) showResume()
      })
    }
    await ctx.resume()
    source = ctx.createMediaStreamSource(stream)
    analyser = ctx.createAnalyser()
    needed = requiredSamples(ctx.sampleRate)
    analyser.fftSize = nextPowerOfTwo(needed)
    buffer = new Float32Array(analyser.fftSize)
    source.connect(analyser)

    const track = activeTrack()!
    track.addEventListener('mute', showResume)
    track.addEventListener('ended', showResume)
    await refreshInputs()
    await keepScreenAwake()
    showMessage(null)
    startBtn.hidden = true
    if (!running) {
      running = true
      requestAnimationFrame(loop)
    }
  } catch (err) {
    const name = err instanceof DOMException ? err.name : ''
    showMessage(
      name === 'NotAllowedError'
        ? 'Microphone access was blocked. Allow it in Settings → Safari → Microphone, then reload.'
        : `Couldn't start the input: ${err instanceof Error ? err.message : String(err)}`,
    )
  }
}

function loop(time: number): void {
  if (analyser && ctx) {
    analyser.getFloatTimeDomainData(buffer)
    // The newest samples are at the end of the analyser's buffer.
    const recent = buffer.subarray(buffer.length - needed)
    let sumSq = 0
    for (let i = 0; i < recent.length; i++) sumSq += recent[i] * recent[i]
    const rms = Math.sqrt(sumSq / recent.length)
    $('level').textContent = rms > 0 ? `${(20 * Math.log10(rms)).toFixed(0)} dB` : '—'

    const result = detectPitch(recent, ctx.sampleRate)
    if (result === null) {
      steadiness.pushSilence(time)
      $('note').textContent = '—'
      $('cents').innerHTML = '&nbsp;'
      $('hz').innerHTML = '&nbsp;'
      gauge.update(null)
    } else {
      const reading = noteFromFrequency(result.frequency)
      steadiness.pushNote(reading.midi, reading.cents, time)
      const sign = reading.cents >= 0 ? '+' : '−'
      $('note').innerHTML = `${reading.name}<small>${reading.octave}</small>`
      $('cents').textContent = `${sign}${Math.abs(reading.cents).toFixed(1)}¢`
      $('hz').textContent = `${result.frequency.toFixed(2)} Hz`
      gauge.update(reading.cents)
    }
    $('steady').textContent = steadiness.text
    $('jumps').textContent = String(steadiness.jumps)
  }
  requestAnimationFrame(loop)
}

startBtn.addEventListener('click', () => void start(inputSel.hidden ? undefined : inputSel.value || undefined))
inputSel.addEventListener('change', () => void start(inputSel.value))
navigator.mediaDevices?.addEventListener('devicechange', () => {
  if (stream) void refreshInputs()
})
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible' || !running) return
  if (ctx && ctx.state !== 'running') showResume()
  else if (!wakeLock) void keepScreenAwake()
})
