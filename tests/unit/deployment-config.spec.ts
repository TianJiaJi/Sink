import { parse } from 'jsonc-parser'
import { describe, expect, it } from 'vitest'
import source from '../../wrangler.jsonc?raw'

const config = parse(source)

describe('production deployment configuration', () => {
  it('does not recreate the AI binding removed from production', () => {
    expect(config.ai).toBeUndefined()
  })

  it('preserves dashboard variables and does not embed their values', () => {
    expect(config.keep_vars).toBe(true)
    expect(config.vars).toBeUndefined()
  })

  it('preserves the production custom domain and preview settings', () => {
    expect(config.routes).toContainEqual({
      pattern: 'url.846605.xyz',
      custom_domain: true,
      enabled: true,
      previews_enabled: false,
    })
    expect(config.workers_dev).toBe(true)
    expect(config.preview_urls).toBe(true)
  })

  it('retains the existing storage bindings', () => {
    expect(config.d1_databases).toContainEqual(expect.objectContaining({
      binding: 'DB',
      database_id: 'ff749bff-176d-4d30-8538-ce2876d29b2e',
    }))
    expect(config.kv_namespaces).toContainEqual(expect.objectContaining({
      binding: 'KV',
      id: '02d33274b2534e8fb7468feb5ad335f5',
    }))
    expect(config.r2_buckets).toContainEqual(expect.objectContaining({ binding: 'R2', bucket_name: 'sink' }))
  })
})
