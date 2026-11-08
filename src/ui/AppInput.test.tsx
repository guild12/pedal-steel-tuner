import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'

const fake = vi.hoisted(() => ({
  start: null as null | ReturnType<typeof import('vitest').vi.fn>,
  inputs: [] as { id: string; label: string }[],
  wakeLockMissing: false,
  release: null as null | (() => void),
}))

vi.mock('../audio/engine', () => ({
  TunerEngine: class {
    inputLabel = 'iRig HD X'
    sampleRate = 48000
    get wakeLockMissing() {
      return fake.wakeLockMissing
    }
    constructor(_f: unknown, private onStatus: (s: string) => void) {}
    start = (fake.start = vi.fn(
      (_id?: string) =>
        new Promise<void>((resolve) => {
          fake.release = () => {
            this.onStatus('running')
            resolve()
          }
        }),
    ))
    stop = vi.fn()
    inputs = async () => fake.inputs
  },
}))

beforeEach(() => {
  localStorage.clear()
  fake.inputs = []
  fake.wakeLockMissing = false
})

async function startApp() {
  render(<App />)
  await userEvent.click(screen.getByRole('button', { name: 'Start' }))
  await act(async () => fake.release!())
}

describe('input label and picker', () => {
  it('shows the active input and, with two inputs, a picker that restarts on that input', async () => {
    fake.inputs = [{ id: 'a', label: 'iRig HD X' }, { id: 'b', label: 'iPhone Microphone' }]
    await startApp()
    expect(screen.getByText(/Input: iRig HD X/)).toBeTruthy()
    const select = screen.getByRole('combobox', { name: 'Audio input' })
    await userEvent.selectOptions(select, 'b')
    expect(fake.start).toHaveBeenLastCalledWith('b')
  })

  it('shows no picker with a single input', async () => {
    fake.inputs = [{ id: 'a', label: 'iRig HD X' }]
    await startApp()
    expect(screen.getByText(/Input: iRig HD X/)).toBeTruthy()
    expect(screen.queryByRole('combobox', { name: 'Audio input' })).toBeNull()
  })
})

describe('Wake Lock hint and Start button', () => {
  it('hints to set Auto-Lock to Never when the screen cannot be kept awake', async () => {
    fake.wakeLockMissing = true
    await startApp()
    expect(screen.getByText(/Set Auto-Lock to Never while tuning \(Settings → Display & Brightness\)\./)).toBeTruthy()
  })

  it('shows no hint when Wake Lock works', async () => {
    await startApp()
    expect(screen.queryByText(/Auto-Lock/)).toBeNull()
  })

  it('disables Start while starting', async () => {
    render(<App />)
    const btn = screen.getByRole('button', { name: 'Start' }) as HTMLButtonElement
    await userEvent.click(btn)
    expect(btn.disabled).toBe(true)
    await act(async () => fake.release!())
  })
})
