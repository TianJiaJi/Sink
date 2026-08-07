import type { H3Event } from 'h3'
import { drizzle } from 'drizzle-orm/d1'
import { linkAuditLogs } from '../database/schema'

export type AuditAction = 'create' | 'edit' | 'delete' | 'reset-clicks'

interface AuditPayload {
  action: AuditAction
  linkSlug: string
  details?: Record<string, unknown>
}

/**
 * Append an audit-log entry. Fire-and-forget on error (never block the user
 * operation just because logging failed) — only logs to console.warn.
 *
 * actor = event.context.userID (set by the auth middleware: 'root' for
 * site-token, real user id for Cloudflare Access). Provenance (authMethod,
 * userEmail, ip) goes into `details` for traceability.
 */
export async function writeAuditLog(event: H3Event, payload: AuditPayload): Promise<void> {
  try {
    const db = drizzle(event.context.cloudflare.env.DB)
    await db.insert(linkAuditLogs).values({
      id: crypto.randomUUID(),
      createdAt: Math.floor(Date.now() / 1000),
      action: payload.action,
      linkSlug: payload.linkSlug,
      actor: event.context.userID || 'unknown',
      details: {
        authMethod: event.context.authMethod,
        userEmail: event.context.userEmail,
        ip: getHeader(event, 'cf-connecting-ip') || '',
        ...payload.details,
      },
    })
  }
  catch (error) {
    console.warn({ event: 'audit_log.write.failed', error: error instanceof Error ? error.message : String(error) })
  }
}
