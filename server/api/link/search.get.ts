import { z } from 'zod'

defineRouteMeta({
  openAPI: {
    description: 'Search links by slug, URL, or comment',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'q',
        in: 'query',
        required: false,
        schema: { type: 'string' },
        description: 'Case-insensitive substring to match against slug, URL, or comment',
      },
      {
        name: 'url',
        in: 'query',
        required: false,
        schema: { type: 'string' },
        description: 'Normalized target URL to match exactly',
      },
      {
        name: 'limit',
        in: 'query',
        required: false,
        schema: { type: 'integer', minimum: 1, maximum: 1000, default: 20 },
        description: 'Maximum matches when search parameters are present',
      },
    ],
  },
})

const SearchQuerySchema = z.object({
  q: z.string().trim().refine(value => new TextEncoder().encode(value.replace(/[!%_]/g, '!$&')).length <= 48, {
    message: 'Search query must not exceed 48 UTF-8 bytes',
  }).optional(),
  url: z.string().trim().url().max(2048).optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional(),
})

export default eventHandler(async (event) => {
  const query = await getValidatedQuery(event, SearchQuerySchema.parse)
  const hasSearch = query.q !== undefined || query.url !== undefined
  return await searchLinks(event, {
    ...query,
    limit: hasSearch ? (query.limit ?? 20) : query.limit,
  })
})
