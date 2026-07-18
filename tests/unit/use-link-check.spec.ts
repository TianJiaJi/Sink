import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useLinkCheck } from '../../app/composables/useLinkCheck'

const { useAPIMock } = vi.hoisted(() => ({
  useAPIMock: vi.fn(),
}))

vi.mock('@/utils/api', () => ({ useAPI: useAPIMock }))
vi.mock('#shared/utils/error', async () => import('../../shared/utils/error'))

function createDeferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

describe('useLinkCheck', () => {
  beforeEach(() => {
    useAPIMock.mockReset()
  })

  it('starts count and the first list page concurrently and calibrates the final total', async () => {
    const countRequest = createDeferred<{ count: number }>()
    const listRequest = createDeferred<{
      links: { slug: string, url: string, comment?: string }[]
      list_complete: boolean
    }>()
    useAPIMock.mockImplementation((api: string) => {
      if (api === '/api/link/count')
        return countRequest.promise
      if (api === '/api/link/list')
        return listRequest.promise
      throw new Error(`Unexpected API request: ${api}`)
    })
    const linkCheck = useLinkCheck()

    const loading = linkCheck.loadLinks()

    expect(useAPIMock).toHaveBeenCalledTimes(2)
    expect(useAPIMock).toHaveBeenCalledWith('/api/link/count', {
      query: { status: 'all' },
    })
    expect(useAPIMock).toHaveBeenCalledWith('/api/link/list', {
      query: {
        limit: 1000,
        status: 'all',
        sort: 'newest',
      },
    })

    countRequest.resolve({ count: 10 })
    await vi.waitFor(() => expect(linkCheck.totalCount.value).toBe(10))

    listRequest.resolve({
      links: [
        { slug: 'first', url: 'https://example.com/first', comment: 'ignored' },
        { slug: 'second', url: 'https://example.com/second' },
      ],
      list_complete: true,
    })
    await loading

    expect(linkCheck.links.value).toEqual([
      { slug: 'first', url: 'https://example.com/first' },
      { slug: 'second', url: 'https://example.com/second' },
    ])
    expect(linkCheck.totalCount.value).toBe(2)
  })

  it('completes list loading when the count request fails', async () => {
    useAPIMock.mockImplementation((api: string) => {
      if (api === '/api/link/count')
        return Promise.reject(new Error('Count failed'))
      if (api === '/api/link/list') {
        return Promise.resolve({
          links: [{ slug: 'first', url: 'https://example.com/first' }],
          list_complete: true,
        })
      }
      throw new Error(`Unexpected API request: ${api}`)
    })
    const linkCheck = useLinkCheck()

    await linkCheck.loadLinks()

    expect(linkCheck.links.value).toHaveLength(1)
    expect(linkCheck.totalCount.value).toBe(1)
  })

  it('loads every page using the returned cursor and calibrates the total', async () => {
    useAPIMock.mockImplementation((api: string, options?: { query?: { cursor?: string } }) => {
      if (api === '/api/link/count')
        return Promise.resolve({ count: 20 })
      if (api !== '/api/link/list')
        throw new Error(`Unexpected API request: ${api}`)
      if (options?.query?.cursor === 'next-page') {
        return Promise.resolve({
          links: [
            { slug: 'second', url: 'https://example.com/second' },
            { slug: 'third', url: 'https://example.com/third' },
          ],
          list_complete: true,
        })
      }
      return Promise.resolve({
        links: [{ slug: 'first', url: 'https://example.com/first' }],
        cursor: 'next-page',
        list_complete: false,
      })
    })
    const linkCheck = useLinkCheck()

    await linkCheck.loadLinks()

    expect(useAPIMock).toHaveBeenCalledWith('/api/link/list', {
      query: {
        limit: 1000,
        status: 'all',
        sort: 'newest',
        cursor: 'next-page',
      },
    })
    expect(linkCheck.links.value).toHaveLength(3)
    expect(linkCheck.totalCount.value).toBe(3)
  })

  it('does not commit partial links when a later page fails', async () => {
    useAPIMock.mockImplementation((api: string) => {
      if (api === '/api/link/count')
        return Promise.resolve({ count: 1 })
      return Promise.resolve({
        links: [{ slug: 'existing', url: 'https://example.com/existing' }],
        list_complete: true,
      })
    })
    const linkCheck = useLinkCheck()
    await linkCheck.loadLinks()

    const requestError = new Error('Request failed')
    useAPIMock.mockImplementation((api: string, options?: { query?: { cursor?: string } }) => {
      if (api === '/api/link/count')
        return Promise.reject(new Error('Count failed'))
      if (options?.query?.cursor === 'next-page')
        return Promise.reject(requestError)
      return Promise.resolve({
        links: [{ slug: 'partial', url: 'https://example.com/partial' }],
        cursor: 'next-page',
        list_complete: false,
      })
    })

    await expect(linkCheck.loadLinks()).rejects.toBe(requestError)

    expect(linkCheck.links.value).toEqual([
      { slug: 'existing', url: 'https://example.com/existing' },
    ])
    expect(linkCheck.loadingLinks.value).toBe(false)
  })

  it('rejects an incomplete page without a cursor', async () => {
    useAPIMock.mockImplementation((api: string) => {
      if (api === '/api/link/count')
        return Promise.resolve({ count: 1 })
      return Promise.resolve({
        links: [{ slug: 'partial', url: 'https://example.com/partial' }],
        list_complete: false,
      })
    })
    const linkCheck = useLinkCheck()

    await expect(linkCheck.loadLinks()).rejects.toThrow('Incomplete link list response is missing a cursor')

    expect(linkCheck.links.value).toEqual([])
  })
})
