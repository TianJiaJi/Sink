import { z } from 'zod'

defineRouteMeta({
  openAPI: {
    description: 'Batch operation on multiple links (delete/disable/enable/addTags)',
    security: [{ bearerAuth: [] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['action', 'slugs'],
            properties: {
              action: { type: 'string', enum: ['delete', 'disable', 'enable', 'addTags'] },
              slugs: { type: 'array', items: { type: 'string' }, maxItems: 100 },
              tags: { type: 'array', items: { type: 'string' }, description: 'Required when action=addTags (merged with existing tags)' },
            },
          },
        },
      },
    },
  },
})

const BatchSchema = z.object({
  action: z.enum(['delete', 'disable', 'enable', 'addTags']),
  slugs: z.array(z.string().trim().min(1).max(2048)).min(1).max(100),
  tags: z.array(z.string().trim().min(1).max(32)).max(10).optional(),
})

export default eventHandler(async (event) => {
  const body = await readValidatedBody(event, BatchSchema.parse)

  if (body.action === 'addTags' && !body.tags?.length) {
    throw createError({ status: 400, statusText: 'tags required for addTags action' })
  }

  const results: Array<{ slug: string, ok: boolean, error?: string }> = []

  for (const rawSlug of body.slugs) {
    const slug = normalizeSlug(event, rawSlug)
    try {
      if (body.action === 'delete') {
        await deleteLink(event, slug)
      }
      else {
        // disable / enable / addTags all need the existing link first
        const existing = await getAnyAuthoritativeLink(event, slug)
        if (!existing)
          throw new Error('Link not found')

        if (body.action === 'disable' || body.action === 'enable') {
          const disabled = body.action === 'disable'
          if (existing.disabled === disabled) {
            // already in desired state, skip the write
          }
          else {
            await updateLink(event, { ...existing, disabled }, { id: existing.id, updatedAt: existing.updatedAt })
          }
        }
        else if (body.action === 'addTags') {
          // union (mergeEditableLink would overwrite tags — do it manually)
          const existingTags = existing.tags ?? []
          const merged = [...new Set([...existingTags, ...(body.tags ?? [])])]
          if (merged.length !== existingTags.length) {
            await updateLink(event, { ...existing, tags: merged }, { id: existing.id, updatedAt: existing.updatedAt })
          }
        }
      }

      results.push({ slug, ok: true })
    }
    catch (error) {
      results.push({ slug, ok: false, error: error instanceof Error ? error.message : String(error) })
    }
  }

  return { results }
})
