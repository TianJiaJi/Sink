import type { LinkCheckConfig, LinkCheckResponse, LinkCheckResult, LinkCheckTarget, LinkListResponse } from '@/types'
import { ref } from 'vue'
import { toErrorMessage } from '#shared/utils/error'
import { useAPI } from '@/utils/api'

type LinkCheckRunResult = 'completed' | 'empty' | 'stopped'
type LinkCheckListResponse = Omit<LinkListResponse, 'cursor'> & { cursor?: string }
interface LinkCountResponse {
  count: number
}

export function useLinkCheck() {
  const links = ref<LinkCheckTarget[]>([])
  const totalCount = ref(0)
  const results = ref<LinkCheckResult[]>([])
  const loadingLinks = ref(false)
  const checking = ref(false)
  const stopRequested = ref(false)
  const wasStopped = ref(false)

  async function loadLinks() {
    loadingLinks.value = true
    totalCount.value = 0
    let listSettled = false
    void useAPI<LinkCountResponse>('/api/link/count', {
      query: { status: 'all' },
    }).then(({ count }) => {
      if (!listSettled)
        totalCount.value = count
    }).catch(() => undefined)

    const firstPagePromise = useAPI<LinkCheckListResponse>('/api/link/list', {
      query: {
        limit: 1000,
        status: 'all',
        sort: 'newest',
      },
    })

    try {
      const loadedLinks: LinkCheckTarget[] = []
      let response = await firstPagePromise

      while (true) {
        loadedLinks.push(...response.links.map(({ slug, url }) => ({ slug, url })))

        if (response.list_complete)
          break
        if (!response.cursor)
          throw new Error('Incomplete link list response is missing a cursor')

        response = await useAPI<LinkCheckListResponse>('/api/link/list', {
          query: {
            limit: 1000,
            status: 'all',
            sort: 'newest',
            cursor: response.cursor,
          },
        })
      }

      listSettled = true
      links.value = loadedLinks
      totalCount.value = loadedLinks.length
      results.value = []
      wasStopped.value = false
    }
    finally {
      listSettled = true
      loadingLinks.value = false
    }
  }

  function buildFailedResults(batch: LinkCheckTarget[], error: unknown): LinkCheckResult[] {
    const checkedAt = new Date().toISOString()
    const message = toErrorMessage(error)

    return batch.map(link => ({
      ...link,
      status: 0,
      ok: false,
      duration: 0,
      checkedAt,
      error: message,
    }))
  }

  async function startCheck(config: LinkCheckConfig): Promise<LinkCheckRunResult> {
    if (checking.value)
      return 'empty'

    if (!links.value.length)
      await loadLinks()

    if (!links.value.length)
      return 'empty'

    checking.value = true
    stopRequested.value = false
    wasStopped.value = false
    results.value = []

    try {
      for (let index = 0; index < links.value.length; index += config.batchSize) {
        if (stopRequested.value)
          break

        const batch = links.value.slice(index, index + config.batchSize)
        try {
          const response = await useAPI<LinkCheckResponse>('/api/link/check', {
            method: 'POST',
            body: {
              links: batch,
              timeout: config.timeout,
            },
          })
          results.value.push(...response.results)
        }
        catch (error) {
          console.error(error)
          results.value.push(...buildFailedResults(batch, error))
        }
      }

      wasStopped.value = stopRequested.value
      return wasStopped.value ? 'stopped' : 'completed'
    }
    finally {
      checking.value = false
      stopRequested.value = false
    }
  }

  function stopCheck() {
    stopRequested.value = true
  }

  function clearResults() {
    results.value = []
    wasStopped.value = false
  }

  return {
    links,
    totalCount,
    results,
    loadingLinks,
    checking,
    wasStopped,
    loadLinks,
    startCheck,
    stopCheck,
    clearResults,
  }
}
