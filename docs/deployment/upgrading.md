---
title: Upgrading Sink
description: Upgrade Sink by syncing your GitHub fork and redeploying.
---

# Upgrading Sink

## Before upgrading

1. Review the upstream release notes.
2. Preserve your Cloudflare bindings, secrets, and environment settings.
3. If R2 is configured, consider creating a manual [link snapshot](/features/backups).

## Upgrade a D1 deployment

1. Use GitHub to sync your fork with the upstream `master` branch. Resolve any conflicts caused by your own changes.
2. Redeploy the updated `master` branch through Workers Builds or Pages.
3. Wait for the deployment to finish.

## Upgrade a legacy KV-only deployment

If the existing instance stored links only in KV, preserve the original KV data in Cloudflare and follow the separate [KV-to-D1 migration guide](/storage/kv-to-d1).

## Verify

- Open the dashboard and confirm that sign-in works.
- Create, open, edit, and delete a test link.
- Check analytics and other optional features that you have enabled.
