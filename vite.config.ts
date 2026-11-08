import { defineConfig } from 'vite'

export default defineConfig({
  // BASE_PATH is set when building for GitHub Pages (e.g. /pedal-steel-tuner/).
  base: process.env.BASE_PATH ?? '/',
})
