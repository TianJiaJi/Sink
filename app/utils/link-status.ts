export type LinkStatus = 'active' | 'limited' | 'expired' | 'capped' | 'disabled'

/**
 * Compute a link's display status.
 * Priority: disabled > expired > capped > limited > active.
 *
 * Extracted as a pure function so it can be unit-tested without mounting the
 * component (the project has no @vue/test-utils).
 */
export function getLinkStatus(link: { disabled?: boolean, expiration?: number, maxClicks?: number, clickCount?: number }): LinkStatus {
  const now = Math.floor(Date.now() / 1000)
  if (link.disabled)
    return 'disabled'
  if (link.expiration && link.expiration <= now)
    return 'expired'
  if (link.maxClicks && (link.clickCount ?? 0) >= link.maxClicks)
    return 'capped'
  if (link.expiration || link.maxClicks)
    return 'limited'
  return 'active'
}
