import type { H3Event } from 'h3'
import type { Link } from '#shared/schemas/link'
import { incrementClickCount } from './click-cap'

// evalCountryGate lives in shared/utils/redirect-gates.ts so both the server
// middleware and the client-side country-preview use the same rule. Nuxt
// auto-imports it everywhere — no re-export needed here (re-exporting caused a
// "duplicated imports" warning).

/**
 * Click-cap gate. Atomically increments the visit counter (D1) and returns true
 * if the visit is allowed, false if the cap is reached. No-op (true) when
 * maxClicks is unset. Fails open on D1 error (see incrementClickCount).
 */
export async function checkClickCap(event: H3Event, link: Pick<Link, 'slug' | 'maxClicks'>): Promise<boolean> {
  if (!link.maxClicks)
    return true
  return incrementClickCount(event, link.slug, link.maxClicks)
}
