import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Use Pinia's installed Vue peer without adding a second root dependency.
const require = createRequire(import.meta.url)
const piniaRequire = createRequire(require.resolve('pinia'))

export default defineConfig({
  resolve: {
    alias: {
      'vue': piniaRequire.resolve('vue'),
      '@': fileURLToPath(new URL('./app', import.meta.url)),
      '#imports': fileURLToPath(new URL('./tests/support/nuxt-imports.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/unit/dashboard-links-search-store.spec.ts'],
  },
})
