---
title: Deploy on Cloudflare Workers
description: Deploy Sink on Cloudflare Workers through Git integration.
---

# Deploy on Cloudflare Workers

## 1. Fork Sink and prepare resources

Create a [fork of the Sink repository](https://github.com/miantiao-me/Sink/fork), then prepare these Cloudflare resources:

| Binding     | Status      | Purpose                                         |
| ----------- | ----------- | ----------------------------------------------- |
| `DB` (D1)   | Required    | Stores links and related data.                  |
| `KV`        | Required    | Speeds up link redirects.                       |
| `ANALYTICS` | Recommended | Records visits for analytics and logs.          |
| `R2`        | Optional    | Recommended for backups and OpenGraph images.   |
| `AI`        | Optional    | Recommended for AI-assisted slugs and metadata. |

For the complete Sink experience, enable all five resources.

## 2. Connect Workers Builds

In the Cloudflare dashboard, create a Worker with Git integration and connect your fork. Use these settings:

- **Production branch:** `master`
- **Build command:** `pnpm build`
- **Deploy command:** `pnpm deploy:worker`

Add these build variables:

| Variable                 | When to set                                |
| ------------------------ | ------------------------------------------ |
| `DEPLOY_D1_DATABASE_ID`  | Required. Use the ID of your D1 database.  |
| `DEPLOY_KV_NAMESPACE_ID` | Required. Use the ID of your KV namespace. |
| `DEPLOY_R2_BUCKET_NAME`  | Set when using R2. Use your bucket name.   |

Workers Builds uses the deployment token generated automatically by Cloudflare when you connect the repository. No additional credentials are needed.

## 3. Configure application settings

Under **Settings → Variables and Secrets**, set a stable, strong `NUXT_SITE_TOKEN` as an encrypted runtime secret. Add any public or optional settings described in the [configuration reference](/configuration/).

For dashboard analytics queries, configure `NUXT_CF_ACCOUNT_ID`, encrypted `NUXT_CF_API_TOKEN`, and `NUXT_DATASET` as described in [recommended configuration](/configuration/#recommended-configuration).

Confirm that the enabled resources use the binding names `DB`, `KV`, `ANALYTICS`, `R2`, and `AI`.

## 4. Deploy

Start the Workers build and wait for Sink to be published.

After the first deployment, open `/dashboard`, sign in, and create a link. For later releases, follow [Upgrading Sink](./upgrading).
