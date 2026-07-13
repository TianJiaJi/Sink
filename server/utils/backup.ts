/// <reference path="../../worker-configuration.d.ts" />

import type { Link } from '#shared/schemas/link'
import { readLinkMigrationMarker } from '../services/link-store/migration'
import { createBackupJsonStream, getSerializedLinkByteLength } from './backup-json-stream'
import { iterateAllAuthoritativeLinks } from './link-store'

export interface BackupData {
  version: string
  exportedAt: string
  count: number
  links: Link[]
}

export type BackupResult
  = | { completed: true, filename: string, count: number }
    | { completed: false, reason: 'migration-incomplete' | 'r2-not-configured' }

export async function backupLinksToR2(env: Cloudflare.Env, isManual: boolean = false): Promise<BackupResult> {
  if (!await readLinkMigrationMarker(env)) {
    console.info('[backup] Link migration is incomplete, skipping backup')
    return { completed: false, reason: 'migration-incomplete' }
  }

  if (!env.R2) {
    console.info('[backup] R2 binding not configured, skipping backup')
    return { completed: false, reason: 'r2-not-configured' }
  }

  let count = 0
  let linksByteLength = 0
  for await (const link of iterateAllAuthoritativeLinks(env)) {
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

  const stream = createBackupJsonStream(iterateAllAuthoritativeLinks(env), backupMetadata)
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
  return { completed: true, filename, count }
}
