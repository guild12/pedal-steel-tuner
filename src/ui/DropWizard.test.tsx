import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { sierra14 } from '../model/seeds/sierra14'
import type { Shown } from '../pitch/display'
import { DropWizard } from './DropWizard'

const e = (cents: number): Shown => ({ note: 'E', octave: 4, cents, held: false })

function feed(ui: (s: Shown, t: number) => void, from: number, centsAt: (i: number) => number) {
  for (let i = 0; i <= 9; i++) ui(e(centsAt(i)), from + i * 100)
}

function setup() {
  const onSave = vi.fn()
  const onCancel = vi.fn()
  const view = render(<DropWizard profile={sierra14} shown={null} nowMs={0} onSave={onSave} onCancel={onCancel} />)
  const push = (s: Shown, t: number) =>
    view.rerender(<DropWizard profile={sierra14} shown={s} nowMs={t} onSave={onSave} onCancel={onCancel} />)
  return { onSave, onCancel, push }
}

describe('DropWizard', () => {
  it('flags an unsteady reading and keeps Save disabled', () => {
    const { push } = setup()
    feed(push, 0, (i) => (i % 2 ? 6 : -6))
    expect(screen.getByText(/Pluck again — the reading wasn't steady/)).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('measures up then down and saves the drop', () => {
    const { push, onSave } = setup()
    expect(screen.getByText(/Pluck your high E/)).toBeTruthy()
    feed(push, 0, () => 2.0)
    expect(screen.getByText(/Now hold A and B/)).toBeTruthy()
    feed(push, 2000, () => -4.3)
    expect(screen.getByText(/Drop: 6\.3¢/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSave).toHaveBeenCalledWith(6.3)
  })

  it('accepts a typed value', () => {
    const { onSave } = setup()
    fireEvent.change(screen.getByLabelText(/type it in/i), { target: { value: '5.5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSave).toHaveBeenCalledWith(5.5)
  })

  it('does not complete a step from a stray reading, a gap, then one sample', () => {
    const { push } = setup()
    push(e(2.0), 0)
    push(null as unknown as Shown, 100)
    push(e(2.0), 5000)
    expect(screen.getByText(/Pluck your high E/)).toBeTruthy()
    expect(screen.queryByText(/Now hold A and B/)).toBeNull()
  })

  it('does not complete step 2 from the still-ringing step-1 note', () => {
    const { push } = setup()
    feed(push, 0, () => 2.0)
    expect(screen.getByText(/Now hold A and B/)).toBeTruthy()
    for (let t = 1000; t <= 2500; t += 100) push(e(2.0), t)
    expect(screen.getByText(/Now hold A and B/)).toBeTruthy()
  })

  it('does not re-arm step 2 on an upward drift of the still-ringing note', () => {
    const { push } = setup()
    feed(push, 0, () => 2.0)
    expect(screen.getByText(/Now hold A and B/)).toBeTruthy()
    for (let t = 1000; t <= 3000; t += 100) push(e(3.5), t)
    expect(screen.getByText(/Now hold A and B/)).toBeTruthy()
    expect(screen.queryByText(/Drop:/)).toBeNull()
  })

  it('rejects a pair whose drop is under 0.5 with a hint, and stays on step 2', () => {
    const { push } = setup()
    feed(push, 0, () => 2.0)
    push(null as unknown as Shown, 1500)
    feed(push, 2000, () => 1.7)
    expect(screen.getByText("Didn't see a drop — hold A and B fully and pluck again.")).toBeTruthy()
    expect(screen.getByText(/Now hold A and B/)).toBeTruthy()
    expect(screen.queryByText(/Drop:/)).toBeNull()
  })

  it('rejects a measured drop outside 0-30', () => {
    const { push, onSave } = setup()
    feed(push, 0, () => 2.0)
    push(null as unknown as Shown, 1500)
    feed(push, 2000, () => -40)
    expect(screen.getByText(/That doesn't look right/)).toBeTruthy()
    const save = screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement
    expect(save.disabled).toBe(true)
    fireEvent.click(save)
    expect(onSave).not.toHaveBeenCalled()
  })
})
