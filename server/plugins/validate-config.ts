import { isHttpUrl } from '#shared/schemas/link-check'

/**
 * Startup validation of runtimeConfig URL fields. Runs once per cold start
 * (cloudflare-module: per isolate). Invalid values only warn — never throw —
 * so a misconfigured redirect URL doesn't take the whole Worker down; the bad
 * URL shows up in Workers Logs and the redirect silently no-ops at runtime.
 */
export default defineNitroPlugin(() => {
  const config = useRuntimeConfig()
  const fields = [
    { name: 'NUXT_HOME_URL', value: config.homeURL },
    { name: 'NUXT_NOT_FOUND_REDIRECT', value: config.notFoundRedirect },
    { name: 'NUXT_UNAVAILABLE_REDIRECT_URL', value: config.unavailableRedirectUrl },
  ]
  for (const field of fields) {
    if (field.value && !isHttpUrl(field.value)) {
      console.warn({ event: 'config.url.invalid', field: field.name, value: field.value })
    }
  }
})
