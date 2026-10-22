import type { Link } from '#shared/schemas/link'
import { parsePath, withQuery } from 'ufo'
import { proxyLinkRequest } from '../services/link-proxy'
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
  const runtimeConfig = useRuntimeConfig(event)
  const { linkCacheTtl, caseSensitive, redirectWithQuery, redirectStatusCode, redirectNoStore } = runtimeConfig
  const { linkProxyEnabled } = runtimeConfig.public
  const homeURL = runtimeConfig.public.homeURL || runtimeConfig.homeURL
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
      if (evalCountryGate(link, country) === 'block') {
        return handleUnavailable(event, 'blocked', getLocale())
      }
      if (country && typeof country === 'string') {
        const countryCode = country.toUpperCase()
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

      // Reverse proxying is opt-in per link AND requires the instance flag
      // (NUXT_PUBLIC_LINK_PROXY_ENABLED). With the flag off, stored proxy links
      // keep their data and degrade to plain redirects.
      const isProxyLink = !!link.proxy && linkProxyEnabled

      // Header credentials come first so authenticated clients can stream
      // JSON/binary bodies straight through: x-link-password authenticates and
      // x-link-confirm: true carries the unsafe confirmation. Other POSTs are
      // read as gate form submissions — on a proxied link a confirmed form is
      // replayed upstream as a bodyless GET so the password never leaks.
      const headerPassword = getHeader(event, 'x-link-password')
      const headerConfirmed = getHeader(event, 'x-link-confirm') === 'true'
      let formConfirmed = false

      // Password protection check
      if (link.password) {
        if (headerPassword) {
          if (needTurnstile && !await verifyTurnstileToken(event, getHeader(event, 'x-turnstile-token'))) {
            throw createError({ status: 403, statusText: 'Turnstile verification required (set x-turnstile-token header)' })
          }
          if (!await verifyLinkPassword(headerPassword, link.password)) {
            throw createError({ status: 403, statusText: 'Incorrect password' })
          }
          if (link.unsafe && !headerConfirmed) {
            throw createError({ status: 403, statusText: 'Unsafe link: confirmation required (set x-link-confirm: true header)' })
          }
        }
        else if (event.method === 'POST') {
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
            return sendNoStoreHtml(generateUnsafeWarningHtml(slug, finalTargetUrl, { password: submittedPassword || undefined, locale: getLocale(), requireTurnstile: needTurnstile, sitekey }))
          }

          formConfirmed = true
        }
        else {
          // GET: render password page, with Turnstile widget when required
          return sendNoStoreHtml(generatePasswordHtml(slug, { locale: getLocale(), requireTurnstile: needTurnstile, sitekey }))
        }
      }
      else if (needTurnstile) {
        // No password, but a Turnstile gate is active (per-link toggle on this link)
        const headerToken = getHeader(event, 'x-turnstile-token')
        if (headerToken) {
          if (!await verifyTurnstileToken(event, headerToken)) {
            throw createError({ status: 403, statusText: 'Turnstile verification required' })
          }
        }
        else if (event.method === 'POST') {
          const body = await readBody(event)
          const token = typeof body?.['cf-turnstile-response'] === 'string' ? body['cf-turnstile-response'] : ''
          if (!await verifyTurnstileToken(event, token)) {
            return sendNoStoreHtml(generateTurnstileGateHtml(slug, sitekey, getLocale()))
          }
          // Never forward a consumed Turnstile form or its token to a proxy target.
          formConfirmed = true
        }
        else {
          return sendNoStoreHtml(generateTurnstileGateHtml(slug, sitekey, getLocale()))
        }
      }

      // A successful Turnstile gate already confirms a non-password visit.
      if (!link.password && link.unsafe && !needTurnstile && !headerConfirmed) {
        if (event.method === 'POST') {
          const body = await readBody(event)
          if (body?.confirm === 'true') {
            formConfirmed = true
          }
          else {
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
      catch (error) {
        console.error({ event: 'access_log.collection.failed', error: error instanceof Error ? error.message : String(error) })
      }

      if (accessLogResult) {
        try {
          writeAccessLog(event, accessLogResult.logs)
        }
        catch (error) {
          console.error({ event: 'access_log.write.failed', error: error instanceof Error ? error.message : String(error) })
        }

        try {
          queueLinkClickedWebhook(event, accessLogResult.click, link)
        }
        catch (error) {
          console.error({ event: 'webhook.scheduling.failed', error: error instanceof Error ? error.message : String(error) })
        }
      }

      // Click cap: count this valid visit (after all gates passed); block if the cap is reached
      if (!(await checkClickCap(event, link))) {
        return handleUnavailable(event, 'cap', getLocale())
      }

      // Burn-after-read: one-time links self-destruct after serving this visitor.
      // Fire-and-forget so the redirect still goes out even if the burn errors.
      if (link.burnAfterRead) {
        deleteLink(event, slug).catch(error => console.error({ event: 'burn.failed', error: error instanceof Error ? error.message : String(error) }))
      }

      if (deviceRedirectUrl) {
        if (redirectNoStore)
          setHeader(event, 'Cache-Control', 'no-store')
        return sendRedirect(event, finalTargetUrl, +redirectStatusCode)
      }
      // Link previews use the configured OG metadata even for proxied links.
      if (isSocialBot(userAgent) && hasOgConfig(link)) {
        const baseUrl = `${getRequestProtocol(event)}://${getRequestHost(event)}`
        const html = generateOgHtml(link, targetUrl, baseUrl)
        setHeader(event, 'Content-Type', 'text/html; charset=utf-8')
        return html
      }

      if (isProxyLink) {
        return sendWebResponse(event, await proxyLinkRequest(event, finalTargetUrl, {
          method: formConfirmed ? 'GET' : event.method,
          privateCache: redirectNoStore || !!(
            link.password || link.unsafe || needTurnstile || link.burnAfterRead || link.maxClicks
            || link.countryAllow?.length || link.countryBlock?.length || link.ab?.length
            || (link.geo && Object.keys(link.geo).length)
          ),
        }))
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
      setResponseStatus(event, 404)
      return generateUnavailableHtml('notfound', resolveRedirectLocale(event))
    }
  }
  else if (slug && !slug.includes('/') && !reserveSlug.includes(slug) && cloudflare && !/\.[a-z0-9]+$/i.test(slug)) {
    // Slug didn't match the allowed format (e.g. trailing symbol) and isn't a
    // static asset — treat it as a non-existent link and show the friendly 404
    // instead of falling through to Nuxt's default error page.
    if (notFoundRedirect) {
      return sendRedirect(event, notFoundRedirect, 302)
    }
    setHeader(event, 'Content-Type', 'text/html; charset=utf-8')
    setHeader(event, 'Cache-Control', 'no-store')
    setResponseStatus(event, 404)
    return generateUnavailableHtml('notfound', resolveRedirectLocale(event))
  }
})
