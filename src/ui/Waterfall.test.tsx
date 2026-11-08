import { render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Waterfall } from './Waterfall'

describe('Waterfall', () => {
  const orig = HTMLCanvasElement.prototype.getContext
  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = orig
    vi.unstubAllGlobals()
  })

  it('survives a long gap between frames (e.g. after backgrounding)', () => {
    const drawImage = vi.fn((_c: unknown, _sx: number, _sy: number, _sw: number, sh: number) => {
      if (sh <= 0) throw new DOMException('empty source', 'IndexSizeError')
    })
    const gradient = { addColorStop: () => {} }
    const ctx = {
      canvas: {},
      fillRect: () => {},
      drawImage,
      createLinearGradient: () => gradient,
      fillStyle: '',
    }
    HTMLCanvasElement.prototype.getContext = (() => ctx) as unknown as typeof HTMLCanvasElement.prototype.getContext
    let tick: ((t: number) => void) | null = null
    vi.stubGlobal('requestAnimationFrame', (cb: (t: number) => void) => {
      tick = cb
      return 1
    })
    vi.stubGlobal('cancelAnimationFrame', () => {})
    render(<Waterfall deviation={3} />)
    tick!(1000)
    tick!(11000) // 10 s later: far more rows than the canvas has
    expect(() => tick!(11016)).not.toThrow()
    expect(tick).not.toBeNull() // the loop kept scheduling
  })
})
