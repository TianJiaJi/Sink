import type { H3Event } from 'h3'
import type { Link } from '#shared/schemas/link'
import type { LinkMigrationMarker } from '#shared/schemas/link-migration'
import type { LinkSearchItem, LinkSortBy } from '#shared/types/link'
import { and, asc, desc, eq, gt, isNotNull, isNull, lt, lte, or, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { parseURL, stringifyParsedURL } from 'ufo'
import { StoredLinkSchema } from '#shared/schemas/link'
import { LinkMigrationMarkerSchema } from '#shared/schemas/link-migration'
import { links, linkTombstones } from '../database/schema'

export const LINK_MIGRATION_MARKER_KEY = 'migration:kv-to-d1:v1'
const D1_CURSOR_PREFIX = 'd1:v1:'
const KV_CURSOR_PREFIX = 'kv:v1:'

type LinkRow = typeof links.$inferSelect

export function withoutQuery(url: string): string {
  const parsed = parseURL(url)
  return stringifyParsedURL({ ...parsed, search: '' })
}

export function normalizeSlug(event: H3Event, slug: string): string {
  const { caseSensitive } = useRuntimeConfig(event)
  return caseSensitive ? slug : slug.toLowerCase()
}

export function buildShortLink(event: H3Event, slug: string): string {
  return `${getRequestProtocol(event)}://${getRequestHost(event)}/${slug}`
}

function getDatabase(event: H3Event) {
  return drizzle(event.context.cloudflare.env.DB)
}

function isActiveExpiration(expiration: number | null | undefined): boolean {
  return expiration === null || expiration === undefined || expiration > Math.floor(Date.now() / 1000)
}

function activeCondition(now = Math.floor(Date.now() / 1000)) {
  return or(isNull(links.effectiveExpiresAt), gt(links.effectiveExpiresAt, now))
}

function rowToLink(row: LinkRow): Link {
  const link: Link = {
    id: row.id,
    url: row.url,
    slug: row.slug,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }

  const optionalFields = [
    'comment',
    'expiration',
    'title',
    'description',
    'image',
    'apple',
    'google',
    'cloaking',
    'redirectWithQuery',
    'password',
    'unsafe',
    'geo',
  ] as const

  for (const field of optionalFields) {
    const value = row[field]
    if (value !== null)
      Object.assign(link, { [field]: value })
  }

  return link
}

function linkValues(event: H3Event, link: Link, effectiveExpiresAt?: number | null) {
  return {
    slug: link.slug,
    id: link.id,
    url: link.url,
    comment: link.comment ?? null,
    createdAt: link.createdAt,
    updatedAt: link.updatedAt,
    expiration: link.expiration ?? null,
    title: link.title ?? null,
    description: link.description ?? null,
    image: link.image ?? null,
    apple: link.apple ?? null,
    google: link.google ?? null,
    cloaking: link.cloaking ?? null,
    redirectWithQuery: link.redirectWithQuery ?? null,
    password: link.password ?? null,
    unsafe: link.unsafe ?? null,
    geo: link.geo ?? null,
    normalizedUrl: withoutQuery(link.url),
    effectiveExpiresAt: effectiveExpiresAt === undefined ? getExpiration(event, link.expiration) ?? null : effectiveExpiresAt,
  }
}

function logCacheError(operation: string, slug: string, error: unknown): void {
  console.error({
    event: 'link_cache.operation.failed',
    operation,
    slug,
    error: error instanceof Error ? error.message : String(error),
  })
}

export async function putLinkCache(event: H3Event, link: Link, effectiveExpiresAt?: number | null): Promise<void> {
  const { KV } = event.context.cloudflare.env
  const expiration = effectiveExpiresAt === undefined ? getExpiration(event, link.expiration) : effectiveExpiresAt ?? undefined
  await KV.put(`link:${link.slug}`, JSON.stringify(link), {
    expiration,
    metadata: {
      expiration,
      url: withoutQuery(link.url),
      comment: link.comment,
    },
  })
}

async function writeThroughCache(event: H3Event, link: Link, effectiveExpiresAt?: number | null): Promise<void> {
  try {
    await putLinkCache(event, link, effectiveExpiresAt)
  }
  catch (error) {
    logCacheError('put', link.slug, error)
  }
}

async function deleteCache(event: H3Event, slug: string): Promise<void> {
  try {
    await event.context.cloudflare.env.KV.delete(`link:${slug}`)
  }
  catch (error) {
    logCacheError('delete', slug, error)
  }
}

export async function getCachedLinkWithMetadata(event: H3Event, slug: string, cacheTtl?: number): Promise<{ link: Link | null, metadata: Record<string, unknown> | null }> {
  const { KV } = event.context.cloudflare.env
  const result = await KV.getWithMetadata(`link:${slug}`, { type: 'json', cacheTtl })
  const parsed = StoredLinkSchema.safeParse(result.value)
  const metadata = result.metadata as Record<string, unknown> | null
  const metadataExpiration = typeof metadata?.expiration === 'number' ? metadata.expiration : undefined

  if (!parsed.success || !isActiveExpiration(metadataExpiration ?? parsed.data.expiration)) {
    if (result.value !== null)
      await deleteCache(event, slug)
    return { link: null, metadata }
  }

  return { link: parsed.data, metadata }
}

export async function getLink(event: H3Event, slug: string, cacheTtl?: number): Promise<Link | null> {
  const cached = await getCachedLinkWithMetadata(event, slug, cacheTtl)
  if (cached.link)
    return cached.link

  const row = await getAuthoritativeLinkRow(event, slug, false)
  if (!row)
    return null
  const link = rowToLink(row)
  await writeThroughCache(event, link, row.effectiveExpiresAt)
  return link
}

export async function getMigrationMarker(event: H3Event): Promise<LinkMigrationMarker | null> {
  const value = await event.context.cloudflare.env.KV.get(LINK_MIGRATION_MARKER_KEY)
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

export async function isLinkMigrationComplete(event: H3Event): Promise<boolean> {
  return (await getMigrationMarker(event)) !== null
}

export async function migrateLegacyLink(event: H3Event, slug: string): Promise<void> {
  if (await isLinkMigrationComplete(event))
    return

  const { link, metadata } = await getCachedLinkWithMetadata(event, slug)
  if (!link)
    return

  const metadataExpiration = typeof metadata?.expiration === 'number' ? metadata.expiration : undefined
  await migrateKvLink(event, link, metadataExpiration)
}

async function getAuthoritativeLinkRow(event: H3Event, slug: string, migrateLegacy = true): Promise<LinkRow | null> {
  if (migrateLegacy)
    await migrateLegacyLink(event, slug)

  const rows = await getDatabase(event).select().from(links).where(and(eq(links.slug, slug), activeCondition())).limit(1)
  return rows[0] ?? null
}

export async function getAuthoritativeLink(event: H3Event, slug: string, migrateLegacy = true): Promise<Link | null> {
  const row = await getAuthoritativeLinkRow(event, slug, migrateLegacy)
  return row ? rowToLink(row) : null
}

export async function getLinkWithMetadata(event: H3Event, slug: string): Promise<{ link: Link | null, metadata: Record<string, unknown> | null }> {
  const row = await getAuthoritativeLinkRow(event, slug)
  const link = row ? rowToLink(row) : null
  return {
    link,
    metadata: row && link
      ? { expiration: row.effectiveExpiresAt ?? undefined, url: withoutQuery(link.url), comment: link.comment }
      : null,
  }
}

export async function linkExists(event: H3Event, slug: string): Promise<boolean> {
  return (await getAuthoritativeLink(event, slug)) !== null
}

export async function createLink(event: H3Event, link: Link): Promise<boolean> {
  await migrateLegacyLink(event, link.slug)
  const db = getDatabase(event)
  const now = Math.floor(Date.now() / 1000)
  const values = linkValues(event, link)
  const insert = db.insert(links).values(values).onConflictDoUpdate({
    target: links.slug,
    set: values,
    setWhere: and(isNotNull(links.effectiveExpiresAt), lte(links.effectiveExpiresAt, now)),
  }).returning({ slug: links.slug })
  const clearTombstone = db.delete(linkTombstones).where(and(
    eq(linkTombstones.slug, link.slug),
    sql`exists (select 1 from ${links} where ${links.slug} = ${link.slug} and ${links.id} = ${link.id})`,
  ))
  const [created] = await db.batch([insert, clearTombstone])

  if (!created.length)
    return false

  await writeThroughCache(event, link, values.effectiveExpiresAt)
  return true
}

export async function importLink(event: H3Event, link: Link): Promise<boolean> {
  return await createLink(event, link)
}

export async function migrateKvLink(event: H3Event, link: Link, effectiveExpiresAt?: number): Promise<boolean> {
  const values = linkValues(event, link, effectiveExpiresAt)
  const result = await event.context.cloudflare.env.DB.prepare(`
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
  ).run()
  return result.meta.changes > 0
}

interface ExpectedLinkVersion {
  id: string
  updatedAt: number
}

export async function updateLink(event: H3Event, link: Link, expected?: ExpectedLinkVersion): Promise<boolean> {
  const values = linkValues(event, link)
  const updated = await getDatabase(event).update(links).set(values).where(and(
    eq(links.slug, link.slug),
    activeCondition(),
    expected ? eq(links.id, expected.id) : undefined,
    expected ? eq(links.updatedAt, expected.updatedAt) : undefined,
  )).returning({ slug: links.slug })
  if (!updated.length)
    return false
  await writeThroughCache(event, link, values.effectiveExpiresAt)
  return true
}

export async function putLink(event: H3Event, link: Link): Promise<void> {
  await updateLink(event, link)
}

export async function deleteLink(event: H3Event, slug: string): Promise<void> {
  const db = getDatabase(event)
  const now = Math.floor(Date.now() / 1000)
  await db.batch([
    db.delete(links).where(eq(links.slug, slug)),
    db.insert(linkTombstones).values({ slug, deletedAt: now }).onConflictDoUpdate({
      target: linkTombstones.slug,
      set: { deletedAt: now },
    }),
  ])
  await deleteCache(event, slug)
}

interface ListLinksOptions {
  limit: number
  cursor?: string
  sort?: LinkSortBy
}

interface ListLinksResult {
  links: Link[]
  list_complete: boolean
  cursor?: string
}

interface D1Cursor {
  sort: LinkSortBy
  slug: string
  createdAt?: number
}

function encodeCursor(cursor: D1Cursor): string {
  return `${D1_CURSOR_PREFIX}${btoa(JSON.stringify(cursor))}`
}

function decodeCursor(cursor: string | undefined, sort: LinkSortBy): D1Cursor | undefined {
  if (!cursor || !cursor.startsWith(D1_CURSOR_PREFIX))
    return undefined
  try {
    const decoded = JSON.parse(atob(cursor.slice(D1_CURSOR_PREFIX.length))) as D1Cursor
    if (decoded.sort !== sort || typeof decoded.slug !== 'string')
      throw new Error('Cursor does not match sort')
    if ((sort === 'newest' || sort === 'oldest') && typeof decoded.createdAt !== 'number')
      throw new Error('Cursor is missing creation time')
    return decoded
  }
  catch {
    throw createError({ status: 400, statusText: 'Invalid pagination cursor' })
  }
}

function encodeKvCursor(cursor: string): string {
  return `${KV_CURSOR_PREFIX}${btoa(JSON.stringify(cursor))}`
}

function decodeKvCursor(cursor: string | undefined): string | undefined {
  if (!cursor)
    return undefined
  if (!cursor.startsWith(KV_CURSOR_PREFIX))
    return cursor
  try {
    const decoded = JSON.parse(atob(cursor.slice(KV_CURSOR_PREFIX.length))) as unknown
    if (typeof decoded !== 'string')
      throw new Error('Invalid KV cursor')
    return decoded
  }
  catch {
    throw createError({ status: 400, statusText: 'Invalid pagination cursor' })
  }
}

async function listLegacyLinks(event: H3Event, options: ListLinksOptions): Promise<ListLinksResult> {
  const { KV } = event.context.cloudflare.env
  const list = await KV.list({ prefix: 'link:', limit: options.limit, cursor: decodeKvCursor(options.cursor) })
  const values = await Promise.all(list.keys.map(async key => (await getCachedLinkWithMetadata(event, key.name.slice(5))).link))
  return {
    links: values.filter((link): link is Link => link !== null),
    list_complete: list.list_complete,
    cursor: 'cursor' in list && list.cursor ? encodeKvCursor(list.cursor) : undefined,
  }
}

export async function listLinks(event: H3Event, options: ListLinksOptions): Promise<ListLinksResult> {
  const source = options.cursor?.startsWith(D1_CURSOR_PREFIX)
    ? 'd1'
    : options.cursor
      ? 'kv'
      : await isLinkMigrationComplete(event) ? 'd1' : 'kv'

  if (source === 'kv')
    return await listLegacyLinks(event, options)

  const sort = options.sort ?? 'az'
  const cursor = decodeCursor(options.cursor, sort)
  let cursorCondition
  let order

  if (sort === 'az') {
    cursorCondition = cursor ? gt(links.slug, cursor.slug) : undefined
    order = [asc(links.slug)]
  }
  else if (sort === 'za') {
    cursorCondition = cursor ? lt(links.slug, cursor.slug) : undefined
    order = [desc(links.slug)]
  }
  else if (sort === 'newest') {
    cursorCondition = cursor ? or(lt(links.createdAt, cursor.createdAt!), and(eq(links.createdAt, cursor.createdAt!), gt(links.slug, cursor.slug))) : undefined
    order = [desc(links.createdAt), asc(links.slug)]
  }
  else {
    cursorCondition = cursor ? or(gt(links.createdAt, cursor.createdAt!), and(eq(links.createdAt, cursor.createdAt!), gt(links.slug, cursor.slug))) : undefined
    order = [asc(links.createdAt), asc(links.slug)]
  }

  const rows = await getDatabase(event).select().from(links).where(and(activeCondition(), cursorCondition)).orderBy(...order).limit(options.limit + 1)
  const hasMore = rows.length > options.limit
  const page = hasMore ? rows.slice(0, options.limit) : rows
  const last = page.at(-1)
  return {
    links: page.map(rowToLink),
    list_complete: !hasMore,
    cursor: hasMore && last ? encodeCursor({ sort, slug: last.slug, createdAt: last.createdAt }) : undefined,
  }
}

interface SearchLinksOptions {
  q?: string
  url?: string
  limit?: number
}

export async function searchLinks(event: H3Event, options: SearchLinksOptions): Promise<LinkSearchItem[]> {
  if (!await isLinkMigrationComplete(event)) {
    const result: LinkSearchItem[] = []
    let cursor: string | undefined
    do {
      const page = await listLegacyLinks(event, { limit: 1000, cursor })
      for (const link of page.links) {
        const item = { slug: link.slug, url: withoutQuery(link.url), comment: link.comment }
        if ((!options.url || item.url === withoutQuery(options.url))
          && (!options.q || `${item.slug}\n${item.url}\n${item.comment ?? ''}`.toLowerCase().includes(options.q.toLowerCase()))) {
          result.push(item)
        }
      }
      cursor = page.cursor
      if (page.list_complete)
        break
    } while (cursor)
    return options.limit ? result.slice(0, options.limit) : result
  }

  const conditions = [activeCondition()]
  if (options.url)
    conditions.push(eq(links.normalizedUrl, withoutQuery(options.url)))
  if (options.q) {
    const pattern = `%${options.q.toLowerCase().replace(/[!%_]/g, '!$&')}%`
    conditions.push(or(
      sql`lower(${links.slug}) like ${pattern} escape '!'`,
      sql`lower(${links.url}) like ${pattern} escape '!'`,
      sql`lower(coalesce(${links.comment}, '')) like ${pattern} escape '!'`,
    )!)
  }

  let query = getDatabase(event).select({ slug: links.slug, url: links.normalizedUrl, comment: links.comment }).from(links).where(and(...conditions)).orderBy(asc(links.slug)).$dynamic()
  if (options.limit)
    query = query.limit(options.limit)
  const rows = await query
  return rows.map(row => ({ slug: row.slug, url: row.url, ...(row.comment === null ? {} : { comment: row.comment }) }))
}
