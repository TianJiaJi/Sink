import type { BackupData } from '../../server/utils/backup'
import type { Link } from '../../shared/schemas/link'
import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'
import { postJson } from '../utils'

const MARKER_KEY = 'migration:kv-to-d1:v1'

function getManualBackupDate(key: string) {
  const match = key.match(/^backups\/manual-links-(.+)\.json$/)
  if (!match)
    return undefined

  return new Date(match[1].replace(/T(\d{2})-(\d{2})-(\d{2})/, 'T$1:$2:$3'))
}

describe('/api/backup', { concurrent: false }, () => {
  it('returns 401 without auth', async () => {
    const response = await postJson('/api/backup', {}, false)
    expect(response.status).toBe(401)
  })

  it('backs up all authoritative D1 links to R2', async () => {
    const now = Math.floor(Date.now() / 1000)
    const slugs = {
      active: `backup-active-${crypto.randomUUID()}`,
      expired: `backup-expired-${crypto.randomUUID()}`,
      cached: `backup-cached-${crypto.randomUUID()}`,
      expiring: `backup-expiring-${crypto.randomUUID()}`,
      legacy: `backup-legacy-${crypto.randomUUID()}`,
      tombstoned: `backup-tombstoned-${crypto.randomUUID()}`,
    }
    const tag = `backup-tag-${crypto.randomUUID()}`
    const existingObjects = new Set((await env.R2.list({ prefix: 'backups/manual-links-' })).objects.map(object => object.key))
    const previousMarker = await env.KV.get(MARKER_KEY)
    let backupKey: string | undefined

    try {
      await env.KV.delete(MARKER_KEY)
      await env.DB.batch([
        env.DB.prepare(`
          INSERT INTO links (slug, id, url, created_at, updated_at, normalized_url, effective_expires_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(slugs.active, crypto.randomUUID(), 'https://example.com/active', now, now, 'https://example.com/active', null),
        env.DB.prepare(`
          INSERT INTO links (slug, id, url, created_at, updated_at, normalized_url, effective_expires_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(slugs.expired, crypto.randomUUID(), 'https://example.com/expired', now, now, 'https://example.com/expired', now - 60),
        env.DB.prepare('INSERT INTO tags (name) VALUES (?)').bind(tag),
        env.DB.prepare('INSERT INTO link_tags (link_slug, tag_name) VALUES (?, ?)').bind(slugs.active, tag),
        env.DB.prepare('INSERT INTO link_tombstones (slug, deleted_at) VALUES (?, ?)').bind(slugs.tombstoned, now),
      ])
      await env.KV.delete(`link:${slugs.expired}`)
      const legacyLink = (slug: string, url: string): Link => ({
        id: crypto.randomUUID().slice(0, 10),
        slug,
        url,
        createdAt: now,
        updatedAt: now,
        tags: [],
      })
      await Promise.all([
        env.KV.put(`link:${slugs.active}`, JSON.stringify(legacyLink(slugs.active, 'https://stale.example.com'))),
        env.KV.put(`link:${slugs.legacy}`, JSON.stringify(legacyLink(slugs.legacy, 'https://example.com/legacy'))),
        env.KV.put(`link:${slugs.tombstoned}`, JSON.stringify(legacyLink(slugs.tombstoned, 'https://example.com/tombstoned'))),
        env.KV.put(`link:${slugs.expiring}`, JSON.stringify(legacyLink(slugs.expiring, 'https://example.com/expiring')), {
          expiration: now + 7200,
          metadata: { expiration: now + 3600 },
        }),
      ])
      expect((await postJson('/api/link/create', {
        url: 'https://example.com/cached',
        slug: slugs.cached,
      })).status).toBe(201)

      const backupResponse = await postJson('/api/backup', {})
      expect(backupResponse.status).toBe(200)
      expect(await backupResponse.json()).toEqual({ success: true, message: 'Backup completed successfully' })

      const list = await env.R2.list({ prefix: 'backups/manual-links-' })
      backupKey = list.objects
        .filter(object => !existingObjects.has(object.key) && getManualBackupDate(object.key))
        .toSorted((a, b) => a.key.localeCompare(b.key))
        .at(-1)
        ?.key
      expect(backupKey).toBeDefined()

      const backupObject = backupKey ? await env.R2.get(backupKey) : null
      const backupData = await backupObject?.json() as BackupData | undefined
      expect(backupData?.count).toBe(backupData?.links.length)
      expect(backupData?.links).toEqual(expect.arrayContaining([
        expect.objectContaining({ slug: slugs.active, url: 'https://example.com/active', tags: [tag] }),
        expect.objectContaining({ slug: slugs.expired, expiration: now - 60 }),
        expect.objectContaining({ slug: slugs.cached }),
        expect.objectContaining({ slug: slugs.expiring, expiration: now + 3600 }),
        expect.objectContaining({ slug: slugs.legacy }),
      ] satisfies Partial<Link>[]))
      expect(backupData?.links.some(link => link.slug === slugs.tombstoned)).toBe(false)
    }
    finally {
      if (backupKey)
        await env.R2.delete(backupKey)
      await Promise.all([
        ...Object.values(slugs).map(slug => env.KV.delete(`link:${slug}`)),
        ...Object.values(slugs).map(slug => env.DB.prepare('DELETE FROM links WHERE slug = ?').bind(slug).run()),
        env.DB.prepare('DELETE FROM link_tombstones WHERE slug = ?').bind(slugs.tombstoned).run(),
        env.DB.prepare('DELETE FROM tags WHERE name = ?').bind(tag).run(),
      ])
      if (previousMarker)
        await env.KV.put(MARKER_KEY, previousMarker)
      else
        await env.KV.delete(MARKER_KEY)
    }
  })
})
