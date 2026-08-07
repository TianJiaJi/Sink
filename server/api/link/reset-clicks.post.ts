import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { z } from 'zod'
import { SlugSchema } from '#shared/schemas/link'
import { links } from '../../database/schema'

defineRouteMeta({
  openAPI: {
    description: 'Reset the visit counter of a short link',
    security: [{ bearerAuth: [] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['slug'],
            properties: {
              slug: { type: 'string', description: 'The slug of the link whose visit counter to reset' },
            },
          },
        },
      },
    },
  },
})

const ResetSchema = z.object({
  slug: SlugSchema.min(1),
})

export default eventHandler(async (event) => {
  const { previewMode } = useRuntimeConfig(event).public
  if (previewMode) {
    throw createError({
      status: 403,
      statusText: 'Preview mode cannot reset links.',
    })
  }

  const body = await readValidatedBody(event, ResetSchema.parse)
  const slug = normalizeSlug(event, body.slug)
  const db = drizzle(event.context.cloudflare.env.DB)
  await db.update(links).set({ clickCount: 0 }).where(eq(links.slug, slug))
  await writeAuditLog(event, { action: 'reset-clicks', linkSlug: slug })
})
