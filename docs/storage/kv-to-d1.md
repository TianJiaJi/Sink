---
title: KV-to-D1 Migration
description: Move links from an existing legacy KV-only Sink instance to D1.
---

# KV-to-D1 Migration

::: warning Legacy deployments only
This page applies only to existing Sink instances from older releases that stored links in KV. Do not use this process for a new deployment.
:::

## Before you begin

- Keep the original KV namespace and its data in Cloudflare.
- Make sure the upgraded deployment uses the original KV namespace as `KV` and a D1 database as `DB`.
- Avoid changing links until migration and verification are complete.

## Migrate links

1. Preserve or export the original KV data using Cloudflare's tools.
2. [Upgrade Sink](/deployment/upgrading) and deploy the updated `master` branch. Deployment prepares D1 automatically.
3. Sign in and open **Dashboard → Links**. This automatically starts or continues the migration.
4. Open **Dashboard → Migrate → D1** to view status and progress.
5. When migration completes, verify several links and their redirects before resuming normal changes.

The D1 panel shows migration status and supports recovery. It is not the normal migration start button; opening **Links** starts or continues the standard process.

## Record handling

During migration, Sink:

- skips expired links;
- does not overwrite links that already exist in D1;
- does not restore links already recorded as deleted;
- keeps successfully migrated links when another record fails.

## Recover from a failure

The migration can be retried safely. Fix or remove the reported invalid record in the original KV data, then return to **Dashboard → Links** and retry. Existing D1 links are not overwritten.

Use **Dashboard → Migrate → D1** to review the result. Its force rescan action is for controlled recovery or verification after the normal migration has run. A force rescan still does not overwrite existing or deleted D1 links.
