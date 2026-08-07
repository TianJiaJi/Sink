import type { Link } from '../schemas/link'

/**
 * Country allow/deny gate. Returns 'block' if the visitor's country is denied
 * by the link's lists, 'allow' otherwise (including when country is unknown —
 * we fail open to avoid blocking legit visitors whose country can't be detected).
 *
 * Lives in shared/ so both the redirect middleware (server) and the dashboard
 * country-preview component (client) use the exact same rule.
 */
export function evalCountryGate(link: Pick<Link, 'countryAllow' | 'countryBlock'>, country: string | undefined): 'allow' | 'block' {
  if (!country || typeof country !== 'string')
    return 'allow'
  const code = country.toUpperCase()
  if ((link.countryAllow?.length && !link.countryAllow.includes(code)) || link.countryBlock?.includes(code))
    return 'block'
  return 'allow'
}
