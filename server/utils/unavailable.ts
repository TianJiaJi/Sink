import type { H3Event } from 'h3'
import type { RedirectLocale } from './redirect-i18n'
import { withQuery } from 'ufo'

export type UnavailableReason = 'expired' | 'cap' | 'blocked' | 'disabled' | 'notfound'

/**
 * Handle an "unavailable" link (expired / click cap reached / geo-blocked).
 *
 * If `NUXT_UNAVAILABLE_REDIRECT_URL` is configured, redirect there with a
 * `?reason=` query param so the owner's own site can render the right page.
 * Otherwise fall back to the built-in default page (generateUnavailableHtml).
 *
 * Return value is meant to be `return`ed from the redirect middleware.
 */
export function handleUnavailable(event: H3Event, reason: UnavailableReason, locale: RedirectLocale | undefined) {
  const { unavailableRedirectUrl } = useRuntimeConfig(event)
  if (unavailableRedirectUrl) {
    return sendRedirect(event, withQuery(unavailableRedirectUrl, { reason }), 302)
  }

  setHeader(event, 'Content-Type', 'text/html; charset=utf-8')
  setHeader(event, 'Cache-Control', 'no-store')
  return generateUnavailableHtml(reason, locale)
}
