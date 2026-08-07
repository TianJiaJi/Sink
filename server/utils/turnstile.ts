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
 *
 * Network errors (timeout / ETIMEDOUT) trigger one automatic retry after a
 * short delay. Only a definitive `success: false` from Cloudflare returns
 * false; repeated network failures are also treated as false (fail-closed)
 * but are logged at ERROR level so operators can tell them apart from a
 * genuine verification rejection.
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
    const result = await ofetch<{ 'success': boolean, 'error-codes'?: string[] }>(SITEVERIFY_URL, {
      method: 'POST',
      body: {
        secret: turnstileSecret,
        response: token,
        ...(remoteip ? { remoteip } : {}),
      },
      timeout: 5_000,
      retry: 1,
      retryDelay: 200,
      retryOn: [408, 429, 502, 503, 504],
      responseType: 'json',
    })
    if (result.success)
      return true
    console.warn('turnstile.siteverify.rejected:', result['error-codes'])
    return false
  }
  catch (error) {
    const isNetworkError = error instanceof Error && /ETIMEDOUT|TIMEOUT|aborted|ECONN/i.test(error.message)
    if (isNetworkError) {
      console.error('turnstile.siteverify.network_timeout: retries exhausted — challenges.cloudflare.com unreachable from this Worker')
    }
    else {
      console.warn('turnstile.siteverify.failed:', error)
    }
    return false
  }
}
