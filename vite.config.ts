import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // BASE_PATH is set when building for GitHub Pages (e.g. /pedal-steel-tuner/).
  base: process.env.BASE_PATH ?? '/',
  test: { environment: 'jsdom', setupFiles: ['src/test-setup.ts'] },
})
