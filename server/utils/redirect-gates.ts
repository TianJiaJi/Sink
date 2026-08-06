import type { H3Event } from 'h3'
import type { Link } from '#shared/schemas/link'
import { incrementClickCount } from './click-cap'

/**
 * Country allow/deny gate. Returns 'block' if the visitor's country is denied
 * by the link's lists, 'allow' otherwise (including when country is unknown —
 * we fail open to avoid blocking legit visitors whose country can't be detected).
 */
export function evalCountryGate(link: Pick<Link, 'countryAllow' | 'countryBlock'>, country: string | undefined): 'allow' | 'block' {
  if (!country || typeof country !== 'string')
    return 'allow'
  const code = country.toUpperCase()
  if ((link.countryAllow?.length && !link.countryAllow.includes(code)) || link.countryBlock?.includes(code))
    return 'block'
  return 'allow'
}

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
