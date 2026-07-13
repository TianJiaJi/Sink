import type { LinkCheckResponse } from '../../shared/types/link-check'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { deleteStoredLinks, postJson, setLinkStoreD1Mode } from '../utils'

const URL_NOT_ALLOWED = 'URL is not allowed for server-side checking'

beforeEach(async () => {
  await setLinkStoreD1Mode()
})

function uniqueSlug(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`
}

async function withStoredLinks<T>(urls: string[], run: (slugs: string[]) => Promise<T>): Promise<T> {
  const slugs: string[] = []

  try {
    for (const [index, url] of urls.entries()) {
      const slug = uniqueSlug(`link-check-${index}`)
      const response = await postJson('/api/link/create', { slug, url })
      expect(response.status).toBe(201)
      slugs.push(slug)
    }

    return await run(slugs)
  }
  finally {
    await deleteStoredLinks(slugs)
  }
}

async function expectRejectedStoredUrl(storedUrl: string, requestUrl = 'https://example.com'): Promise<void> {
  await withStoredLinks([storedUrl], async ([slug]) => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Unexpected outbound request'))

    try {
      const response = await postJson('/api/link/check', {
        links: [{ slug, url: requestUrl }],
      })

      expect(response.status).toBe(200)
      const { results } = await response.json() as LinkCheckResponse
      expect(results).toHaveLength(1)
      expect(fetchSpy).not.toHaveBeenCalled()
      expect(results[0]).toMatchObject({
        slug,
        url: storedUrl,
        status: 0,
        ok: false,
        error: URL_NOT_ALLOWED,
      })
    }
    finally {
      fetchSpy.mockRestore()
    }
  })
}

describe('/api/link/check', { concurrent: false }, () => {
  it('uses the authoritative stored URL instead of the request URL', async () => {
    await expectRejectedStoredUrl('http://localhost/authoritative', 'https://example.com/request-body')
  })

  it.each([
    ['localhost', 'http://localhost/resource'],
    ['IPv4 loopback', 'http://127.0.0.1/resource'],
    ['10/8 private IPv4', 'http://10.1.2.3/resource'],
    ['172.16/12 private IPv4', 'http://172.16.42.1/resource'],
    ['192.168/16 private IPv4', 'http://192.168.1.1/resource'],
    ['IPv6 loopback', 'http://[::1]/resource'],
    ['IPv6 unique local address', 'http://[fd12:3456:789a::1]/resource'],
    ['IPv6 link-local address', 'http://[fe80::1]/resource'],
    ['IPv6 link-local range', 'http://[fe90::1]/resource'],
    ['IPv6 multicast', 'http://[ff02::1]/resource'],
    ['IPv4-mapped IPv6 loopback', 'http://[::ffff:127.0.0.1]/resource'],
  ])('rejects a stored %s URL without making an outbound request', async (_name, url) => {
    await expectRejectedStoredUrl(url)
  })

  it('returns Link not found for a missing slug', async () => {
    const slug = uniqueSlug('link-check-missing')
    await deleteStoredLinks([slug])

    try {
      const response = await postJson('/api/link/check', {
        links: [{ slug, url: 'https://example.com' }],
      })

      expect(response.status).toBe(200)
      const { results } = await response.json() as LinkCheckResponse
      expect(results[0]).toMatchObject({
        slug,
        status: 0,
        ok: false,
        error: 'Link not found',
      })
    }
    finally {
      await deleteStoredLinks([slug])
    }
  })

  it('accepts at most 10 links and rejects 11 links', async () => {
    await withStoredLinks(Array.from({ length: 11 }, (_, index) => `http://localhost/resource/${index}`), async (slugs) => {
      const targets = slugs.map(slug => ({ slug, url: 'https://example.com' }))
      const maximumResponse = await postJson('/api/link/check', { links: targets.slice(0, 10) })
      expect(maximumResponse.status).toBe(200)
      expect((await maximumResponse.json() as LinkCheckResponse).results).toHaveLength(10)

      const overMaximumResponse = await postJson('/api/link/check', { links: targets })
      expect(overMaximumResponse.status).toBe(400)
    })
  })

  it('rejects an empty links array', async () => {
    const response = await postJson('/api/link/check', { links: [] })
    expect(response.status).toBe(400)
  })

  it.each([1, 30])('accepts the timeout boundary %i', async (timeout) => {
    await withStoredLinks(['http://localhost/resource'], async ([slug]) => {
      const response = await postJson('/api/link/check', {
        links: [{ slug, url: 'https://example.com' }],
        timeout,
      })

      expect(response.status).toBe(200)
      expect((await response.json() as LinkCheckResponse).results[0]).toMatchObject({
        slug,
        status: 0,
        ok: false,
        error: URL_NOT_ALLOWED,
      })
    })
  })

  it.each([0, 31])('rejects the timeout outside the boundary: %i', async (timeout) => {
    await withStoredLinks(['http://localhost/resource'], async ([slug]) => {
      const response = await postJson('/api/link/check', {
        links: [{ slug, url: 'https://example.com' }],
        timeout,
      })

      expect(response.status).toBe(400)
    })
  })
})
