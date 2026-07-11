import type { LinkMigrationStatus } from '#shared/schemas/link-migration'

defineRouteMeta({
  openAPI: {
    description: 'Get KV to D1 link migration status',
    security: [{ bearerAuth: [] }],
  },
})

export default eventHandler(async (event): Promise<LinkMigrationStatus> => {
  const marker = await getMigrationMarker(event)
  return {
    completed: marker !== null,
    marker,
  }
})
