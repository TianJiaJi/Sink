/// <reference path="../../worker-configuration.d.ts" />

import type { Link } from '#shared/schemas/link'
import { createBackupJsonStream, getSerializedLinkByteLength } from './backup-json-stream'
import { iterateAllAuthoritativeLinks } from './link-store'

export interface BackupData {
  version: string
  exportedAt: string
  count: number
  links: Link[]
}

export async function backupLinksToR2(env: Cloudflare.Env, isManual: boolean = false): Promise<void> {
  if (!env.R2) {
    console.info('[backup] R2 binding not configured, skipping backup')
    return
  }

  const caseSensitive = useRuntimeConfig().caseSensitive
  let count = 0
  let linksByteLength = 0
  for await (const link of iterateAllAuthoritativeLinks(env, caseSensitive)) {
    count++
    linksByteLength += getSerializedLinkByteLength(link)
  }

  const now = new Date()
  const backupMetadata = {
    version: '1.0',
    exportedAt: now.toISOString(),
    count,
    linksByteLength,
  }

  const timestamp = now.toISOString().replace(/:/g, '-')
  const prefix = isManual ? 'manual-links-' : 'links-'
  const filename = `backups/${prefix}${timestamp}.json`

  const stream = createBackupJsonStream(iterateAllAuthoritativeLinks(env, caseSensitive), backupMetadata)
  await env.R2.put(filename, stream, {
    httpMetadata: {
      contentType: 'application/json',
    },
    customMetadata: {
      count: String(count),
      exportedAt: backupMetadata.exportedAt,
    },
  })

  console.info(`[backup] Backup completed: ${filename}, ${count} links`)
}
