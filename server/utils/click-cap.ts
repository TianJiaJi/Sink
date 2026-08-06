import type { H3Event } from 'h3'
import { and, eq, isNull, lt, or, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { links } from '../database/schema'

/**
 * Atomically increment a link's click count, but only if it hasn't reached the cap.
 *
 * Single D1 round-trip: `UPDATE ... SET click_count = click_count + 1
 * WHERE slug = ? AND (max_clicks IS NULL OR click_count < max_clicks) RETURNING slug`.
 * A returned row means the click counted (under cap); no row means the cap is reached.
 *
 * Writes go straight to D1 — the KV link cache is bypassed so the counter stays
 * authoritative. `maxClicks` is read from the cached link object (static), so cache
 * freshness doesn't affect correctness.
 *
 * Fails open: on D1 error we return true (allow the redirect) rather than blocking
 * all traffic because of a counter outage.
 */
export async function incrementClickCount(event: H3Event, slug: string, maxClicks: number): Promise<boolean> {
  const db = drizzle(event.context.cloudflare.env.DB)
  try {
    const rows = await db.update(links)
      .set({ clickCount: sql`${links.clickCount} + 1` })
      .where(and(
        eq(links.slug, slug),
        or(isNull(links.maxClicks), lt(links.clickCount, maxClicks)),
      ))
      .returning({ slug: links.slug })
    return rows.length > 0
  }
  catch (error) {
    console.warn('click-cap.increment.failed:', error)
    return true
  }
}
