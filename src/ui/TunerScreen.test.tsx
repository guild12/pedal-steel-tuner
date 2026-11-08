import { act, render, renderHook, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import type { Frame } from '../audio/engine'
import type { Shown } from '../pitch/display'
import { sierra14 } from '../model/seeds/sierra14'
import type { Profile } from '../model/types'
import { TunerScreen } from './TunerScreen'
import { useTuner } from './useTuner'

const fake = vi.hoisted(() => ({
  onFrame: null as null | ((f: Frame) => void),
}))
vi.mock('../audio/engine', () => ({
  TunerEngine: class {
    inputLabel = 'Mic'
    sampleRate = 48000
    constructor(onFrame: (f: Frame) => void) {
      fake.onFrame = onFrame
    }
    start = vi.fn()
    stop = vi.fn()
    inputs = vi.fn(async () => [])
  },
}))

const withDrop = (cabinetDrop: number): Profile => ({ ...sierra14, cabinetDrop })
const shown = (note: Shown['note'], octave: number, cents: number, held = false): Shown => ({
  note, octave, cents, held,
})

function renderScreen(s: Shown | null, profile = withDrop(5), lock = null as null | { string: number; change: string | null; stop: number }) {
  const onLock = vi.fn()
  render(<TunerScreen profile={profile} shown={s} status="running" lock={lock} onLock={onLock} onOpenSettings={() => {}} />)
  return onLock
}
const readout = (name: string) =>
  within(screen.getByRole('region', { name })).getByTestId('readout')

describe('TunerScreen', () => {
  test('two gauges read their own deviations', () => {
    renderScreen(shown('C#', 4, -14.49))
    expect(readout('A+B down')).toHaveTextContent('+0.0¢')
    expect(readout('Pedals up')).toHaveTextContent('−5.0¢')
    expect(screen.queryByText(/Cabinet drop not set/)).not.toBeInTheDocument()
  })

  test('with no cabinet drop both gauges agree and the hint shows', () => {
    renderScreen(shown('C#', 4, -10), withDrop(0))
    expect(readout('Pedals up').textContent).toBe(readout('A+B down').textContent)
    expect(screen.getByText(/Cabinet drop not set/)).toBeVisible()
  })

  test('a note with no copedent position still shows both gauges and no chips', () => {
    renderScreen(shown('C', 4, -3))
    expect(readout('Pedals up')).toHaveTextContent(/\d/)
    expect(readout('A+B down')).toHaveTextContent(/\d/)
    expect(screen.queryAllByTestId('override-chip')).toHaveLength(0)
  })

  test('override chip locks its position', async () => {
    const onLock = renderScreen(shown('F#', 4, -14))
    const chip = screen.getByRole('button', { name: /P3/ })
    expect(chip).toHaveTextContent('−14.5¢')
    await userEvent.click(chip)
    expect(onLock).toHaveBeenCalledWith({ string: 5, change: 'P3', stop: 0 })
  })

  test('locked view shows one gauge titled with the position', () => {
    renderScreen(shown('C#', 4, -9), withDrop(5), { string: 3, change: 'RKR', stop: 1 })
    expect(screen.getAllByRole('region')).toHaveLength(1)
    expect(screen.getByRole('region', { name: 'String 3 · RKR → C#4' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Unlock' })).toBeInTheDocument()
  })

  test('string strip picker sets the lock', async () => {
    const onLock = renderScreen(shown('E', 4, 0))
    await userEvent.click(screen.getByRole('button', { name: /String 6/ }))
    await userEvent.click(screen.getByRole('button', { name: /P1/ }))
    expect(onLock).toHaveBeenCalledWith({ string: 6, change: 'P1', stop: 0 })
  })

  test('held dims the gauges', () => {
    renderScreen(shown('E', 4, 0, true))
    expect(screen.getByRole('region', { name: 'Pedals up' })).toHaveStyle({ opacity: '0.5' })
  })
})

describe('useTuner A reference', () => {
  beforeEach(() => {
    fake.onFrame = null
  })

  test('changing aRef re-reads on the next frame', () => {
    const { result, rerender } = renderHook(({ p }) => useTuner(p), {
      initialProps: { p: { ...sierra14, aRef: 440 } },
    })
    act(() => result.current.start())
    act(() => fake.onFrame!({ frequency: 442, clarity: 1, rms: 0.1, timeMs: 0 }))
    expect(result.current.shown?.note).toBe('A')
    expect(result.current.shown?.cents).toBeCloseTo(7.85, 1)

    rerender({ p: { ...sierra14, aRef: 442 } })
    act(() => fake.onFrame!({ frequency: 442, clarity: 1, rms: 0.1, timeMs: 16 }))
    expect(result.current.shown?.cents).toBeCloseTo(0, 1)
  })
})
