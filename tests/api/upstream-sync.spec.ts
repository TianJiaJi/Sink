import type { ExportData, Link } from '../../shared/schemas/link'
import { env } from 'cloudflare:workers'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { links } from '../../server/database/schema'
import { clearLinkMigrationState, db, deleteStoredLinks, fetch, fetchWithAuth, getD1Link, postJson, setLinkStoreD1Mode } from '../utils'

const bindings = env as unknown as Record<string, unknown>
const configKeys = ['NUXT_PUBLIC_HOME_URL', 'NUXT_HOME_URL', 'NUXT_PUBLIC_PREVIEW_MODE', 'NUXT_PUBLIC_KV_BATCH_LIMIT'] as const
const originalConfig = new Map(configKeys.map(key => [key, bindings[key]]))
const createdSlugs: string[] = []

beforeEach(async () => {
  bindings.NUXT_PUBLIC_HOME_URL = ''
  bindings.NUXT_HOME_URL = ''
  bindings.NUXT_PUBLIC_PREVIEW_MODE = ''
  bindings.NUXT_PUBLIC_KV_BATCH_LIMIT = '50'
  await setLinkStoreD1Mode()
})

afterEach(async () => {
  for (const key of configKeys) {
    if (originalConfig.get(key) === undefined)
      delete bindings[key]
    else
      bindings[key] = originalConfig.get(key)
  }
  await deleteStoredLinks(createdSlugs.splice(0))
  await clearLinkMigrationState()
})

async function insertLink(expiration: number | null) {
  const slug = `000-sync-${crypto.randomUUID()}`
  createdSlugs.push(slug)
  const now = Math.floor(Date.now() / 1000)
  await db.insert(links).values({
    slug,
    id: crypto.randomUUID().slice(0, 10),
    url: 'https://example.com/sync',
    normalizedUrl: 'https://example.com/sync',
    createdAt: now,
    updatedAt: now,
    effectiveExpiresAt: expiration,
  })
  return slug
}

async function exportAll(status?: string) {
  const exported: Link[] = []
  let cursor: string | undefined
  do {
    const params = new URLSearchParams()
    if (status)
      params.set('status', status)
    if (cursor)
      params.set('cursor', cursor)
    const response = await fetchWithAuth(`/api/link/export?${params}`)
    expect(response.status).toBe(200)
    const page = await response.json() as ExportData
    exported.push(...page.links)
    if (page.list_complete)
      break
    expect(page.cursor).toBeTruthy()
    expect(page.cursor).not.toBe(cursor)
    cursor = page.cursor
  } while (cursor)
  return exported
}

describe('upstream sync regressions', () => {
  it('filters exports and preserves effective expiration across pagination', async () => {
    const expiration = Math.floor(Date.now() / 1000) - 60
    const active = await insertLink(null)
    const expired = await insertLink(expiration)
    bindings.NUXT_PUBLIC_KV_BATCH_LIMIT = '1'

    const activeLinks = await exportAll('active')
    expect(activeLinks.map(link => link.slug)).toContain(active)
    expect(activeLinks.map(link => link.slug)).not.toContain(expired)
    const expiredLinks = await exportAll('expired')
    expect(expiredLinks.map(link => link.slug)).not.toContain(active)
    expect(expiredLinks.find(link => link.slug === expired)?.expiration).toBe(expiration)
    const all = await exportAll()
    expect(all.map(link => link.slug)).toEqual(expect.arrayContaining([active, expired]))
    expect(new Set(all.map(link => link.slug)).size).toBe(all.length)
    expect((await getD1Link(expired))?.expiration).toBeNull()
  })

  it.each(['unknown', 'ACTIVE'])('rejects invalid export status %s', async (status) => {
    expect((await fetchWithAuth(`/api/link/export?status=${status}`)).status).toBe(400)
  })

  it('rejects import in preview mode without writing records', async () => {
    bindings.NUXT_PUBLIC_PREVIEW_MODE = 'true'
    const slug = `sync-preview-${crypto.randomUUID()}`
    createdSlugs.push(slug)
    const response = await postJson('/api/link/import', {
      version: '1.0',
      links: [{ slug, url: 'https://example.com' }],
    })
    expect(response.status).toBe(403)
    expect(await getD1Link(slug)).toBeNull()
  })

  it('preserves custom link fields through export and import', async () => {
    const slug = `000-sync-custom-${crypto.randomUUID()}`
    createdSlugs.push(slug)
    const customFields = {
      turnstile: true,
      disabled: true,
      burnAfterRead: true,
      countryBlock: ['CN'],
      countryAllow: ['US'],
      ab: [{ url: 'https://example.com/variant', weight: 1 }],
      maxClicks: 12,
    }
    const response = await postJson('/api/link/create', { slug, url: 'https://example.com', ...customFields })
    expect(response.status).toBe(201)
    const exported = (await exportAll()).find(link => link.slug === slug)
    expect(exported).toMatchObject(customFields)
    expect((await postJson('/api/link/delete', { slug })).status).toBe(204)
    const imported = await postJson('/api/link/import', { version: '1.0', links: [exported] })
    expect(imported.status).toBe(200)
    expect(await imported.json()).toMatchObject({ success: 1 })
    const queried = await fetchWithAuth(`/api/link/query?slug=${slug}`)
    expect(await queried.json()).toMatchObject(customFields)
  })

  it('redirects the homepage using the public setting', async () => {
    bindings.NUXT_PUBLIC_HOME_URL = 'https://home.example.com'
    const response = await fetch('/', { redirect: 'manual' })
    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('https://home.example.com')
  })

  it('keeps the legacy runtime homepage redirect', async () => {
    bindings.NUXT_HOME_URL = 'https://legacy-home.example.com'
    const response = await fetch('/', { redirect: 'manual' })
    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('https://legacy-home.example.com')
  })

  it('prefers the public homepage setting over the legacy alias', async () => {
    bindings.NUXT_PUBLIC_HOME_URL = 'https://public-home.example.com'
    bindings.NUXT_HOME_URL = 'https://legacy-home.example.com'
    const response = await fetch('/', { redirect: 'manual' })
    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('https://public-home.example.com')
  })
})
