import type { LinkMigrationMarker, LinkMigrationRunResult } from '#shared/schemas/link-migration'
import { parseLegacyKvLink } from '#shared/schemas/link'
import { LinkMigrationRunSchema } from '#shared/schemas/link-migration'

const MIGRATION_CURSOR_PREFIX = 'migration:v1:'

interface MigrationRunRow {
  id: string
  expected_cursor: string | null
  scanned: number
  inserted: number
  skipped: number
  expired: number
  force: number
  status: 'running' | 'completed'
}

defineRouteMeta({
  openAPI: {
    description: 'Migrate one bounded page of legacy KV links to D1',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'cursor',
        in: 'query',
        required: false,
        schema: { type: 'string' },
        description: 'Opaque migration run cursor',
      },
      {
        name: 'force',
        in: 'query',
        required: false,
        schema: { type: 'boolean', default: false },
        description: 'Rescan KV without overwriting D1 rows',
      },
    ],
    requestBody: {
      required: false,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              cursor: { type: 'string', description: 'Opaque migration run cursor' },
              force: { type: 'boolean', default: false, description: 'Rescan KV without overwriting D1 rows' },
            },
          },
        },
      },
    },
  },
})

function encodeMigrationCursor(runId: string): string {
  return `${MIGRATION_CURSOR_PREFIX}${btoa(JSON.stringify({ runId }))}`
}

function decodeMigrationCursor(cursor: string): string {
  if (!cursor.startsWith(MIGRATION_CURSOR_PREFIX))
    throw createError({ status: 400, statusText: 'Invalid migration cursor' })
  try {
    const value = JSON.parse(atob(cursor.slice(MIGRATION_CURSOR_PREFIX.length))) as { runId?: unknown }
    if (typeof value.runId !== 'string' || !value.runId)
      throw new Error('Missing migration run ID')
    return value.runId
  }
  catch {
    throw createError({ status: 400, statusText: 'Invalid migration cursor' })
  }
}

function completedResult(): LinkMigrationRunResult {
  return {
    completed: true,
    list_complete: true,
    scanned: 0,
    inserted: 0,
    skipped: 0,
    expired: 0,
    failed: 0,
    failedItems: [],
  }
}

async function writeMarker(kv: KVNamespace, run: MigrationRunRow): Promise<void> {
  const marker: LinkMigrationMarker = {
    version: 1,
    completedAt: new Date().toISOString(),
    scanned: run.scanned,
    inserted: run.inserted,
    skipped: run.skipped,
    expired: run.expired,
  }
  await kv.put(LINK_MIGRATION_MARKER_KEY, JSON.stringify(marker))
}

export default eventHandler(async (event): Promise<LinkMigrationRunResult> => {
  const body = await readBody<Record<string, unknown> | null>(event)
  const input = LinkMigrationRunSchema.parse(Object.assign({}, getQuery(event), body))
  const { DB, KV } = event.context.cloudflare.env
  const now = Math.floor(Date.now() / 1000)
  let run: MigrationRunRow | null

  if (input.cursor) {
    const runId = decodeMigrationCursor(input.cursor)
    run = await DB.prepare('SELECT * FROM link_migration_runs WHERE id = ?').bind(runId).first<MigrationRunRow>()
    if (!run)
      throw createError({ status: 409, statusText: 'Migration run no longer exists' })
    if (input.force !== Boolean(run.force))
      throw createError({ status: 400, statusText: 'Migration cursor does not match force mode' })
  }
  else {
    const existingMarker = await getMigrationMarker(event)
    if (existingMarker && !input.force)
      return completedResult()

    const runId = crypto.randomUUID()
    run = {
      id: runId,
      expected_cursor: null,
      scanned: 0,
      inserted: 0,
      skipped: 0,
      expired: 0,
      force: Number(input.force),
      status: 'running',
    }
    await DB.prepare(`
      INSERT INTO link_migration_runs
        (id, expected_cursor, scanned, inserted, skipped, expired, force, status, created_at, updated_at)
      VALUES (?, NULL, 0, 0, 0, 0, ?, 'running', ?, ?)
    `).bind(runId, run.force, now, now).run()
  }

  if (run.status === 'completed') {
    await writeMarker(KV, run)
    return completedResult()
  }

  const page = await KV.list({ prefix: 'link:', limit: 40, cursor: run.expected_cursor ?? undefined })
  const result: LinkMigrationRunResult = {
    completed: false,
    list_complete: false,
    cursor: encodeMigrationCursor(run.id),
    scanned: page.keys.length,
    inserted: 0,
    skipped: 0,
    expired: 0,
    failed: 0,
    failedItems: [],
  }

  for (const key of page.keys) {
    try {
      const stored = await KV.getWithMetadata(key.name, { type: 'json' })
      const parsed = parseLegacyKvLink(stored.value, key.name.slice(5))
      if (!parsed.success)
        throw new Error(parsed.error.issues.map(issue => issue.message).join('; '))

      const link = parsed.data
      link.slug = normalizeSlug(event, link.slug)
      const metadata = stored.metadata as Record<string, unknown> | null
      const metadataExpiration = typeof metadata?.expiration === 'number' ? metadata.expiration : undefined
      const effectiveExpiresAt = metadataExpiration ?? key.expiration ?? getExpiration(event, link.expiration)

      if (effectiveExpiresAt !== undefined && effectiveExpiresAt <= now) {
        result.expired++
        continue
      }

      if (await migrateKvLink(event, link, effectiveExpiresAt))
        result.inserted++
      else
        result.skipped++
    }
    catch (error) {
      result.failed++
      result.failedItems.push({
        key: key.name,
        reason: error instanceof Error ? error.message : String(error),
      })
    }
  }

  if (result.failed > 0) {
    await DB.prepare('DELETE FROM link_migration_runs WHERE id = ?').bind(run.id).run()
    delete result.cursor
    return result
  }

  const nextCursor = 'cursor' in page ? page.cursor : null
  const status = page.list_complete ? 'completed' : 'running'
  const updatedRun = await DB.prepare(`
    UPDATE link_migration_runs
    SET expected_cursor = ?, scanned = scanned + ?, inserted = inserted + ?,
        skipped = skipped + ?, expired = expired + ?, status = ?, updated_at = ?
    WHERE id = ? AND status = 'running' AND expected_cursor IS ?
    RETURNING *
  `).bind(
    nextCursor,
    result.scanned,
    result.inserted,
    result.skipped,
    result.expired,
    status,
    now,
    run.id,
    run.expected_cursor,
  ).first<MigrationRunRow>()

  if (!updatedRun)
    throw createError({ status: 409, statusText: 'Migration page was already processed' })

  result.list_complete = page.list_complete
  if (page.list_complete) {
    await writeMarker(KV, updatedRun)
    result.completed = true
    delete result.cursor
  }
  return result
})
