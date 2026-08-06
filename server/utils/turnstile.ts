import type { H3Event } from 'h3'
import { ofetch } from 'ofetch'

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

/**
 * Turnstile is considered active only when both the secret (server-side) and
 * the sitekey (public) are configured. If either is missing, every gate
 * degrades to a pass-through so existing password / redirect behavior is intact.
 */
export function isTurnstileEnabled(event: H3Event): boolean {
  const { turnstileSecret } = useRuntimeConfig(event)
  const { turnstileSitekey } = useRuntimeConfig(event).public
  return !!(turnstileSecret && turnstileSitekey)
}

export function getTurnstileSitekey(event: H3Event): string {
  return useRuntimeConfig(event).public.turnstileSitekey || ''
}

/**
 * Validate a Turnstile token via the siteverify endpoint.
 * Returns true when Turnstile is not configured (degraded mode) so callers can
 * gate on `isTurnstileEnabled` separately. A missing/blank token is a failure.
 */
export async function verifyTurnstileToken(
  event: H3Event,
  token: string | undefined | null,
  remoteip?: string,
): Promise<boolean> {
  const { turnstileSecret } = useRuntimeConfig(event)
  if (!turnstileSecret)
    return true
  if (!token)
    return false

  try {
    const result = await ofetch<{ success: boolean }>(SITEVERIFY_URL, {
      method: 'POST',
      body: {
        secret: turnstileSecret,
        response: token,
        ...(remoteip ? { remoteip } : {}),
      },
      timeout: 5000,
      responseType: 'json',
    })
    return !!result.success
  }
  catch (error) {
    console.warn('turnstile.siteverify.failed:', error)
    return false
  }
}
