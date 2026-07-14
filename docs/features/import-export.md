---
title: Import and Export
description: Move Sink links with cursor-paginated JSON while preserving expired records, metadata, and portable password hashes.
---

# Import and Export

Sink's authenticated JSON import and export APIs move link records between compatible instances. They are separate from [KV-to-D1 migration](/storage/kv-to-d1) and [R2 snapshots](./backups).

## Export

Export reads authoritative D1 links, including expired records, in cursor-paginated JSON pages. Continue with the returned cursor until `list_complete` is true. The page size is controlled by the batch setting in [configuration](/configuration/#build-runtime-public-overrides).

The portable record includes link identity, timestamps, expiration, routing, tags, OpenGraph fields, safety and cloaking flags, and a protected password representation. It does not expose plaintext passwords.

## Import

Import accepts at most half the configured export page size per request. The complete request is schema-validated before item processing, then each item reports success, skip, or failure.

Important behavior:

- Expired records are allowed and retained.
- Active slug conflicts are skipped rather than overwritten.
- Slugs are normalized according to the destination instance's custom-slug case setting.
- Portable password hashes from Sink exports can be imported without knowing the plaintext password.
- Dashboard-masked password placeholders are not valid plaintext passwords.
- Successful writes go to authoritative D1 and then update KV as a best-effort cache.

Import is not a full database restore: it does not recreate schema, tombstones, migration runs, or the KV migration marker.
