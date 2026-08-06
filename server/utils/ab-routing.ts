import type { Link } from '#shared/schemas/link'

/**
 * Pick a target URL from an A/B variant list using weighted random selection.
 * Falls back to the first (or last) variant if weights somehow don't sum > 0.
 */
export function pickAbVariant(ab: NonNullable<Link['ab']>): string {
  const total = ab.reduce((sum, variant) => sum + variant.weight, 0)
  if (total <= 0)
    return ab[0]?.url ?? ''

  let roll = Math.random() * total
  for (const variant of ab) {
    roll -= variant.weight
    if (roll < 0)
      return variant.url
  }
  return ab[ab.length - 1]?.url ?? ''
}
