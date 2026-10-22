import type { H3Event } from 'h3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isTurnstileEnabled, verifyTurnstileToken } from '../../server/utils/turnstile'

const { request } = vi.hoisted(() => ({ request: vi.fn() }))
vi.mock('ofetch', () => ({ ofetch: request }))

const event = {} as H3Event
let secret = 'test-secret'
let sitekey = 'test-sitekey'

beforeEach(() => {
  secret = 'test-secret'
  sitekey = 'test-sitekey'
  request.mockReset()
  vi.stubGlobal('useRuntimeConfig', () => ({ turnstileSecret: secret, public: { turnstileSitekey: sitekey } }))
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('turnstile verification', () => {
  it('uses the supported retry-status option and keeps verification data in the POST body', async () => {
    request.mockResolvedValue({ success: true })
    expect(await verifyTurnstileToken(event, 'test-token', '203.0.113.1')).toBe(true)
    expect(request).toHaveBeenCalledWith('https://challenges.cloudflare.com/turnstile/v0/siteverify', expect.objectContaining({
      method: 'POST',
      body: { secret: 'test-secret', response: 'test-token', remoteip: '203.0.113.1' },
      retry: 1,
      retryStatusCodes: [408, 429, 502, 503, 504],
    }))
    expect(request.mock.calls[0]?.[1]).not.toHaveProperty('retryOn')
  })

  it.each([undefined, null, ''])('fails closed for missing token %s', async (token) => {
    expect(await verifyTurnstileToken(event, token)).toBe(false)
    expect(request).not.toHaveBeenCalled()
  })

  it('fails closed after network retries are exhausted', async () => {
    request.mockRejectedValue(new Error('ETIMEDOUT'))
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(await verifyTurnstileToken(event, 'test-token')).toBe(false)
  })

  it('degrades safely when not configured', async () => {
    secret = ''
    sitekey = ''
    expect(isTurnstileEnabled(event)).toBe(false)
    expect(await verifyTurnstileToken(event, undefined)).toBe(true)
    expect(request).not.toHaveBeenCalled()
  })
})
