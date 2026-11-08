import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ErrorBoundary } from './ErrorBoundary'

function Boom(): never {
  throw new Error('boom')
}

describe('ErrorBoundary', () => {
  it('shows the message and resets on click', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const onReset = vi.fn()
    render(<ErrorBoundary onReset={onReset}><Boom /></ErrorBoundary>)
    expect(screen.getByText('Something in your saved settings broke the tuner.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Reset to Sierra 14' }))
    expect(onReset).toHaveBeenCalled()
  })
})
