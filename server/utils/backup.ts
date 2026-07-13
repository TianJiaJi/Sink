/// <reference path="../../worker-configuration.d.ts" />

import type { Link } from '#shared/schemas/link'
import { listAllAuthoritativeLinks } from './link-store'

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

  const allLinks = await listAllAuthoritativeLinks(env, useRuntimeConfig().caseSensitive)

  const now = new Date()
  const backupData: BackupData = {
    version: '1.0',
    exportedAt: now.toISOString(),
    count: allLinks.length,
    links: allLinks,
  }

  const timestamp = now.toISOString().replace(/:/g, '-')
  const prefix = isManual ? 'manual-links-' : 'links-'
  const filename = `backups/${prefix}${timestamp}.json`

  await env.R2.put(filename, JSON.stringify(backupData, null, 2), {
    httpMetadata: {
      contentType: 'application/json',
    },
    customMetadata: {
      count: String(allLinks.length),
      exportedAt: backupData.exportedAt,
    },
  })

  console.info(`[backup] Backup completed: ${filename}, ${allLinks.length} links`)
}
