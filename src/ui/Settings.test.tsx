import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { sierra14 } from '../model/seeds/sierra14'
import { Settings } from './Settings'

function setup() {
  const onChange = vi.fn()
  render(<Settings profile={sierra14} shown={null} onChange={onChange} onClose={() => {}} />)
  return onChange
}

describe('Settings', () => {
  it('changes string 5 P3 from Fixed to A+B down', () => {
    const onChange = setup()
    fireEvent.change(screen.getByLabelText('String 5 P3 stop 1 rule'), { target: { value: 'down' } })
    const p = onChange.mock.calls[0][0]
    const change = p.strings.find((s: { number: number }) => s.number === 5).changes.find((c: { control: string }) => c.control === 'P3')
    expect(change.stops[0].target.kind).toBe('down')
  })

  it('sets cabinet drop from typed input', () => {
    const onChange = setup()
    fireEvent.change(screen.getByLabelText('Cabinet drop'), { target: { value: '6.3' } })
    expect(onChange.mock.calls[0][0].cabinetDrop).toBe(6.3)
  })

  it('edits the fixed cents value', () => {
    const onChange = setup()
    fireEvent.change(screen.getByLabelText('String 5 P3 stop 1 cents'), { target: { value: '-10' } })
    const p = onChange.mock.calls[0][0]
    expect(p.strings[4].changes.find((c: { control: string }) => c.control === 'P3').stops[0].target).toEqual({ kind: 'cents', cents: -10 })
  })

  it('resets the note table to French values', () => {
    const onChange = setup()
    fireEvent.change(screen.getByLabelText('Note C'), { target: { value: '5' } })
    expect(onChange.mock.calls[0][0].noteTable.C).toBe(5)
    fireEvent.click(screen.getByRole('button', { name: 'Reset to French values' }))
    expect(onChange.mock.calls[1][0].noteTable).toEqual(sierra14.noteTable)
  })

  it('adds and removes a stop', () => {
    const onChange = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Add stop to String 5 P3' }))
    expect(onChange.mock.calls[0][0].strings[4].changes.find((c: { control: string }) => c.control === 'P3').stops).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: 'Remove String 5 P3' }))
    expect(onChange.mock.calls[1][0].strings[4].changes.some((c: { control: string }) => c.control === 'P3')).toBe(false)
  })

  it('opens the drop wizard from Measure', () => {
    setup()
    fireEvent.click(screen.getByRole('button', { name: 'Measure' }))
    expect(screen.getByRole('dialog', { name: 'Measure cabinet drop' })).toBeTruthy()
  })
})

describe('Settings drafts and export', () => {
  afterEach(() => vi.useRealTimers())

  it('commits an open note only once it is complete', () => {
    const onChange = setup()
    const input = screen.getByLabelText('String 5 open note')
    for (const v of ['G', 'G#', 'G#4']) fireEvent.change(input, { target: { value: v } })
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0][0].strings[4].openNote).toBe('G#4')
  })

  it('only commits A reference within 430-450', () => {
    const onChange = setup()
    const input = screen.getByLabelText(/A reference/)
    for (const v of ['4', '44', '440']) fireEvent.change(input, { target: { value: v } })
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0][0].aRef).toBe(440)
    fireEvent.change(input, { target: { value: '451' } })
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('rounds and clamps cabinet drop, and ignores a cleared field', () => {
    const onChange = setup()
    const input = screen.getByLabelText('Cabinet drop')
    fireEvent.change(input, { target: { value: '' } })
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.change(input, { target: { value: '6.34' } })
    expect(onChange.mock.calls[0][0].cabinetDrop).toBe(6.3)
    fireEvent.change(input, { target: { value: '45' } })
    expect(onChange.mock.calls[1][0].cabinetDrop).toBe(30)
  })

  it('appends the export anchor to the body and revokes the URL later', () => {
    vi.useFakeTimers()
    const revoke = vi.fn()
    URL.createObjectURL = vi.fn(() => 'blob:x')
    URL.revokeObjectURL = revoke
    let inBody = false
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      inBody = document.body.contains(this)
    })
    setup()
    fireEvent.click(screen.getByRole('button', { name: 'Export' }))
    expect(inBody).toBe(true)
    expect(document.body.querySelector('a[download]')).toBeNull()
    expect(revoke).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1500)
    expect(revoke).toHaveBeenCalledWith('blob:x')
    click.mockRestore()
  })
})
