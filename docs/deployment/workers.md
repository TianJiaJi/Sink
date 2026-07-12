---
title: Deploy Sink on Cloudflare Workers
description: Deploy Sink to Cloudflare Workers with D1, KV, R2, Analytics Engine, runtime variables, and automated migrations.
---

# Deploy Sink on Cloudflare Workers

1. [Fork the repository](https://github.com/miantiao-me/Sink/fork).
2. Create a [KV namespace](https://developers.cloudflare.com/kv/) and copy its ID.
3. Create D1 and copy its ID: `pnpm wrangler d1 create sink`.
4. Create an [R2 bucket](https://developers.cloudflare.com/r2/) named `sink`, or run `pnpm wrangler r2 bucket create sink`. The deployment always includes `R2`; OpenGraph uploads and automatic compatibility backups depend on it.
5. Create a [Cloudflare Workers](https://developers.cloudflare.com/workers/) project connected to the fork.
6. Configure these commands:
   - **Build command:** `pnpm build`
   - **Deploy command:** `pnpm deploy:worker`
7. Under **Workers Builds** → **Build variables and secrets**, configure:
   - `DEPLOY_D1_DATABASE_ID` (**required**)
   - `DEPLOY_KV_NAMESPACE_ID` (**required**, used for production and preview KV bindings)
   - `DEPLOY_D1_DATABASE_NAME` (optional, default `sink`)
   - `DEPLOY_R2_BUCKET_NAME` (optional, default `sink`; the bucket must exist)
   - `DEPLOY_ANALYTICS_DATASET` (optional, default `sink`)
   - `NUXT_API_CORS` (optional, build only)
   - Each `NUXT_PUBLIC_*` value needed by the instance

`DEPLOY_*` values are deployment-only. Do not add them as Worker runtime variables or edit tracked `wrangler.jsonc`. The deploy command creates gitignored `wrangler.deploy.jsonc`, applies pending D1 migrations, and publishes the Worker.

8. Save and deploy.
9. Under the Worker's **Settings** → **Variables and Secrets**, configure runtime values:
   - Repeat all `NUXT_PUBLIC_*` build values.
   - Set a strong `NUXT_SITE_TOKEN`; use at least eight characters and avoid predictable values such as digit-only tokens.
   - Set `NUXT_CF_ACCOUNT_ID` and an `NUXT_CF_API_TOKEN` with at least Account Analytics permission.
   - Add other runtime `NUXT_*` values as needed, including `NUXT_DATASET`, Access, and webhook settings.
10. Enable Analytics Engine under **Workers & Pages** → **Account details** and keep `NUXT_DATASET` aligned with `DEPLOY_ANALYTICS_DATASET`.
11. Redeploy the project.

D1 is the authoritative link store. KV is a write-through read cache and a temporary legacy source before migration completion. For upgrades with existing KV links, use the [migration API](/api/#migration-and-utilities) after applying D1 migrations.

For optional dashboard protection, see [Cloudflare Access](/configuration/cloudflare-access). For event delivery details, see [Click Webhooks](/configuration/webhooks). To update a fork, follow GitHub's [syncing a fork](https://docs.github.com/pull-requests/collaborating-with-pull-requests/working-with-forks/syncing-a-fork) guide.
