import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { STORAGE_KEY } from '../model/storage'
import { App } from './App'

beforeEach(() => localStorage.clear())

describe('App', () => {
  it('drops a lock whose change was removed in Settings, and saves the edit', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /String 5, E4/ }))
    fireEvent.click(screen.getByRole('button', { name: /^P3/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove String 5 P3' }))
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(screen.getByRole('button', { name: 'Settings' })).toBeTruthy()
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(saved.profile.strings[4].changes.some((c: { control: string }) => c.control === 'P3')).toBe(false)
  })

  it('shows the new hint text and reaches Measure through Settings', () => {
    render(<App />)
    expect(screen.getByText(/Cabinet drop not set — both gauges show the same target\./)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    fireEvent.click(screen.getByRole('button', { name: 'Measure' }))
    expect(screen.getByRole('dialog', { name: 'Measure cabinet drop' })).toBeTruthy()
  })
})
