import { afterEach, describe, expect, it, vi } from 'vitest'

async function loadContracts(maxUrlLength: unknown = '16384') {
  vi.resetModules()
  vi.stubGlobal('useAppConfig', () => ({ slugRegex: /^[a-z0-9]+(?:-[a-z0-9]+)*$/i, reserveSlug: ['dashboard'] }))
  vi.stubGlobal('useRuntimeConfig', () => ({ public: { slugDefaultLength: '6', maxUrlLength } }))
  return await import('../../shared/schemas/link')
}

function target(length: number) {
  const prefix = 'https://example.com/'
  return prefix + 'a'.repeat(length - prefix.length)
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('configurable link URL contracts', () => {
  it.each(['256', '16384', '24000'])('accepts the supported limit %s', async (limit) => {
    const { MAX_URL_LENGTH, UrlSchema } = await loadContracts(limit)
    expect(MAX_URL_LENGTH).toBe(Number(limit))
    expect(UrlSchema.safeParse(target(MAX_URL_LENGTH)).success).toBe(true)
    expect(UrlSchema.safeParse(target(MAX_URL_LENGTH + 1)).success).toBe(false)
  })

  it.each([undefined, null, '', 'invalid', '255', '24001', '16384.5', 'Infinity', 'NaN'])('rejects invalid configuration %s', async (limit) => {
    // Pass undefined through explicitly instead of using the helper's default.
    vi.resetModules()
    vi.stubGlobal('useAppConfig', () => ({ slugRegex: /^[a-z0-9-]+$/i, reserveSlug: ['dashboard'] }))
    vi.stubGlobal('useRuntimeConfig', () => ({ public: { slugDefaultLength: '6', maxUrlLength: limit } }))
    await expect(import('../../shared/schemas/link')).rejects.toThrow('NUXT_PUBLIC_MAX_URL_LENGTH must be an integer between 256 and 24000')
  })

  it('applies the write limit to every custom URL field', async () => {
    const { CreateLinkSchema, EditLinkSchema, ImportLinkSchema } = await loadContracts('256')
    const base = { slug: 'custom-url', url: target(256) }
    for (const schema of [CreateLinkSchema, EditLinkSchema, ImportLinkSchema]) {
      expect(schema.safeParse({ ...base, apple: target(256), google: target(256), geo: { US: target(256) }, ab: [{ url: target(256), weight: 1 }] }).success).toBe(true)
      for (const extra of [
        { apple: target(257) },
        { google: target(257) },
        { geo: { US: target(257) } },
        { ab: [{ url: target(257), weight: 1 }] },
      ]) expect(schema.safeParse({ ...base, ...extra }).success).toBe(false)
    }
  })

  it('applies the configured bound and HTTP-only rule to link-check targets', async () => {
    await loadContracts('256')
    const { LinkCheckTargetSchema } = await import('../../shared/schemas/link-check')
    expect(LinkCheckTargetSchema.safeParse({ slug: 'target', url: target(256) }).success).toBe(true)
    expect(LinkCheckTargetSchema.safeParse({ slug: 'target', url: target(257) }).success).toBe(false)
    expect(LinkCheckTargetSchema.safeParse({ slug: 'target', url: 'ftp://example.com/file' }).success).toBe(false)
  })

  it('keeps stored and legacy URLs readable after lowering the write limit', async () => {
    const { CreateLinkSchema, StoredLinkSchema, parseLegacyKvLink } = await loadContracts('256')
    const link = {
      id: 'old-record',
      slug: 'dashboard',
      url: target(9_000),
      apple: target(9_000),
      google: target(9_000),
      geo: { US: target(9_000) },
      ab: [{ url: target(9_000), weight: 1 }],
      createdAt: 1,
      updatedAt: 1,
      turnstile: true,
      maxClicks: 10,
    }
    expect(CreateLinkSchema.safeParse({ ...link, slug: 'new-record' }).success).toBe(false)
    expect(StoredLinkSchema.parse(link)).toMatchObject(link)
    expect(parseLegacyKvLink({ ...link, id: undefined, createdAt: undefined, updatedAt: undefined }, link.slug).success).toBe(true)
    expect(StoredLinkSchema.safeParse({ ...link, url: target(24_001) }).success).toBe(false)
  })
})
