import type { LinkMigrationRunResult } from '../../shared/schemas/link-migration'
import { env } from 'cloudflare:workers'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearLinkMigrationState, deleteStoredLinks, fetch, getD1Link, postJson, setLinkStoreD1Mode } from '../utils'

const bindings = env as unknown as Record<string, unknown>
const keys = ['NUXT_PUBLIC_PREVIEW_MODE', 'NUXT_PUBLIC_LINK_PROXY_ENABLED', 'NUXT_PUBLIC_TURNSTILE_SITEKEY', 'NUXT_TURNSTILE_SECRET'] as const
const original = new Map(keys.map(key => [key, bindings[key]]))
const slugs: string[] = []
const target = 'https://trusted-proxy.example/target'
const targetCalls: Array<{ method: string, headers: Headers, body: unknown }> = []
const gateTokens: string[] = []

beforeEach(async () => {
  bindings.NUXT_PUBLIC_PREVIEW_MODE = ''
  bindings.NUXT_PUBLIC_LINK_PROXY_ENABLED = 'true'
  bindings.NUXT_PUBLIC_TURNSTILE_SITEKEY = ''
  bindings.NUXT_TURNSTILE_SECRET = ''
  targetCalls.length = 0
  gateTokens.length = 0
  await setLinkStoreD1Mode()
})

afterEach(async () => {
  vi.restoreAllMocks()
  for (const key of keys) {
    if (original.get(key) === undefined)
      delete bindings[key]
    else
      bindings[key] = original.get(key)
  }
  await deleteStoredLinks(slugs.splice(0))
  await clearLinkMigrationState()
})

function trackSlug() {
  const slug = `final-${crypto.randomUUID()}`
  slugs.push(slug)
  return slug
}

async function createProxy(extra: Record<string, unknown> = {}) {
  const slug = trackSlug()
  const response = await postJson('/api/link/create', { slug, url: target, proxy: true, unsafe: false, ...extra })
  expect(response.status).toBe(201)
  return slug
}

function mockTarget(allowTurnstile = false) {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    if (allowTurnstile && url === 'https://challenges.cloudflare.com/turnstile/v0/siteverify') {
      const body = typeof init?.body === 'string'
        ? JSON.parse(init.body)
        : input instanceof Request ? await input.clone().json() : undefined
      gateTokens.push(String((body as { response?: string } | undefined)?.response))
      return Response.json({ success: true })
    }
    if (url !== target)
      throw new Error('Unexpected outbound request in proxy test')
    targetCalls.push({ method: init?.method ?? 'GET', headers: new Headers(init?.headers), body: init?.body })
    return new Response('trusted-proxy-response', {
      headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'public, max-age=3600', 'Set-Cookie': 'upstream=not-forwarded' },
    })
  })
}

describe('final upstream integration compatibility', () => {
  it('preserves all custom metadata and click counts during legacy KV migration', async () => {
    const slug = trackSlug()
    const fields = {
      slug,
      url: target,
      proxy: true,
      turnstile: true,
      disabled: true,
      burnAfterRead: true,
      countryBlock: ['CN'],
      countryAllow: ['US'],
      ab: [{ url: 'https://example.com/variant', weight: 2 }],
      maxClicks: 9,
      clickCount: 4,
      geo: { US: 'https://example.com/us' },
      tags: ['final-migration'],
    }
    await clearLinkMigrationState()
    await env.KV.put(`link:${slug}`, JSON.stringify(fields))
    let cursor: string | undefined
    let completed = false
    for (let page = 0; page < 30; page++) {
      const response = await postJson('/api/link/migration/run', { force: false, cursor })
      expect(response.status).toBe(200)
      const result = await response.json() as LinkMigrationRunResult
      if (result.completed) {
        completed = true
        break
      }
      cursor = result.cursor
    }
    expect(completed).toBe(true)
    expect(await getD1Link(slug)).toMatchObject({
      slug,
      proxy: true,
      turnstile: true,
      disabled: true,
      burnAfterRead: true,
      countryBlock: ['CN'],
      countryAllow: ['US'],
      ab: fields.ab,
      maxClicks: 9,
      clickCount: 4,
      geo: fields.geo,
    })
  })

  it('keeps custom mutation routes migration-gated', async () => {
    await clearLinkMigrationState()
    expect((await postJson('/api/link/batch', { action: 'delete', slugs: ['missing'] })).status).toBe(423)
    expect((await postJson('/api/link/reset-clicks', { slug: 'missing' })).status).toBe(423)
  })

  it('rejects custom mutations in preview mode', async () => {
    bindings.NUXT_PUBLIC_PREVIEW_MODE = 'true'
    expect((await postJson('/api/link/batch', { action: 'delete', slugs: ['missing'] })).status).toBe(403)
    expect((await postJson('/api/link/reset-clicks', { slug: 'missing' })).status).toBe(403)
  })

  it('keeps proxy delivery opt-in and preserves its stored flag', async () => {
    const slug = await createProxy()
    bindings.NUXT_PUBLIC_LINK_PROXY_ENABLED = 'false'
    mockTarget()
    const response = await fetch(`/${slug}`, { redirect: 'manual' })
    expect(response.status).toBe(301)
    expect(response.headers.get('location')).toBe(target)
    expect((await getD1Link(slug))?.proxy).toBe(true)
    expect(targetCalls).toHaveLength(0)
  })

  it('does not forward gate credentials or cookies to the proxy target', async () => {
    const slug = await createProxy()
    mockTarget()
    const response = await fetch(`/${slug}`, {
      headers: { 'Cookie': 'private-cookie=value', 'x-link-password': 'gate-password', 'x-turnstile-token': 'gate-token' },
    })
    expect(await response.text()).toBe('trusted-proxy-response')
    expect(response.headers.has('set-cookie')).toBe(false)
    expect(targetCalls).toHaveLength(1)
    expect(targetCalls[0]?.headers.has('cookie')).toBe(false)
    expect(targetCalls[0]?.headers.has('x-link-password')).toBe(false)
    expect(targetCalls[0]?.headers.has('x-turnstile-token')).toBe(false)
  })

  it('enforces click caps before proxying and disables response caching', async () => {
    const slug = await createProxy({ maxClicks: 1 })
    mockTarget()
    const allowed = await fetch(`/${slug}`)
    expect(await allowed.text()).toBe('trusted-proxy-response')
    expect(allowed.headers.get('cache-control')).toBe('private, no-store')
    const blocked = await fetch(`/${slug}`)
    expect(blocked.headers.get('content-type')).toContain('text/html')
    expect(await blocked.text()).not.toBe('trusted-proxy-response')
    expect(targetCalls).toHaveLength(1)
    expect((await getD1Link(slug))?.clickCount).toBe(1)
  })

  it('does not proxy disabled links', async () => {
    const slug = await createProxy({ disabled: true })
    mockTarget()
    const response = await fetch(`/${slug}`)
    expect(response.headers.get('content-type')).toContain('text/html')
    expect(await response.text()).not.toBe('trusted-proxy-response')
    expect(targetCalls).toHaveLength(0)
  })

  it('re-verifies unsafe password confirmations and never forwards consumed gate forms', async () => {
    const slug = await createProxy({ password: 'protected-password', unsafe: true })
    bindings.NUXT_PUBLIC_TURNSTILE_SITEKEY = 'test-sitekey'
    bindings.NUXT_TURNSTILE_SECRET = 'test-secret'
    mockTarget(true)
    const warning = await fetch(`/${slug}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ 'password': 'protected-password', 'cf-turnstile-response': 'initial-token' }).toString(),
    })
    const html = await warning.text()
    expect(html).toContain('id="unsafe-submit-btn"')
    expect(html).toContain('data-sitekey="test-sitekey"')
    expect(targetCalls).toHaveLength(0)
    const confirmed = await fetch(`/${slug}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ 'password': 'protected-password', 'confirm': 'true', 'cf-turnstile-response': 'confirm-token' }).toString(),
    })
    expect(await confirmed.text()).toBe('trusted-proxy-response')
    expect(gateTokens).toEqual(['initial-token', 'confirm-token'])
    expect(targetCalls).toHaveLength(1)
    expect(targetCalls[0]?.method).toBe('GET')
    expect(targetCalls[0]?.body).toBeUndefined()
  })

  it('does not bypass Turnstile when a password is supplied in a header', async () => {
    const slug = await createProxy({ password: 'protected-password' })
    bindings.NUXT_PUBLIC_TURNSTILE_SITEKEY = 'test-sitekey'
    bindings.NUXT_TURNSTILE_SECRET = 'test-secret'
    mockTarget()
    const response = await fetch(`/${slug}`, { headers: { 'x-link-password': 'protected-password' } })
    expect(response.status).toBe(403)
    expect(targetCalls).toHaveLength(0)
  })
})
