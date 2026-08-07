import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { deleteStoredLinks, fetchWithAuth, postJson, setLinkStoreD1Mode } from '../utils'

const createdSlugs = new Set<string>()

beforeEach(async () => {
  await setLinkStoreD1Mode()
})

afterEach(async () => {
  await deleteStoredLinks([...createdSlugs])
  createdSlugs.clear()
})

function trackSlug(slug: string) {
  createdSlugs.add(slug)
  return slug
}

async function createLink(slug: string, url = 'https://example.com', extra: Record<string, unknown> = {}) {
  const response = await postJson('/api/link/create', { url, slug, ...extra })
  expect(response.status).toBe(201)
  createdSlugs.add(slug)
  return response
}

describe('/api/link/batch', { concurrent: false, timeout: 60_000 }, () => {
  it('batch deletes multiple links', async () => {
    const slug1 = trackSlug(`batch-del-1-${crypto.randomUUID()}`)
    const slug2 = trackSlug(`batch-del-2-${crypto.randomUUID()}`)
    await createLink(slug1)
    await createLink(slug2)

    const response = await postJson('/api/link/batch', {
      action: 'delete',
      slugs: [slug1, slug2],
    })
    expect(response.status).toBe(200)
    const data = await response.json() as { results: Array<{ slug: string, ok: boolean }> }
    expect(data.results).toHaveLength(2)
    expect(data.results.every(r => r.ok)).toBe(true)

    // Verify links are deleted
    const q1 = await fetchWithAuth(`/api/link/query?slug=${slug1}`)
    expect(q1.status).toBe(404)
    const q2 = await fetchWithAuth(`/api/link/query?slug=${slug2}`)
    expect(q2.status).toBe(404)
  })

  it('batch disables links', async () => {
    const slug1 = trackSlug(`batch-dis-1-${crypto.randomUUID()}`)
    const slug2 = trackSlug(`batch-dis-2-${crypto.randomUUID()}`)
    await createLink(slug1)
    await createLink(slug2)

    const response = await postJson('/api/link/batch', {
      action: 'disable',
      slugs: [slug1, slug2],
    })
    expect(response.status).toBe(200)
    const data = await response.json() as { results: Array<{ slug: string, ok: boolean }> }
    expect(data.results.every(r => r.ok)).toBe(true)

    // Verify links are disabled
    const q1 = await fetchWithAuth(`/api/link/query?slug=${slug1}`)
    const link1 = await q1.json() as { disabled?: boolean }
    expect(link1.disabled).toBe(true)
  })

  it('batch enables links', async () => {
    const slug = trackSlug(`batch-en-${crypto.randomUUID()}`)
    await createLink(slug, 'https://example.com', { disabled: true })

    const response = await postJson('/api/link/batch', {
      action: 'enable',
      slugs: [slug],
    })
    expect(response.status).toBe(200)
    const data = await response.json() as { results: Array<{ slug: string, ok: boolean }> }
    expect(data.results[0].ok).toBe(true)

    const q = await fetchWithAuth(`/api/link/query?slug=${slug}`)
    const link = await q.json() as { disabled?: boolean }
    expect(link.disabled).toBeFalsy()
  })

  it('batch adds tags to links', async () => {
    const slug = trackSlug(`batch-tags-${crypto.randomUUID()}`)
    await createLink(slug, 'https://example.com', { tags: ['existing'] })

    const response = await postJson('/api/link/batch', {
      action: 'addTags',
      slugs: [slug],
      tags: ['new-tag', 'another'],
    })
    expect(response.status).toBe(200)
    const data = await response.json() as { results: Array<{ slug: string, ok: boolean }> }
    expect(data.results[0].ok).toBe(true)

    const q = await fetchWithAuth(`/api/link/query?slug=${slug}`)
    const link = await q.json() as { tags: string[] }
    expect(link.tags).toContain('existing')
    expect(link.tags).toContain('new-tag')
    expect(link.tags).toContain('another')
  })

  it('returns per-slug errors for non-existent links', async () => {
    const response = await postJson('/api/link/batch', {
      action: 'disable',
      slugs: ['non-existent-batch-slug'],
    })
    expect(response.status).toBe(200)
    const data = await response.json() as { results: Array<{ slug: string, ok: boolean, error?: string }> }
    expect(data.results).toHaveLength(1)
    expect(data.results[0].ok).toBe(false)
    expect(data.results[0].error).toBeDefined()
  })

  it('skips disable when already disabled and skip enable when already enabled', async () => {
    const slug = trackSlug(`batch-skip-${crypto.randomUUID()}`)
    await createLink(slug, 'https://example.com', { disabled: true })

    // Disable again (should be a no-op)
    const dis = await postJson('/api/link/batch', { action: 'disable', slugs: [slug] })
    const disData = await dis.json() as { results: Array<{ ok: boolean }> }
    expect(disData.results[0].ok).toBe(true)

    // Enable
    const en = await postJson('/api/link/batch', { action: 'enable', slugs: [slug] })
    const enData = await en.json() as { results: Array<{ ok: boolean }> }
    expect(enData.results[0].ok).toBe(true)

    // Enable again (should be a no-op)
    const en2 = await postJson('/api/link/batch', { action: 'enable', slugs: [slug] })
    const en2Data = await en2.json() as { results: Array<{ ok: boolean }> }
    expect(en2Data.results[0].ok).toBe(true)
  })

  it('rejects addTags without tags array', async () => {
    const response = await postJson('/api/link/batch', {
      action: 'addTags',
      slugs: ['some-slug'],
    })
    expect(response.status).toBe(400)
  })

  it('rejects empty slugs array', async () => {
    const response = await postJson('/api/link/batch', {
      action: 'delete',
      slugs: [],
    })
    expect(response.status).toBe(400)
  })

  it('rejects more than 100 slugs', async () => {
    const slugs = Array.from({ length: 101 }, (_, i) => `slug-${i}`)
    const response = await postJson('/api/link/batch', {
      action: 'delete',
      slugs,
    })
    expect(response.status).toBe(400)
  })

  it('requires authentication', async () => {
    const response = await postJson('/api/link/batch', { action: 'delete', slugs: ['test'] }, false)
    expect(response.status).toBe(401)
  })
})
