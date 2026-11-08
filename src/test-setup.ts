import '@testing-library/jest-dom/vitest'

// jsdom has no canvas; Waterfall treats a null context as "nothing to draw".
HTMLCanvasElement.prototype.getContext = (() => null) as unknown as typeof HTMLCanvasElement.prototype.getContext

import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(cleanup)
