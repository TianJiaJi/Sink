import type { ExportData, Link } from '../../shared/schemas/link'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { clearLinkMigrationState, deleteStoredLinks, fetch, fetchWithAuth, getD1Link, postJson, putJson, setLinkStoreD1Mode } from '../utils'

const createdSlugs: string[] = []
const maxUrlLength = 16_384

function target(length: number) {
  const prefix = 'https://example.com/long-url/'
  return prefix + 'a'.repeat(length - prefix.length)
}

function slug() {
  const value = `000-long-${crypto.randomUUID()}`
  createdSlugs.push(value)
  return value
}

beforeEach(async () => {
  await setLinkStoreD1Mode()
})

afterEach(async () => {
  await deleteStoredLinks(createdSlugs.splice(0))
  await clearLinkMigrationState()
})

describe('long URL integration', () => {
  it('creates, resolves and searches an exact-limit target', async () => {
    const linkSlug = slug()
    const url = target(maxUrlLength)
    const created = await postJson('/api/link/create', { slug: linkSlug, url, unsafe: false })
    expect(created.status).toBe(201)
    expect((await getD1Link(linkSlug))?.url).toBe(url)
    const redirect = await fetch(`/${linkSlug}`, { redirect: 'manual' })
    expect(redirect.status).toBe(301)
    expect(redirect.headers.get('location')).toBe(url)
    const search = await postJson('/api/link/search', { url })
    expect(search.status).toBe(200)
    expect(await search.json()).toContainEqual(expect.objectContaining({ slug: linkSlug, url }))
  })

  it('rejects an over-limit create, edit, import and duplicate search', async () => {
    const linkSlug = slug()
    const url = target(maxUrlLength + 1)
    expect((await postJson('/api/link/create', { slug: linkSlug, url })).status).toBe(400)
    expect(await getD1Link(linkSlug)).toBeNull()
    expect((await postJson('/api/link/create', { slug: linkSlug, url: target(256) })).status).toBe(201)
    expect((await putJson('/api/link/edit', { slug: linkSlug, url })).status).toBe(400)
    expect((await getD1Link(linkSlug))?.url).toBe(target(256))
    const importedSlug = slug()
    expect((await postJson('/api/link/import', { version: '1.0', links: [{ slug: importedSlug, url }] })).status).toBe(400)
    expect(await getD1Link(importedSlug)).toBeNull()
    expect((await postJson('/api/link/search', { url })).status).toBe(400)
  })

  it('preserves long custom targets through edits and export/import', async () => {
    const linkSlug = slug()
    const url = target(9_000)
    const fields = {
      url,
      apple: `${url}?apple=1`,
      google: `${url}?google=1`,
      geo: { US: `${url}?geo=1` },
      ab: [{ url: `${url}?variant=1`, weight: 2 }],
      turnstile: true,
      disabled: true,
      burnAfterRead: true,
      countryAllow: ['US'],
      countryBlock: ['CN'],
      maxClicks: 15,
    }
    expect((await postJson('/api/link/create', { slug: linkSlug, ...fields })).status).toBe(201)
    expect((await putJson('/api/link/edit', { slug: linkSlug, ...fields, comment: 'edited' })).status).toBe(201)
    const exportedResponse = await fetchWithAuth('/api/link/export')
    const exported = await exportedResponse.json() as ExportData
    const link = exported.links.find(item => item.slug === linkSlug)
    expect(link).toMatchObject(fields)
    expect((await postJson('/api/link/delete', { slug: linkSlug })).status).toBe(204)
    const imported = await postJson('/api/link/import', { version: '1.0', links: [link] })
    expect(await imported.json()).toMatchObject({ success: 1 })
    const queried = await fetchWithAuth(`/api/link/query?slug=${linkSlug}`)
    expect(await queried.json() as Link).toMatchObject(fields)
  })

  it('keeps POST duplicate searches authenticated and migration-gated', async () => {
    const request = { url: target(256) }
    expect((await postJson('/api/link/search', request, false)).status).toBe(401)
    await clearLinkMigrationState()
    expect((await postJson('/api/link/search', request)).status).toBe(423)
  })
})
