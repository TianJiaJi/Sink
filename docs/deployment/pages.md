---
title: Deploy Sink on Cloudflare Pages
description: Deploy Sink to Cloudflare Pages and configure D1, KV, R2, Analytics Engine, compatibility flags, and migrations.
---

# Deploy Sink on Cloudflare Pages

1. [Fork the repository](https://github.com/miantiao-me/Sink/fork).
2. Create a [Cloudflare Pages](https://developers.cloudflare.com/pages/) project from the fork and select the Nuxt.js preset.
3. Configure variables by phase:
   - **Build only:** `NUXT_API_CORS=true` when CORS is required.
   - **Build and runtime:** every `NUXT_PUBLIC_*` value.
   - **Runtime:** other mapped `NUXT_*` values, including `NUXT_SITE_TOKEN`, analytics credentials, Access, and webhook settings.

Use a strong `NUXT_SITE_TOKEN` with at least eight characters, and avoid predictable values such as digit-only tokens. The Analytics API token needs at least Account Analytics permission.

4. Save the project, start deployment, then cancel it before the first complete release.
5. Under **Settings** → **Bindings**, add:
   - **KV Namespace:** bind `KV` to a namespace.
   - **D1 Database:** create or select `sink`, bind it as `DB`, and copy the database ID.
   - **Workers AI** (optional): bind the catalog as `AI`.
   - **R2 Bucket:** bind an existing bucket as `R2`.
   - **Analytics Engine:** enable the product for the account, then bind `ANALYTICS` to the `sink` dataset.
6. From a Wrangler-authenticated local checkout, set deployment values in `.env` and apply the D1 schema:

```dotenv
DEPLOY_D1_DATABASE_ID=your-d1-database-id
DEPLOY_KV_NAMESPACE_ID=your-kv-namespace-id
```

```sh
pnpm db:migrate:remote
```

The migration command uses these values to generate `wrangler.deploy.jsonc`, even though Pages bindings are dashboard-managed. Run it before every release containing new migrations. Optional deployment values default to `sink`: `DEPLOY_D1_DATABASE_NAME`, `DEPLOY_R2_BUCKET_NAME`, and `DEPLOY_ANALYTICS_DATASET`. Do not upload `DEPLOY_*` values as runtime variables or edit tracked `wrangler.jsonc`.

7. Under **Settings** → **Runtime** → **Compatibility flags**, add `nodejs_compat`.
8. Redeploy.

D1 is the authoritative link store. KV is a write-through read cache and, until migration completion, a temporary source for legacy records. Upgraded instances should run the [KV-to-D1 migration API](/api/#migration-and-utilities).

For optional dashboard protection, see [Cloudflare Access](/configuration/cloudflare-access). For event delivery details, see [Click Webhooks](/configuration/webhooks). To update a fork, follow GitHub's [syncing a fork](https://docs.github.com/pull-requests/collaborating-with-pull-requests/working-with-forks/syncing-a-fork) guide.
