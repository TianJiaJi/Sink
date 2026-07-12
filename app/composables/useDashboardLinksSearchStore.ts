import type { LinkUpdateType } from '@/types'
import type { DashboardLink, DashboardLinkSearchItem } from '@/types/dashboard-links'
import { readonly, ref, shallowRef } from 'vue'
import { defineStore } from '#imports'
import { useAPI } from '@/utils/api'

export const useDashboardLinksSearchStore = defineStore('dashboard-links-search', () => {
  const linksStore = useDashboardLinksStore()
  const links = ref<DashboardLinkSearchItem[]>([])
  const query = shallowRef('')
  const loading = shallowRef(false)
  const error = shallowRef<string | null>(null)
  let searchGeneration = 0

  function invalidateSearch(searchQuery = '') {
    searchGeneration++
    query.value = searchQuery.trim()
    links.value = []
    loading.value = false
    error.value = null
  }

  function isValidUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url)
      return Boolean(parsedUrl.protocol)
    }
    catch {
      return false
    }
  }

  function withoutUrlQuery(url: string): string | undefined {
    const trimmedUrl = url.trim()
    if (!trimmedUrl || !isValidUrl(trimmedUrl))
      return undefined

    const hashIndex = trimmedUrl.indexOf('#')
    const queryIndex = trimmedUrl.indexOf('?')
    if (queryIndex === -1 || (hashIndex !== -1 && hashIndex < queryIndex))
      return trimmedUrl

    return `${trimmedUrl.slice(0, queryIndex)}${hashIndex === -1 ? '' : trimmedUrl.slice(hashIndex)}`
  }

  async function searchLinks(searchQuery: string): Promise<DashboardLinkSearchItem[]> {
    const normalizedQuery = searchQuery.trim()
    const generation = ++searchGeneration
    query.value = normalizedQuery

    if (!normalizedQuery) {
      invalidateSearch()
      return []
    }

    loading.value = true
    error.value = null
    try {
      const data = await useAPI<DashboardLinkSearchItem[]>('/api/link/search', {
        query: {
          q: normalizedQuery,
          limit: 20,
          status: linksStore.status,
          tag: linksStore.tag,
        },
      })
      if (generation === searchGeneration)
        links.value = data
      return data
    }
    catch (cause) {
      if (generation === searchGeneration) {
        console.error(cause)
        links.value = []
        error.value = cause instanceof Error ? cause.message : String(cause)
      }
      return []
    }
    finally {
      if (generation === searchGeneration)
        loading.value = false
    }
  }

  function syncLink(link: DashboardLink, type: LinkUpdateType) {
    if (type === 'delete') {
      links.value = links.value.filter(item => item.slug !== link.slug)
      return
    }

    const nextLink: DashboardLinkSearchItem = {
      slug: link.slug,
      url: withoutUrlQuery(link.url) ?? link.url,
      comment: link.comment,
      expiration: link.expiration,
      tags: link.tags,
    }
    const normalizedQuery = query.value.toLocaleLowerCase()
    const isExpired = Boolean(nextLink.expiration && nextLink.expiration <= Math.floor(Date.now() / 1000))
    const matchesCurrentFilters = (linksStore.status === 'expired') === isExpired
      && (!linksStore.tag || nextLink.tags?.includes(linksStore.tag))
    const matchesCurrentQuery = matchesCurrentFilters && normalizedQuery
      && [nextLink.slug, nextLink.url, nextLink.comment, ...(nextLink.tags ?? [])]
        .some(value => value?.toLocaleLowerCase().includes(normalizedQuery))
    const index = links.value.findIndex(item => item.slug === link.slug)
    if (index === -1) {
      if (matchesCurrentQuery)
        links.value = [...links.value, nextLink].slice(0, 20)
      return
    }

    links.value = matchesCurrentQuery
      ? links.value.map(item => item.slug === link.slug ? nextLink : item)
      : links.value.filter(item => item.slug !== link.slug)
  }

  async function findDuplicateLink(url: string, currentSlug?: string): Promise<DashboardLinkSearchItem | undefined> {
    const targetUrl = withoutUrlQuery(url)
    if (!targetUrl)
      return undefined

    const matches = await useAPI<DashboardLinkSearchItem[]>('/api/link/search', {
      query: {
        url: targetUrl,
        limit: 20,
      },
    })
    return matches.find(link => link.slug !== currentSlug)
  }

  return {
    links,
    query,
    loading,
    error: readonly(error),
    invalidateSearch,
    searchLinks,
    syncLink,
    findDuplicateLink,
  }
})
