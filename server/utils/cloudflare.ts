import type { H3Event } from 'h3'
import type { Compilable } from 'kysely'

export function useWAE(event: H3Event, query: Compilable) {
  const compiledQuery = compileAnalyticsQuery(query)

  if (import.meta.dev)
    console.info('useWAE', compiledQuery)

  const { cfAccountId, cfApiToken } = useRuntimeConfig(event)
  return $fetch(`https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/analytics_engine/sql`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfApiToken}`,
    },
    body: compiledQuery,
    retry: 1,
    retryDelay: 100, // ms
  })
}
