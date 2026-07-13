import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  isCloudflareAccessConfigured,
  isCloudflareAccessRequestSafe,
  verifyCloudflareAccessToken,
} from '../server/utils/cloudflare-access'
import { fetchWithAuth } from './utils'

const issuer = 'https://sink.cloudflareaccess.com'
const audience = 'sink-audience'
const keyId = 'sink-test-key'

let privateKey: CryptoKey
let localJwks: ReturnType<typeof createLocalJWKSet>

beforeAll(async () => {
  const keyPair = await generateKeyPair('RS256', { extractable: true })
  privateKey = keyPair.privateKey

  const publicJwk = await exportJWK(keyPair.publicKey)
  localJwks = createLocalJWKSet({
    keys: [{
      ...publicJwk,
      alg: 'RS256',
      kid: keyId,
      use: 'sig',
    }],
  })
})

interface TokenOptions {
  aud?: string
  exp?: number
  iss?: string
  key?: CryptoKey
  omitExp?: boolean
  payload?: Record<string, unknown>
}

async function createToken(options: TokenOptions = {}) {
  const now = Math.floor(Date.now() / 1000)
  let token = new SignJWT({
    type: 'app',
    sub: 'access-user-id',
    email: 'alice@example.com',
    ...options.payload,
  })
    .setProtectedHeader({ alg: 'RS256', kid: keyId })
    .setIssuer(options.iss || issuer)
    .setAudience(options.aud || audience)
    .setIssuedAt(now)
    .setNotBefore(now)

  if (!options.omitExp)
    token = token.setExpirationTime(options.exp ?? now + 300)

  return await token.sign(options.key || privateKey)
}

describe('cloudflare Access JWT validation', () => {
  it('accepts a valid token', async () => {
    const token = await createToken()
    await expect(verifyCloudflareAccessToken(token, { issuer, audience }, localJwks)).resolves.toEqual({
      userID: 'access-user-id',
      userEmail: 'alice@example.com',
    })
  })

  it.each([
    ['missing subject', { sub: undefined }],
    ['blank subject', { sub: '  ' }],
    ['non-string subject', { sub: 123 }],
    ['missing email', { email: undefined }],
    ['blank email', { email: '  ' }],
    ['non-string email', { email: 123 }],
    ['missing type', { type: undefined }],
    ['incorrect type', { type: 'service' }],
  ])('rejects a token with %s', async (_name, payload) => {
    const token = await createToken({ payload })
    await expect(verifyCloudflareAccessToken(token, { issuer, audience }, localJwks)).resolves.toBeNull()
  })

  it('rejects an invalid audience', async () => {
    const token = await createToken({ aud: 'other-audience' })
    await expect(verifyCloudflareAccessToken(token, { issuer, audience }, localJwks)).resolves.toBeNull()
  })

  it('rejects an invalid issuer', async () => {
    const token = await createToken({ iss: 'https://other.cloudflareaccess.com' })
    await expect(verifyCloudflareAccessToken(token, { issuer, audience }, localJwks)).resolves.toBeNull()
  })

  it('rejects an expired token', async () => {
    const token = await createToken({ exp: Math.floor(Date.now() / 1000) - 60 })
    await expect(verifyCloudflareAccessToken(token, { issuer, audience }, localJwks)).resolves.toBeNull()
  })

  it('rejects a token without an expiration claim', async () => {
    const token = await createToken({ omitExp: true })
    await expect(verifyCloudflareAccessToken(token, { issuer, audience }, localJwks)).resolves.toBeNull()
  })

  it('rejects a token with an invalid signature', async () => {
    const otherKeyPair = await generateKeyPair('RS256')
    const token = await createToken({ key: otherKeyPair.privateKey })
    await expect(verifyCloudflareAccessToken(token, { issuer, audience }, localJwks)).resolves.toBeNull()
  })

  it('fails closed when the key source is unavailable', async () => {
    const token = await createToken()
    const unavailableJwks = async () => {
      throw new Error('JWKS unavailable')
    }
    await expect(verifyCloudflareAccessToken(token, { issuer, audience }, unavailableJwks)).resolves.toBeNull()
  })
})

describe('cloudflare Access configuration', () => {
  it('requires both configuration values', () => {
    expect(isCloudflareAccessConfigured(issuer, audience)).toBe(true)
    expect(isCloudflareAccessConfigured('', audience)).toBe(false)
    expect(isCloudflareAccessConfigured(issuer, '')).toBe(false)
    expect(isCloudflareAccessConfigured(' ', ' ')).toBe(false)
  })
})

describe('cloudflare Access CSRF protection', () => {
  it('rejects cross-site browser requests', () => {
    expect(isCloudflareAccessRequestSafe({
      method: 'GET',
      requestOrigin: 'https://sink.example.com',
      secFetchSite: 'cross-site',
    })).toBe(false)
  })

  it('rejects unsafe requests from another origin', () => {
    expect(isCloudflareAccessRequestSafe({
      method: 'POST',
      origin: 'https://attacker.example.com',
      requestOrigin: 'https://sink.example.com',
      secFetchSite: 'same-site',
    })).toBe(false)
  })

  it('accepts same-origin unsafe requests and non-browser clients', () => {
    expect(isCloudflareAccessRequestSafe({
      method: 'POST',
      origin: 'https://sink.example.com',
      requestOrigin: 'https://sink.example.com',
      secFetchSite: 'same-origin',
    })).toBe(true)
    expect(isCloudflareAccessRequestSafe({
      method: 'POST',
      requestOrigin: 'https://sink.example.com',
    })).toBe(true)
  })

  it('rejects cookie-authenticated unsafe requests without an origin', () => {
    expect(isCloudflareAccessRequestSafe({
      method: 'POST',
      hasAccessCookie: true,
      requestOrigin: 'https://sink.example.com',
    })).toBe(false)
  })
})

describe('cloudflare Access request authentication', () => {
  it('does not apply Access CSRF restrictions to site-token writes', async () => {
    const response = await fetchWithAuth('/api/link/create', {
      method: 'POST',
      body: '{}',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'CF_Authorization=access-cookie',
        'Origin': 'https://attacker.example.com',
        'Sec-Fetch-Site': 'cross-site',
      },
    })

    expect([401, 403]).not.toContain(response.status)
  })
})
