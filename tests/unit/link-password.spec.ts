import { describe, expect, it, vi } from 'vitest'
import { hashLinkPassword, normalizeLinkPasswordForStorage, verifyLinkPassword } from '../../server/utils/link-password'
import { LINK_PASSWORD_HASH_PREFIX, maskLinkPassword } from '../../shared/utils/link-password'

vi.mock('#shared/utils/link-password', async () => import('../../shared/utils/link-password'))

describe('link password hashing', () => {
  it('hashes and verifies the correct password', async () => {
    const hash = await hashLinkPassword('secret123')
    expect(hash.startsWith(LINK_PASSWORD_HASH_PREFIX)).toBe(true)
    expect(await verifyLinkPassword('secret123', hash)).toBe(true)
  })

  it('rejects the wrong password', async () => {
    const hash = await hashLinkPassword('secret123')
    expect(await verifyLinkPassword('wrong', hash)).toBe(false)
  })

  it('produces different hashes for the same password (random salt)', async () => {
    const a = await hashLinkPassword('secret123')
    const b = await hashLinkPassword('secret123')
    expect(a).not.toBe(b)
    expect(await verifyLinkPassword('secret123', a)).toBe(true)
    expect(await verifyLinkPassword('secret123', b)).toBe(true)
  })

  it('falls back to plaintext comparison when stored value is not a hash', async () => {
    expect(await verifyLinkPassword('plain', 'plain')).toBe(true)
    expect(await verifyLinkPassword('plain', 'other')).toBe(false)
  })
})

describe('normalizeLinkPasswordForStorage', () => {
  it('hashes plaintext', async () => {
    const result = await normalizeLinkPasswordForStorage('secret123')
    expect(result.startsWith(LINK_PASSWORD_HASH_PREFIX)).toBe(true)
  })

  it('is idempotent on already-hashed input', async () => {
    const hash = await hashLinkPassword('secret123')
    expect(await normalizeLinkPasswordForStorage(hash)).toBe(hash)
  })

  it('rejects masked input', async () => {
    const masked = maskLinkPassword('sink-pwd:v1:10000:aa:bb:cc')
    await expect(normalizeLinkPasswordForStorage(masked)).rejects.toThrow()
  })
})
