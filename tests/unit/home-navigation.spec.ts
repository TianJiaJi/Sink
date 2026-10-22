import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

type HomeMiddleware = (to: { path: string }, from: { path: string }) => unknown
let middleware: HomeMiddleware
const navigateTo = vi.fn()
const runtimeConfig = { public: { homeURL: '' } }

beforeAll(async () => {
  vi.stubGlobal('defineNuxtRouteMiddleware', (handler: HomeMiddleware) => handler)
  middleware = (await import('../../app/middleware/home.global')).default as unknown as HomeMiddleware
})

afterEach(() => {
  runtimeConfig.public.homeURL = ''
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

function navigate(to: string, from: string) {
  vi.stubGlobal('useRuntimeConfig', () => runtimeConfig)
  vi.stubGlobal('navigateTo', navigateTo)
  return middleware({ path: to }, { path: from })
}

describe('homepage SPA navigation', () => {
  it('uses an external navigation for a configured homepage', () => {
    runtimeConfig.public.homeURL = 'https://home.example.com'
    navigate('/', '/dashboard/links')
    expect(navigateTo).toHaveBeenCalledWith('https://home.example.com', { external: true })
  })

  it('leaves the homepage visible when no redirect is configured', () => {
    navigate('/', '/dashboard/links')
    expect(navigateTo).not.toHaveBeenCalled()
  })

  it('does not redirect the initial homepage load or unrelated navigation', () => {
    runtimeConfig.public.homeURL = 'https://home.example.com'
    navigate('/', '/')
    navigate('/dashboard/links', '/')
    expect(navigateTo).not.toHaveBeenCalled()
  })
})
