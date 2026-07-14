---
title: Link Backups
description: Create R2 JSON snapshots of authoritative D1 links and understand their contents, scheduling, and recovery limits.
---

# Link Backups

Sink backups are logical JSON snapshots of **authoritative D1 links** written to the `R2` binding. They are not full D1 database backups and are not KV compatibility backups.

## Requirements and operation

The KV-to-D1 migration marker must exist before any snapshot runs. The authenticated backup API returns `423` while the marker is missing. Manual snapshots use that API. Automatic snapshots require a scheduled Worker and can be disabled through [configuration](/configuration/#advanced-defaults).

The repository's Workers cron runs daily at **00:00 UTC**. Cloudflare Pages can create manual snapshots, but this repository does not provide a Pages scheduled trigger and does not promise automatic cron execution there.

Automatic objects use `backups/links-<timestamp>.json`; manual objects use `backups/manual-links-<timestamp>.json`.

## Snapshot contents

Snapshots include all authoritative D1 link records, including expired links and password credential material. Passwords set through current create and edit flows are protected before storage. However, KV-to-D1 migration preserves each legacy password value exactly as stored, so an older migrated record may contain plaintext.

Treat every R2 snapshot as sensitive data and strictly limit bucket and object access.

They do not include:

- D1 schema or migrations
- Link tombstones
- KV-to-D1 migration run records or cursors
- The migration marker stored in KV
- Analytics Engine data or other database state

## Recovery limits

Sink does not implement retention cleanup, snapshot rotation, or one-click exact restore. Manage R2 lifecycle and access policies yourself. A snapshot can supply link records to the normal import flow, subject to import validation and conflict handling, but that does not reproduce the original database exactly.

For database-level recovery, Cloudflare D1 also provides [Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/). It is a separate Cloudflare capability with its own retention and restore semantics.
