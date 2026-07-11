import { cloudflareTest } from '@cloudflare/vitest-pool-workers'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

interface HandledValidationError {
  statusCode: 400
  statusMessage: 'Validation Error'
  data: {
    issues: unknown[]
    name: 'ZodError'
    stack: string
  }
}

function isHandledValidationError(error: unknown): error is HandledValidationError {
  if (typeof error !== 'object' || error === null
    || !('statusCode' in error) || error.statusCode !== 400
    || !('statusMessage' in error) || error.statusMessage !== 'Validation Error'
    || !('data' in error) || typeof error.data !== 'object' || error.data === null) {
    return false
  }

  const { data } = error
  return 'issues' in data && Array.isArray(data.issues)
    && 'name' in data && data.name === 'ZodError'
    && 'stack' in data && typeof data.stack === 'string'
    && data.stack.includes('validateData')
}

export default defineConfig(({ mode }) => ({
  plugins: [
    cloudflareTest({
      wrangler: {
        configPath: './wrangler.jsonc',
      },
      miniflare: {
        cf: true,
      },
    }),
  ],
  test: {
    env: loadEnv(mode, process.cwd(), ''),
    isolate: false,
    maxWorkers: 1,
    testTimeout: 10_000,
    onUnhandledError(error) {
      return !isHandledValidationError(error)
    },
  },
}))
