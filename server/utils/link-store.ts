import type { H3Event } from 'h3'
import type { Link } from '#shared/schemas/link'
import type { LinkMigrationMarker } from '#shared/schemas/link-migration'
import type { LinkSearchItem, LinkSortBy, LinkStatus } from '#shared/types/link'
import { and, asc, count, desc, eq, gt, inArray, isNotNull, isNull, lt, lte, or, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { parseURL, stringifyParsedURL } from 'ufo'
import { StoredLinkSchema } from '#shared/schemas/link'
import { LinkMigrationMarkerSchema } from '#shared/schemas/link-migration'
import { links, linkTags, linkTombstones, tags } from '../database/schema'

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

function statusCondition(status: LinkStatus, now = Math.floor(Date.now() / 1000)) {
  if (status === 'active')
    return activeCondition(now)
  if (status === 'expired')
    return and(isNotNull(links.effectiveExpiresAt), lte(links.effectiveExpiresAt, now))
  return undefined
}

function rowToLink(row: LinkRow): Link {
  const link: Link = {
    id: row.id,
    url: row.url,
    slug: row.slug,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    tags: [],
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

async function addTagsToLinks<T extends { slug: string, tags: string[] }>(event: H3Event, result: T[], slugs: string[]): Promise<T[]> {
  const bySlug = new Map(result.map(link => [link.slug, link]))
  for (let offset = 0; offset < slugs.length; offset += 90) {
    const rows = await getDatabase(event)
      .select({ slug: linkTags.linkSlug, tag: linkTags.tagName })
      .from(linkTags)
      .where(inArray(linkTags.linkSlug, slugs.slice(offset, offset + 90)))
      .orderBy(asc(linkTags.tagName))
    for (const row of rows)
      bySlug.get(row.slug)?.tags.push(row.tag)
  }
  return result
}

async function rowsToLinks(event: H3Event, rows: LinkRow[]): Promise<Link[]> {
  const result = rows.map(rowToLink)
  return await addTagsToLinks(event, result, result.map(link => link.slug))
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
  })
}

async function writeThroughCache(event: H3Event, link: Link, effectiveExpiresAt?: number | null): Promise<void> {
  const expiration = effectiveExpiresAt === undefined ? getExpiration(event, link.expiration) : effectiveExpiresAt
  if (!isActiveExpiration(expiration)) {
    await deleteCache(event, link.slug)
    return
  }

  try {
    await putLinkCache(event, link, effectiveExpiresAt)
    const rows = await getDatabase(event).select({ id: links.id }).from(links).where(and(
      eq(links.slug, link.slug),
      eq(links.id, link.id),
      eq(links.updatedAt, link.updatedAt),
      activeCondition(),
    )).limit(1)
    if (!rows.length)
      await deleteCache(event, link.slug)
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
  if (cached.link) {
    if (!await isLinkMigrationComplete(event)) {
      const rows = await getDatabase(event).select().from(links).where(eq(links.slug, slug)).limit(1)
      const row = rows[0]
      if (row) {
        if (!isActiveExpiration(row.effectiveExpiresAt)) {
          await deleteCache(event, slug)
          return null
        }

        if (row.id === cached.link.id && row.updatedAt === cached.link.updatedAt)
          return cached.link

        await deleteCache(event, slug)
        const [link] = await rowsToLinks(event, [row])
        if (!link)
          return null
        await writeThroughCache(event, link, row.effectiveExpiresAt)
        return link
      }

      const tombstone = await getDatabase(event).select({ slug: linkTombstones.slug }).from(linkTombstones).where(eq(linkTombstones.slug, slug)).limit(1)
      if (!tombstone.length)
        return cached.link

      await deleteCache(event, slug)
      return null
    }

    const rows = await getDatabase(event).select({ id: links.id, updatedAt: links.updatedAt }).from(links).where(and(
      eq(links.slug, slug),
      activeCondition(),
    )).limit(1)
    const current = rows[0]
    if (current?.id === cached.link.id && current.updatedAt === cached.link.updatedAt)
      return cached.link

    await deleteCache(event, slug)
  }

  const row = await getAuthoritativeLinkRow(event, slug, false)
  if (!row)
    return null
  const [link] = await rowsToLinks(event, [row])
  if (!link)
    return null
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
  return row ? (await rowsToLinks(event, [row]))[0] ?? null : null
}

export async function getAnyAuthoritativeLink(event: H3Event, slug: string): Promise<Link | null> {
  await migrateLegacyLink(event, slug)
  const rows = await getDatabase(event).select().from(links).where(eq(links.slug, slug)).limit(1)
  return rows[0] ? (await rowsToLinks(event, rows))[0] ?? null : null
}

export async function getLinkWithMetadata(event: H3Event, slug: string): Promise<{ link: Link | null, metadata: Record<string, unknown> | null }> {
  await migrateLegacyLink(event, slug)
  const rows = await getDatabase(event).select().from(links).where(eq(links.slug, slug)).limit(1)
  const row = rows[0]
  const link = row ? (await rowsToLinks(event, [row]))[0] ?? null : null
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
  const tagInserts = link.tags.map(tag => db.insert(tags).values({ name: tag }).onConflictDoNothing())
  const clearTags = db.delete(linkTags).where(and(
    eq(linkTags.linkSlug, link.slug),
    sql`exists (select 1 from ${links} where ${links.slug} = ${link.slug} and ${links.id} = ${link.id})`,
  ))
  const associationInserts = link.tags.map(tag => db.insert(linkTags).select(
    db.select({ linkSlug: links.slug, tagName: sql<string>`${tag}`.as('tag_name') })
      .from(links)
      .where(and(eq(links.slug, link.slug), eq(links.id, link.id))),
  ).onConflictDoNothing())
  const [created] = await db.batch([insert, clearTombstone, clearTags, ...tagInserts, ...associationInserts])

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
  // Each guarded upsert reports one change, carrying the initial link insert result through the batch.
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

interface ExpectedLinkVersion {
  id: string
  updatedAt: number
}

export async function updateLink(event: H3Event, link: Link, expected?: ExpectedLinkVersion): Promise<boolean> {
  const values = linkValues(event, link)
  const db = getDatabase(event)
  const update = db.update(links).set(values).where(and(
    eq(links.slug, link.slug),
    expected ? eq(links.id, expected.id) : undefined,
    expected ? eq(links.updatedAt, expected.updatedAt) : undefined,
  )).returning({ slug: links.slug })
  const currentVersion = and(
    eq(links.slug, link.slug),
    expected ? eq(links.id, expected.id) : undefined,
    expected ? eq(links.updatedAt, expected.updatedAt) : undefined,
  )
  const clearTags = db.delete(linkTags).where(and(
    eq(linkTags.linkSlug, link.slug),
    sql`exists (select 1 from ${links} where ${currentVersion})`,
  ))
  const tagInserts = link.tags.map(tag => db.insert(tags).values({ name: tag }).onConflictDoNothing())
  const associationInserts = link.tags.map(tag => db.insert(linkTags).select(
    db.select({ linkSlug: links.slug, tagName: sql<string>`${tag}`.as('tag_name') }).from(links).where(currentVersion),
  ).onConflictDoNothing())
  const results = await db.batch([clearTags, ...tagInserts, ...associationInserts, update])
  const updated = results.at(-1) as { slug: string }[]
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
  tag?: string
  status?: LinkStatus
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
  tag?: string
  status: LinkStatus
}

function encodeCursor(cursor: D1Cursor): string {
  return `${D1_CURSOR_PREFIX}${btoa(JSON.stringify(cursor))}`
}

function decodeCursor(cursor: string | undefined, sort: LinkSortBy, tag: string | undefined, status: LinkStatus): D1Cursor | undefined {
  if (!cursor || !cursor.startsWith(D1_CURSOR_PREFIX))
    return undefined
  try {
    const decoded = JSON.parse(atob(cursor.slice(D1_CURSOR_PREFIX.length))) as D1Cursor
    if (decoded.sort !== sort || decoded.tag !== tag || decoded.status !== status || typeof decoded.slug !== 'string')
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
  let links = values.filter((link): link is Link => link !== null)
  if (options.status === 'expired')
    links = []
  if (options.tag)
    links = links.filter(link => link.tags.includes(options.tag!))
  const sort = options.sort ?? 'newest'
  links.sort((a, b) => {
    if (sort === 'az' || sort === 'za')
      return (sort === 'az' ? 1 : -1) * a.slug.localeCompare(b.slug)
    return (sort === 'newest' ? -1 : 1) * (a.createdAt - b.createdAt) || a.slug.localeCompare(b.slug)
  })
  return {
    links,
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

  const sort = options.sort ?? 'newest'
  const status = options.status ?? 'active'
  const cursor = decodeCursor(options.cursor, sort, options.tag, status)
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

  const tagCondition = options.tag
    ? sql`exists (select 1 from ${linkTags} where ${linkTags.linkSlug} = ${links.slug} and ${linkTags.tagName} = ${options.tag})`
    : undefined
  const rows = await getDatabase(event).select().from(links).where(and(statusCondition(status), tagCondition, cursorCondition)).orderBy(...order).limit(options.limit + 1)
  const hasMore = rows.length > options.limit
  const page = hasMore ? rows.slice(0, options.limit) : rows
  const last = page.at(-1)
  return {
    links: await rowsToLinks(event, page),
    list_complete: !hasMore,
    cursor: hasMore && last ? encodeCursor({ sort, slug: last.slug, createdAt: last.createdAt, tag: options.tag, status }) : undefined,
  }
}

export async function listAllAuthoritativeLinks(env: Cloudflare.Env, caseSensitive: boolean): Promise<Link[]> {
  const rawMarker = await env.KV.get(LINK_MIGRATION_MARKER_KEY)
  let migrationComplete = false
  if (rawMarker) {
    try {
      migrationComplete = LinkMigrationMarkerSchema.safeParse(JSON.parse(rawMarker)).success
    }
    catch {
      // Malformed markers must keep the legacy source enabled.
    }
  }

  const db = drizzle(env.DB)
  const rows = await db.select().from(links).orderBy(asc(links.slug))
  const result = rows.map((row) => {
    const link = rowToLink(row)
    if (link.expiration === undefined && row.effectiveExpiresAt !== null)
      link.expiration = row.effectiveExpiresAt
    return link
  })
  const bySlug = new Map(result.map(link => [link.slug, link]))

  const tagRows = await db
    .select({ slug: linkTags.linkSlug, tag: linkTags.tagName })
    .from(linkTags)
    .orderBy(asc(linkTags.tagName))
  for (const row of tagRows)
    bySlug.get(row.slug)?.tags.push(row.tag)

  if (migrationComplete)
    return result

  const tombstoneRows = await db.select({ slug: linkTombstones.slug }).from(linkTombstones)
  const normalize = (slug: string) => caseSensitive ? slug : slug.toLowerCase()
  const unavailableSlugs = new Set([...bySlug.keys(), ...tombstoneRows.map(row => row.slug)].map(normalize))
  let cursor: string | undefined
  do {
    const page = await env.KV.list({ prefix: 'link:', limit: 1000, cursor })
    for (let offset = 0; offset < page.keys.length; offset += 20) {
      const keys = page.keys.slice(offset, offset + 20)
      const values = await Promise.all(keys.map(async (key) => {
        const stored = await env.KV.getWithMetadata(key.name, { type: 'json' })
        const parsed = StoredLinkSchema.safeParse(stored.value)
        if (!parsed.success)
          return null

        const metadata = stored.metadata as { expiration?: unknown } | null
        const effectiveExpiration = (typeof metadata?.expiration === 'number' ? metadata.expiration : undefined)
          ?? key.expiration
        if (parsed.data.expiration === undefined && effectiveExpiration !== undefined)
          parsed.data.expiration = effectiveExpiration
        return parsed.data
      }))
      for (const link of values) {
        if (!link)
          continue
        const slug = normalize(link.slug)
        if (unavailableSlugs.has(slug))
          continue
        result.push({ ...link, slug })
        unavailableSlugs.add(slug)
      }
    }
    cursor = page.list_complete ? undefined : page.cursor
  } while (cursor)

  result.sort((a, b) => a.slug.localeCompare(b.slug))
  return result
}

interface SearchLinksOptions {
  q?: string
  url?: string
  limit?: number
  tag?: string
  status?: LinkStatus
}

export async function searchLinks(event: H3Event, options: SearchLinksOptions): Promise<LinkSearchItem[]> {
  const status = options.status ?? 'active'
  if (!await isLinkMigrationComplete(event)) {
    const result: LinkSearchItem[] = []
    let cursor: string | undefined
    do {
      const page = await listLegacyLinks(event, { limit: 1000, cursor, status, tag: options.tag })
      for (const link of page.links) {
        const item = { slug: link.slug, url: withoutQuery(link.url), comment: link.comment, tags: link.tags }
        if ((!options.url || item.url === withoutQuery(options.url))
          && (!options.q || `${item.slug}\n${item.url}\n${item.comment ?? ''}\n${item.tags.join('\n')}`.toLowerCase().includes(options.q.toLowerCase()))) {
          result.push(item)
        }
      }
      cursor = page.cursor
      if (page.list_complete)
        break
    } while (cursor)
    return options.limit ? result.slice(0, options.limit) : result
  }

  const conditions = [statusCondition(status)]
  if (options.tag) {
    conditions.push(sql`exists (select 1 from ${linkTags} where ${linkTags.linkSlug} = ${links.slug} and ${linkTags.tagName} = ${options.tag})`)
  }
  if (options.url)
    conditions.push(eq(links.normalizedUrl, withoutQuery(options.url)))
  if (options.q) {
    const pattern = `%${options.q.toLowerCase().replace(/[!%_]/g, '!$&')}%`
    conditions.push(or(
      sql`lower(${links.slug}) like ${pattern} escape '!'`,
      sql`lower(${links.url}) like ${pattern} escape '!'`,
      sql`lower(coalesce(${links.comment}, '')) like ${pattern} escape '!'`,
      sql`exists (select 1 from ${linkTags} where ${linkTags.linkSlug} = ${links.slug} and lower(${linkTags.tagName}) like ${pattern} escape '!')`,
    )!)
  }

  let query = getDatabase(event).select({ slug: links.slug, url: links.normalizedUrl, comment: links.comment }).from(links).where(and(...conditions)).orderBy(asc(links.slug)).$dynamic()
  if (options.limit)
    query = query.limit(options.limit)
  const rows = await query
  const result = rows.map(row => ({ slug: row.slug, url: row.url, tags: [] as string[], ...(row.comment === null ? {} : { comment: row.comment }) }))
  return await addTagsToLinks(event, result, result.map(link => link.slug))
}

export async function listTags(event: H3Event): Promise<{ name: string, count: number }[]> {
  return await getDatabase(event)
    .select({ name: tags.name, count: count(linkTags.linkSlug) })
    .from(tags)
    .innerJoin(linkTags, eq(linkTags.tagName, tags.name))
    .groupBy(tags.name)
    .orderBy(asc(tags.name))
}
