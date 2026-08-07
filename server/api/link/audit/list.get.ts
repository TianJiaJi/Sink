import { and, desc, eq, lt } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { z } from 'zod'
import { linkAuditLogs } from '../../../database/schema'

defineRouteMeta({
  openAPI: {
    description: 'List audit log entries (create/edit/delete/reset-clicks)',
    security: [{ bearerAuth: [] }],
    parameters: [
      { name: 'slug', in: 'query', required: false, schema: { type: 'string' }, description: 'Filter by link slug' },
      { name: 'limit', in: 'query', required: false, schema: { type: 'integer', default: 50, maximum: 100 } },
      { name: 'cursor', in: 'query', required: false, schema: { type: 'string' }, description: 'createdAt cursor for pagination' },
    ],
  },
})

const AuditListQuerySchema = z.object({
  slug: z.string().trim().min(1).max(2048).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().trim().optional(),
})

export default eventHandler(async (event) => {
  const { slug, limit, cursor } = await getValidatedQuery(event, AuditListQuerySchema.parse)
  const db = drizzle(event.context.cloudflare.env.DB)

  const conditions = []
  if (slug)
    conditions.push(eq(linkAuditLogs.linkSlug, slug))
  if (cursor) {
    const cursorTime = Number(cursor)
    if (Number.isFinite(cursorTime))
      conditions.push(lt(linkAuditLogs.createdAt, cursorTime))
  }

  const rows = await db.select().from(linkAuditLogs).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(linkAuditLogs.createdAt)).limit(limit + 1)

  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows
  const last = page.at(-1)

  return {
    logs: page,
    list_complete: !hasMore,
    cursor: hasMore && last ? String(last.createdAt) : undefined,
  }
})
