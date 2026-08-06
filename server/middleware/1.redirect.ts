import type { Link } from '@/types'
import { parsePath, withQuery } from 'ufo'
import { d1GetAnyLink } from '../services/link-store/d1'

const SOCIAL_BOTS = [
  'applebot',
  'discordbot',
  'facebot',
  'facebookexternalhit',
  'linkedinbot',
  'linkexpanding',
  'mastodon',
  'skypeuripreview',
  'slackbot',
  'slackbot-linkexpanding',
  'snapchat',
  'telegrambot',
  'tiktok',
  'twitterbot',
  'whatsapp',
]

const APPLE_DEVICE_UA_MARKERS = ['iphone', 'ipad', 'ipod', 'crios']

function isSocialBot(userAgent: string): boolean {
  const ua = userAgent.toLowerCase()
  return SOCIAL_BOTS.some(bot => ua.includes(bot))
}

function getDeviceRedirectUrl(userAgent: string, link: Link): string | null {
  if (!link.apple && !link.google)
    return null

  const ua = userAgent.toLowerCase()

  if (link.google && ua.includes('android')) {
    return link.google
  }

  if (link.apple && APPLE_DEVICE_UA_MARKERS.some(marker => ua.includes(marker))) {
    return link.apple
  }

  return null
}

function hasOgConfig(link: Link): boolean {
  return !!(link.title || link.image)
}

export default eventHandler(async (event) => {
  const { pathname: slug } = parsePath(event.path.replace(/^\/|\/$/g, ''))
  const { slugRegex, reserveSlug } = useAppConfig()
  const { homeURL, linkCacheTtl, caseSensitive, redirectWithQuery, redirectStatusCode, redirectNoStore } = useRuntimeConfig(event)
  const { cloudflare } = event.context

  if (event.path === '/' && homeURL)
    return sendRedirect(event, homeURL)

  const { notFoundRedirect } = useRuntimeConfig(event)
  // Bypass redirect check for notFoundRedirect path to prevent infinite loop
  if (notFoundRedirect && event.path === notFoundRedirect) {
    return
  }

  if (slug && !reserveSlug.includes(slug) && slugRegex.test(slug) && cloudflare) {
    let link: Link | null = null

    const lowerCaseSlug = slug.toLowerCase()
    link = await getLink(event, caseSensitive ? slug : lowerCaseSlug, linkCacheTtl)

    if (!caseSensitive && !link && lowerCaseSlug !== slug) {
      console.log('original slug fallback:', `slug:${slug} lowerCaseSlug:${lowerCaseSlug}`)
      link = await getLink(event, slug, linkCacheTtl)
    }

    if (link) {
      let locale: RedirectLocale | undefined
      const getLocale = () => {
        locale ??= resolveRedirectLocale(event)
        return locale
      }
      const sendNoStoreHtml = (html: string) => {
        setHeader(event, 'Content-Type', 'text/html; charset=utf-8')
        setHeader(event, 'Cache-Control', 'no-store')
        return html
      }
      const userAgent = getHeader(event, 'user-agent') || ''
      const query = getQuery(event)
      const shouldRedirectWithQuery = link.redirectWithQuery ?? redirectWithQuery
      const buildTarget = (url: string) => shouldRedirectWithQuery ? withQuery(url, query) : url

      // Disabled link: administrator has turned it off
      if (link.disabled) {
        return handleUnavailable(event, 'disabled', getLocale())
      }

      let targetUrl = link.ab?.length ? pickAbVariant(link.ab) : link.url
      const country = event.context.cloudflare?.request?.cf?.country
      if (country && typeof country === 'string') {
        const countryCode = country.toUpperCase()
        // Country allow/deny lists (allow wins semantics: empty = no restriction)
        if ((link.countryAllow?.length && !link.countryAllow.includes(countryCode)) || link.countryBlock?.includes(countryCode)) {
          return handleUnavailable(event, 'blocked', getLocale())
        }
        if (link.geo?.[countryCode]) {
          targetUrl = link.geo[countryCode]!
        }
      }
      targetUrl = buildTarget(targetUrl)

      const deviceRedirectUrl = getDeviceRedirectUrl(userAgent, link)
      const finalTargetUrl = deviceRedirectUrl ?? targetUrl
      event.context.resolvedTargetUrl = finalTargetUrl

      // === Turnstile gate: per-link toggle + every password-protected link (stateless) ===
      const turnstileEnabled = isTurnstileEnabled(event)
      const sitekey = turnstileEnabled ? getTurnstileSitekey(event) : ''
      const needTurnstile = turnstileEnabled && (!!link.turnstile || !!link.password)

      // Password protection check
      if (link.password) {
        const headerPassword = getHeader(event, 'x-link-password')

        if (event.method === 'POST') {
          const body = await readBody(event)
          const submittedPassword = typeof body?.password === 'string' ? body.password : ''

          // Turnstile must pass before the password is even checked (when required)
          if (needTurnstile) {
            const token = typeof body?.['cf-turnstile-response'] === 'string' ? body['cf-turnstile-response'] : ''
            if (!await verifyTurnstileToken(event, token)) {
              return sendNoStoreHtml(generatePasswordHtml(slug, { locale: getLocale(), requireTurnstile: true, sitekey, turnstileError: true }))
            }
          }

          if (!await verifyLinkPassword(submittedPassword, link.password)) {
            return sendNoStoreHtml(generatePasswordHtml(slug, { hasError: true, locale: getLocale(), requireTurnstile: needTurnstile, sitekey }))
          }

          // Password correct - show unsafe warning if needed
          if (link.unsafe && body?.confirm !== 'true') {
            return sendNoStoreHtml(generateUnsafeWarningHtml(slug, finalTargetUrl, { password: submittedPassword, locale: getLocale() }))
          }
        }
        else if (headerPassword) {
          // API path: when Turnstile is triggered, require x-turnstile-token header
          if (needTurnstile) {
            const token = getHeader(event, 'x-turnstile-token')
            if (!await verifyTurnstileToken(event, token || undefined)) {
              throw createError({ status: 403, statusText: 'Turnstile verification required (set x-turnstile-token header)' })
            }
          }
          if (!await verifyLinkPassword(headerPassword, link.password)) {
            throw createError({ status: 403, statusText: 'Incorrect password' })
          }
          // Header-password path: check unsafe warning via x-link-confirm header
          if (link.unsafe && getHeader(event, 'x-link-confirm') !== 'true') {
            throw createError({ status: 403, statusText: 'Unsafe link: confirmation required (set x-link-confirm: true header)' })
          }
        }
        else {
          // GET: render password page, with Turnstile widget when required
          return sendNoStoreHtml(generatePasswordHtml(slug, { locale: getLocale(), requireTurnstile: needTurnstile, sitekey }))
        }
      }
      else if (needTurnstile) {
        // No password, but a Turnstile gate is active (per-link toggle on this link)
        const headerToken = getHeader(event, 'x-turnstile-token')
        if (event.method === 'POST') {
          const body = await readBody(event)
          const token = typeof body?.['cf-turnstile-response'] === 'string' ? body['cf-turnstile-response'] : ''
          if (!await verifyTurnstileToken(event, token)) {
            return sendNoStoreHtml(generateTurnstileGateHtml(slug, sitekey, getLocale()))
          }
          // gate passed -> fall through to redirect (unsafe is skipped below since Turnstile subsumes it)
        }
        else if (headerToken) {
          if (!await verifyTurnstileToken(event, headerToken)) {
            throw createError({ status: 403, statusText: 'Turnstile verification required' })
          }
          // fall through
        }
        else {
          return sendNoStoreHtml(generateTurnstileGateHtml(slug, sitekey))
        }
      }

      // Unsafe link warning (for links without password; skipped when Turnstile already gated the visit)
      if (!link.password && link.unsafe && !needTurnstile) {
        if (event.method === 'POST') {
          const body = await readBody(event)
          if (body?.confirm !== 'true') {
            return sendNoStoreHtml(generateUnsafeWarningHtml(slug, finalTargetUrl, { locale: getLocale() }))
          }
        }
        else {
          return sendNoStoreHtml(generateUnsafeWarningHtml(slug, finalTargetUrl, { locale: getLocale() }))
        }
      }

      event.context.link = link
      let accessLogResult: AccessLogResult | undefined
      try {
        accessLogResult = collectAccessLog(event)
      }
      catch {
        console.error({ event: 'access_log.collection.failed' })
      }

      if (accessLogResult) {
        try {
          writeAccessLog(event, accessLogResult.logs)
        }
        catch {
          console.error({ event: 'access_log.write.failed' })
        }

        try {
          queueLinkClickedWebhook(event, accessLogResult.click, link)
        }
        catch {
          console.error({ event: 'webhook.scheduling.failed' })
        }
      }

      // Click cap: count this valid visit (after all gates passed); block if the cap is reached
      if (link.maxClicks && !(await incrementClickCount(event, slug, link.maxClicks))) {
        return handleUnavailable(event, 'cap', getLocale())
      }

      if (deviceRedirectUrl) {
        if (redirectNoStore)
          setHeader(event, 'Cache-Control', 'no-store')
        return sendRedirect(event, finalTargetUrl, +redirectStatusCode)
      }

      if (isSocialBot(userAgent) && hasOgConfig(link)) {
        const baseUrl = `${getRequestProtocol(event)}://${getRequestHost(event)}`
        const html = generateOgHtml(link, targetUrl, baseUrl)
        setHeader(event, 'Content-Type', 'text/html; charset=utf-8')
        return html
      }

      if (link.cloaking) {
        const baseUrl = `${getRequestProtocol(event)}://${getRequestHost(event)}`
        const html = generateCloakingHtml(link, targetUrl, baseUrl)
        setHeader(event, 'Content-Type', 'text/html; charset=utf-8')
        setHeader(event, 'Cache-Control', 'no-store, private')
        return html
      }

      if (redirectNoStore)
        setHeader(event, 'Cache-Control', 'no-store')
      return sendRedirect(event, finalTargetUrl, +redirectStatusCode)
    }
    else {
      // Distinguish "expired" from "not found". Both render a friendly default
      // page, or redirect when unavailableRedirectUrl / notFoundRedirect is set.
      const anyLink = await d1GetAnyLink(event, caseSensitive ? slug : lowerCaseSlug)
      const now = Math.floor(Date.now() / 1000)
      if (anyLink?.expiration && anyLink.expiration <= now) {
        return handleUnavailable(event, 'expired', resolveRedirectLocale(event))
      }
      if (notFoundRedirect) {
        return sendRedirect(event, notFoundRedirect, 302)
      }
      setHeader(event, 'Content-Type', 'text/html; charset=utf-8')
      setHeader(event, 'Cache-Control', 'no-store')
      return generateUnavailableHtml('notfound', resolveRedirectLocale(event))
    }
  }
  else if (slug && !reserveSlug.includes(slug) && cloudflare && !/\.[a-z0-9]+$/i.test(slug)) {
    // Slug didn't match the allowed format (e.g. trailing symbol) and isn't a
    // static asset — treat it as a non-existent link and show the friendly 404
    // instead of falling through to Nuxt's default error page.
    if (notFoundRedirect) {
      return sendRedirect(event, notFoundRedirect, 302)
    }
    setHeader(event, 'Content-Type', 'text/html; charset=utf-8')
    setHeader(event, 'Cache-Control', 'no-store')
    return generateUnavailableHtml('notfound', resolveRedirectLocale(event))
  }
})
