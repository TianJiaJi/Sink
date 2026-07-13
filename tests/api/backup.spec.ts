import type { BackupData } from '../../server/utils/backup'
import type { Link } from '../../shared/schemas/link'
import { env, exports } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'
import { createBackupJsonStream, getSerializedLinkByteLength } from '../../server/utils/backup-json-stream'
import { clearLinkMigrationState, deleteStoredLinks, postJson, setLinkStoreD1Mode } from '../utils'

function getManualBackupDate(key: string) {
  const match = key.match(/^backups\/manual-links-(.+)\.json$/)
  if (!match)
    return undefined

  return new Date(match[1].replace(/T(\d{2})-(\d{2})-(\d{2})/, 'T$1:$2:$3'))
}

async function runScheduledBackup() {
  const pending: Promise<unknown>[] = []
  const context = {
    waitUntil(promise: Promise<unknown>) {
      pending.push(promise)
    },
    passThroughOnException() {},
    props: {},
  } as unknown as ExecutionContext
  await exports.default.scheduled?.({
    scheduledTime: Date.now(),
    cron: '0 0 * * *',
    noRetry() {},
  }, env, context)
  await Promise.all(pending)
}

describe('/api/backup', { concurrent: false }, () => {
  it('returns 401 without auth', async () => {
    const response = await postJson('/api/backup', {}, false)
    expect(response.status).toBe(401)
  })

  it('skips scheduled backups and locks manual backups before migration', async () => {
    await clearLinkMigrationState()
    const before = new Set((await env.R2.list({ prefix: 'backups/' })).objects.map(object => object.key))

    try {
      await runScheduledBackup()
      expect((await postJson('/api/backup', {})).status).toBe(423)
      const after = new Set((await env.R2.list({ prefix: 'backups/' })).objects.map(object => object.key))
      expect(after).toEqual(before)
    }
    finally {
      await clearLinkMigrationState()
    }
  })

  it('backs up all authoritative D1 links to R2', async () => {
    const now = Math.floor(Date.now() / 1000)
    const slugs = {
      active: `backup-active-${crypto.randomUUID()}`,
      expired: `backup-expired-${crypto.randomUUID()}`,
      legacy: `backup-legacy-${crypto.randomUUID()}`,
    }
    const tag = `backup-tag-${crypto.randomUUID()}`
    const pagePrefix = `backup-page-${crypto.randomUUID()}-`
    const pageSlugs = Array.from({ length: 105 }, (_, index) => `${pagePrefix}${String(index).padStart(3, '0')}`)
    const existingObjects = new Set((await env.R2.list({ prefix: 'backups/manual-links-' })).objects.map(object => object.key))
    let backupKey: string | undefined

    try {
      await setLinkStoreD1Mode()
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
      ])
      await env.DB.batch(pageSlugs.map(slug => env.DB.prepare(`
        INSERT INTO links (slug, id, url, created_at, updated_at, normalized_url, effective_expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(slug, crypto.randomUUID(), `https://example.com/${slug}`, now, now, `https://example.com/${slug}`, null)))
      const legacyLink = (slug: string, url: string, tags: string[] = []): Link => ({
        id: crypto.randomUUID().slice(0, 10),
        slug,
        url,
        createdAt: now,
        updatedAt: now,
        tags,
      })
      await Promise.all([
        env.KV.put(`link:${slugs.active}`, JSON.stringify(legacyLink(slugs.active, 'https://stale.example.com'))),
        env.KV.put(`link:${slugs.legacy}`, JSON.stringify(legacyLink(slugs.legacy, 'https://example.com/legacy'))),
      ])

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
      expect(backupObject?.customMetadata?.count).toBe(String(backupData?.count))
      expect(backupObject?.customMetadata?.exportedAt).toBe(backupData?.exportedAt)
      expect(backupObject?.httpMetadata?.contentType).toBe('application/json')
      expect(backupData?.links).toEqual(expect.arrayContaining([
        expect.objectContaining({ slug: slugs.active, url: 'https://example.com/active', tags: [tag] }),
        expect.objectContaining({ slug: slugs.expired, expiration: now - 60 }),
      ] satisfies Partial<Link>[]))
      expect(backupData?.links.filter(link => link.slug.startsWith(pagePrefix)).map(link => link.slug)).toEqual(pageSlugs)
      expect(backupData?.links.some(link => link.slug === slugs.legacy)).toBe(false)
    }
    finally {
      if (backupKey)
        await env.R2.delete(backupKey)
      await deleteStoredLinks([...Object.values(slugs), ...pageSlugs])
      await env.DB.prepare('DELETE FROM tags WHERE name = ?').bind(tag).run()
      await clearLinkMigrationState()
    }
  })

  it('fails the backup stream when the link count changes', async () => {
    const now = Math.floor(Date.now() / 1000)
    const link: Link = {
      id: crypto.randomUUID().slice(0, 10),
      slug: `count-mismatch-${crypto.randomUUID()}`,
      url: 'https://example.com/count-mismatch',
      createdAt: now,
      updatedAt: now,
      tags: [],
    }
    async function* links() {
      yield link
    }

    const stream = createBackupJsonStream(links(), {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      count: 2,
      linksByteLength: getSerializedLinkByteLength(link) * 2,
    })

    await expect(new Response(stream).text()).rejects.toThrow(/expected 2, received 1/)
  })
})
