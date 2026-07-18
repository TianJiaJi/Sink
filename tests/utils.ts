import type { Link } from '../shared/schemas/link'
import { env, exports } from 'cloudflare:workers'
import { expect } from 'vitest'
import { LINK_PASSWORD_HASH_PREFIX, LINK_PASSWORD_MASK_PREFIX } from '../shared/utils/link-password'

export function fetchWithAuth(path: string, options?: RequestInit): Promise<Response> {
  const request = new Request(`http://localhost${path}`, {
    ...options,
    headers: {
      ...options?.headers,
      Authorization: `Bearer ${import.meta.env.NUXT_SITE_TOKEN}`,
    },
  })
  return exports.default.fetch(request)
}

export function fetch(path: string, options?: RequestInit): Promise<Response> {
  return exports.default.fetch(new Request(`http://localhost${path}`, options))
}

export function postJson(path: string, body: unknown, withAuth = true): Promise<Response> {
  const fn = withAuth ? fetchWithAuth : fetch
  return fn(path, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

export function putJson(path: string, body: unknown, withAuth = true): Promise<Response> {
  const fn = withAuth ? fetchWithAuth : fetch
  return fn(path, {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function getStoredLink(slug: string) {
  return await env.KV.get<Link>(`link:${slug}`, { type: 'json' })
}

export async function getD1Link(slug: string) {
  return await env.DB.prepare('SELECT * FROM links WHERE slug = ?').bind(slug).first<Record<string, unknown>>()
}

export async function deleteStoredLink(slug: string) {
  await Promise.all([
    env.KV.delete(`link:${slug}`),
    env.DB.prepare('DELETE FROM links WHERE slug = ?').bind(slug).run(),
    env.DB.prepare('DELETE FROM link_tombstones WHERE slug = ?').bind(slug).run(),
  ])
}

export async function deleteStoredLinks(slugs: string[]) {
  await Promise.all(slugs.map(slug => deleteStoredLink(slug)))
}

export async function clearLinkMigrationState() {
  await env.DB.prepare('DELETE FROM link_migration_runs').run()
}

export async function setLinkStoreD1Mode() {
  await clearLinkMigrationState()
  const now = Math.floor(Date.now() / 1000)
  await env.DB.prepare(`
    INSERT INTO link_migration_runs
      (id, expected_cursor, scanned, inserted, skipped, expired, force, status, created_at, updated_at)
    VALUES (?, NULL, 0, 0, 0, 0, 0, 'completed', ?, ?)
  `).bind(`test-completed-${crypto.randomUUID()}`, now, now).run()
}

export function expectMaskedPassword(password: string | undefined, plainText: string) {
  expect(password).toBeDefined()
  expect(password?.startsWith(LINK_PASSWORD_MASK_PREFIX), password).toBe(true)
  expect(password).toContain(plainText.slice(-3))
  expect(password).not.toBe(plainText)
  expect(password?.startsWith(LINK_PASSWORD_HASH_PREFIX)).toBe(false)
}

export async function expectStoredHashedPassword(slug: string, plainText: string) {
  const storedLink = await getStoredLink(slug)
  expect(storedLink?.password?.startsWith(LINK_PASSWORD_HASH_PREFIX), storedLink?.password).toBe(true)
  expect(storedLink?.password).not.toBe(plainText)
}

// 1x1 transparent PNG for testing
export const TEST_PNG_BYTES = new Uint8Array([
  0x89,
  0x50,
  0x4E,
  0x47,
  0x0D,
  0x0A,
  0x1A,
  0x0A,
  0x00,
  0x00,
  0x00,
  0x0D,
  0x49,
  0x48,
  0x44,
  0x52,
  0x00,
  0x00,
  0x00,
  0x01,
  0x00,
  0x00,
  0x00,
  0x01,
  0x08,
  0x06,
  0x00,
  0x00,
  0x00,
  0x1F,
  0x15,
  0xC4,
  0x89,
  0x00,
  0x00,
  0x00,
  0x0A,
  0x49,
  0x44,
  0x41,
  0x54,
  0x78,
  0x9C,
  0x63,
  0x00,
  0x01,
  0x00,
  0x00,
  0x05,
  0x00,
  0x01,
  0x0D,
  0x0A,
  0x2D,
  0xB4,
  0x00,
  0x00,
  0x00,
  0x00,
  0x49,
  0x45,
  0x4E,
  0x44,
  0xAE,
  0x42,
  0x60,
  0x82,
])
