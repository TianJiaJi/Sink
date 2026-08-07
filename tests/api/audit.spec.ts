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

describe('/api/link/audit/list', { concurrent: false, timeout: 60_000 }, () => {
  it('returns audit logs after creating a link', async () => {
    const slug = trackSlug(`audit-create-${crypto.randomUUID()}`)
    await postJson('/api/link/create', { url: 'https://example.com', slug })

    const response = await fetchWithAuth(`/api/link/audit/list?slug=${slug}`)
    expect(response.status).toBe(200)
    const data = await response.json() as {
      logs: Array<{ action: string, linkSlug: string, actor: string, details: unknown }>
      list_complete: boolean
    }
    expect(data.logs.length).toBeGreaterThanOrEqual(1)
    expect(data.logs[0].action).toBe('create')
    expect(data.logs[0].linkSlug).toBe(slug)
    expect(data.logs[0].actor).toBeDefined()
  })

  it('records edit audit log', async () => {
    const slug = trackSlug(`audit-edit-${crypto.randomUUID()}`)
    await postJson('/api/link/create', { url: 'https://example.com', slug })
    const { putJson } = await import('../utils')
    await putJson('/api/link/edit', { url: 'https://edited.example.com', slug })

    const response = await fetchWithAuth(`/api/link/audit/list?slug=${slug}`)
    const data = await response.json() as { logs: Array<{ action: string }> }
    const actions = data.logs.map(l => l.action)
    expect(actions).toContain('create')
    expect(actions).toContain('edit')
  })

  it('records delete audit log', async () => {
    const slug = trackSlug(`audit-delete-${crypto.randomUUID()}`)
    await postJson('/api/link/create', { url: 'https://example.com', slug })
    await postJson('/api/link/delete', { slug })

    const response = await fetchWithAuth(`/api/link/audit/list?slug=${slug}`)
    const data = await response.json() as { logs: Array<{ action: string }> }
    const actions = data.logs.map(l => l.action)
    expect(actions).toContain('create')
    expect(actions).toContain('delete')
  })

  it('records batch operations with details', async () => {
    const slug = trackSlug(`audit-batch-${crypto.randomUUID()}`)
    await postJson('/api/link/create', { url: 'https://example.com', slug })
    await postJson('/api/link/batch', { action: 'disable', slugs: [slug] })

    const response = await fetchWithAuth(`/api/link/audit/list?slug=${slug}`)
    const data = await response.json() as { logs: Array<{ action: string, details?: { batch?: string } }> }
    const batchLog = data.logs.find(l => l.details?.batch === 'disable')
    expect(batchLog).toBeDefined()
    expect(batchLog!.action).toBe('edit')
  })

  it('paginates with cursor', async () => {
    const slug = trackSlug(`audit-page-${crypto.randomUUID()}`)
    // Create enough audit entries
    await postJson('/api/link/create', { url: 'https://example.com', slug })
    const { putJson } = await import('../utils')
    for (let i = 0; i < 3; i++) {
      await putJson('/api/link/edit', { url: `https://example.com/${i}`, slug })
    }

    const first = await fetchWithAuth(`/api/link/audit/list?slug=${slug}&limit=2`)
    const firstData = await first.json() as {
      logs: Array<{ id: string }>
      list_complete: boolean
      cursor?: string
    }
    expect(firstData.logs).toHaveLength(2)
    expect(firstData.list_complete).toBe(false)
    expect(firstData.cursor).toBeDefined()

    const second = await fetchWithAuth(`/api/link/audit/list?slug=${slug}&limit=2&cursor=${firstData.cursor}`)
    const secondData = await second.json() as {
      logs: Array<{ id: string }>
      list_complete: boolean
    }
    expect(secondData.logs.length).toBeGreaterThanOrEqual(1)
    // No duplicate IDs between pages
    const firstIds = new Set(firstData.logs.map(l => l.id))
    expect(secondData.logs.every(l => !firstIds.has(l.id))).toBe(true)
  })

  it('respects limit parameter', async () => {
    const response = await fetchWithAuth('/api/link/audit/list?limit=1')
    expect(response.status).toBe(200)
    const data = await response.json() as { logs: Array<unknown> }
    expect(data.logs.length).toBeLessThanOrEqual(1)
  })

  it('rejects limit over 100', async () => {
    const response = await fetchWithAuth('/api/link/audit/list?limit=101')
    expect(response.status).toBe(400)
  })

  it('requires authentication', async () => {
    const { fetch } = await import('../utils')
    const response = await fetch('/api/link/audit/list')
    expect(response.status).toBe(401)
  })

  it('returns empty list for non-existent slug', async () => {
    const response = await fetchWithAuth('/api/link/audit/list?slug=non-existent-audit-slug-12345')
    expect(response.status).toBe(200)
    const data = await response.json() as { logs: Array<unknown>, list_complete: boolean }
    expect(data.logs).toEqual([])
    expect(data.list_complete).toBe(true)
  })
})
