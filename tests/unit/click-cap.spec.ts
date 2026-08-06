import type { H3Event } from 'h3'
import type { Link } from '../../shared/schemas/link'
import { env } from 'cloudflare:workers'
import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { links } from '../../server/database/schema'
import { incrementClickCount } from '../../server/utils/click-cap'
import { db, deleteStoredLinks, postJson, setLinkStoreD1Mode } from '../utils'

function makeEvent(): H3Event {
  return { context: { cloudflare: { env } } } as unknown as H3Event
}

async function getClickCount(slug: string): Promise<number> {
  const [row] = await db.select({ count: links.clickCount }).from(links).where(eq(links.slug, slug)).limit(1)
  return row?.count ?? -1
}

describe('incrementClickCount', { concurrent: false }, () => {
  const slug = `cap-${crypto.randomUUID().slice(0, 8)}`
  const maxClicks = 3

  beforeEach(async () => {
    await setLinkStoreD1Mode()
    const now = Math.floor(Date.now() / 1000)
    const link: Link = {
      id: crypto.randomUUID().slice(0, 10),
      slug,
      url: `https://cap.example/${slug}`,
      createdAt: now,
      updatedAt: now,
      tags: [],
      maxClicks,
    }
    expect((await postJson('/api/link/create', link)).status).toBe(201)
  })

  afterEach(async () => {
    await deleteStoredLinks([slug])
  })

  it('counts visits under the cap, then blocks once the cap is reached', async () => {
    const event = makeEvent()
    expect(await incrementClickCount(event, slug, maxClicks)).toBe(true)
    expect(await getClickCount(slug)).toBe(1)
    expect(await incrementClickCount(event, slug, maxClicks)).toBe(true)
    expect(await getClickCount(slug)).toBe(2)
    expect(await incrementClickCount(event, slug, maxClicks)).toBe(true)
    expect(await getClickCount(slug)).toBe(3)
    // 4th visit: cap reached, not counted
    expect(await incrementClickCount(event, slug, maxClicks)).toBe(false)
    expect(await getClickCount(slug)).toBe(3)
  })
})
