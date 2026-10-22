import { defineConfig } from 'vitest/config'
import baseConfig from './vitest.config'

// Exercise the historically excluded redirect and D1 suites explicitly.
export default defineConfig(async (environment) => {
  const config = typeof baseConfig === 'function' ? await baseConfig(environment) : await baseConfig
  return {
    ...config,
    test: {
      ...config.test,
      include: ['tests/redirect.spec.ts', 'tests/api/link-d1.spec.ts'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/.output/**'],
    },
  }
})
