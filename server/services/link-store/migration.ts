import type { H3Event } from 'h3'
import type { Link } from '#shared/schemas/link'
import type { LinkMigrationMarker } from '#shared/schemas/link-migration'
import { LinkMigrationMarkerSchema } from '#shared/schemas/link-migration'
import { buildD1LinkValues } from './d1'

export const LINK_MIGRATION_MARKER_KEY = 'migration:kv-to-d1:v1'

export async function readLinkMigrationMarker(env: Cloudflare.Env): Promise<LinkMigrationMarker | null> {
  const value = await env.KV.get(LINK_MIGRATION_MARKER_KEY)
  if (!value)
    return null

  try {
    const parsed = LinkMigrationMarkerSchema.safeParse(JSON.parse(value))
    return parsed.success ? parsed.data : null
  }
  catch {
    return null
  }
}

export async function insertMigratedKvLink(event: H3Event, link: Link, effectiveExpiresAt?: number): Promise<boolean> {
  const values = buildD1LinkValues(event, link, effectiveExpiresAt)
  const { DB } = event.context.cloudflare.env
  const insert = DB.prepare(`
    INSERT INTO links (
      slug, id, url, comment, created_at, updated_at, expiration, title,
      description, image, apple, google, cloaking, redirect_with_query,
      password, unsafe, geo, normalized_url, effective_expires_at
    )
    SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    WHERE NOT EXISTS (SELECT 1 FROM link_tombstones WHERE slug = ?)
    ON CONFLICT(slug) DO NOTHING
  `).bind(
    values.slug,
    values.id,
    values.url,
    values.comment,
    values.createdAt,
    values.updatedAt,
    values.expiration,
    values.title,
    values.description,
    values.image,
    values.apple,
    values.google,
    values.cloaking === null ? null : Number(values.cloaking),
    values.redirectWithQuery === null ? null : Number(values.redirectWithQuery),
    values.password,
    values.unsafe === null ? null : Number(values.unsafe),
    values.geo === null ? null : JSON.stringify(values.geo),
    values.normalizedUrl,
    values.effectiveExpiresAt,
    values.slug,
  )
  // Each tag statement relies on the preceding SQLite changes() result to keep the tombstone-guarded link and tags atomic.
  const tagStatements = link.tags.flatMap(tag => [
    DB.prepare(`
      INSERT INTO tags (name)
      SELECT ? WHERE changes() = 1
      ON CONFLICT(name) DO UPDATE SET name = excluded.name
    `).bind(tag),
    DB.prepare(`
      INSERT INTO link_tags (link_slug, tag_name)
      SELECT ?, ? WHERE changes() = 1
      ON CONFLICT(link_slug, tag_name) DO UPDATE SET tag_name = excluded.tag_name
    `).bind(link.slug, tag),
  ])
  const [result] = await DB.batch([insert, ...tagStatements])
  return (result?.meta.changes ?? 0) > 0
}
