---
title: Configuration Reference
description: Authoritative defaults, placement rules, and activation conditions for every supported Sink environment variable.
---

# Configuration Reference

This page lists every supported Sink environment variable. Environment values are strings; boolean switches use `true` unless stated otherwise.

## Scope

| Scope           | Meaning                                                                                     | Workers placement                                         | Pages placement                                                        |
| --------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------- |
| Build           | Used while generating the deployment configuration or building the application.             | Workers Builds variables and secrets.                     | **Settings → Variables and Secrets**; the same set is also at runtime. |
| Runtime         | Read by the deployed application. Secrets must use the platform's encrypted secret storage. | Worker **Settings → Variables and Secrets**.              | **Settings → Variables and Secrets**; the same set is also at build.   |
| Build + Runtime | Used by prerendered UI at build time and by the deployed application.                       | Set the same value in Workers Builds and Worker settings. | Set once in **Settings → Variables and Secrets**.                      |

After changing a build or public value, rebuild the deployment.

## Cloudflare bindings

| Binding     | Requirement                           | Purpose                                                                                                                      |
| ----------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `DB`        | Required                              | Authoritative D1 link storage.                                                                                               |
| `KV`        | Required                              | Link read cache and migration compatibility.                                                                                 |
| `ANALYTICS` | Recommended                           | Analytics event writes. Enable it for dashboard analytics and keep its dataset aligned with `NUXT_DATASET`.                  |
| `R2`        | Optional, recommended for backups     | Snapshot storage. Workers Builds can generate this binding with `DEPLOY_R2_BUCKET_NAME`; Pages must add it in the dashboard. |
| `AI`        | Optional, recommended for AI features | Workers AI slug and metadata generation.                                                                                     |
| `ASSETS`    | Automatic                             | Static application assets; the deployment configuration provides it automatically.                                           |

## Required configuration

| Variable                 | Scope          | Placement                                                         | Requirement                                                                                                                                         |
| ------------------------ | -------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NUXT_SITE_TOKEN`        | Runtime secret | Encrypted Worker runtime secret or encrypted Pages unified secret | Explicitly set a strong, stable value for dashboard and Bearer authentication. Do not rely on the random fallback, which can change between builds. |
| `DEPLOY_D1_DATABASE_ID`  | Build          | Workers Builds variable or Pages unified variable                 | Existing D1 database ID used to generate deployment configuration.                                                                                  |
| `DEPLOY_KV_NAMESPACE_ID` | Build          | Workers Builds variable or Pages unified variable                 | Existing KV namespace ID used for both production and preview bindings.                                                                             |

## Recommended configuration

| Variable             | Scope          | Placement                                                         | Purpose                                                              |
| -------------------- | -------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------- |
| `NUXT_CF_ACCOUNT_ID` | Runtime        | Worker runtime variable or Pages unified variable                 | Cloudflare account queried by the analytics dashboard.               |
| `NUXT_CF_API_TOKEN`  | Runtime secret | Encrypted Worker runtime secret or encrypted Pages unified secret | Token with Account Analytics access, used with `NUXT_CF_ACCOUNT_ID`. |

The `ANALYTICS` binding is also recommended. Add `R2` when using [Link Backups](/features/backups), and `AI` when using [Workers AI](/features/ai).

## Build + Runtime public overrides

Only configure these variables when overriding their defaults. On Workers, set the same value in Workers Builds and Worker runtime settings. On Pages, set it once in the unified **Variables and Secrets**. Rebuild after every change.

| Variable                          | Scope           | Placement                                                      | Default | Purpose                                                        |
| --------------------------------- | --------------- | -------------------------------------------------------------- | ------- | -------------------------------------------------------------- |
| `NUXT_PUBLIC_PREVIEW_MODE`        | Build + Runtime | Workers build and runtime variables, or Pages unified variable | Empty   | `true` enables preview mode.                                   |
| `NUXT_PUBLIC_SLUG_DEFAULT_LENGTH` | Build + Runtime | Workers build and runtime variables, or Pages unified variable | `6`     | Length used for generated random slugs.                        |
| `NUXT_PUBLIC_KV_BATCH_LIMIT`      | Build + Runtime | Workers build and runtime variables, or Pages unified variable | `50`    | Export page size; import accepts half this number per request. |

## Optional configuration

### Optional build configuration

#### Workers Builds and Pages

| Variable        | Placement                                         | Enabled when                                           |
| --------------- | ------------------------------------------------- | ------------------------------------------------------ |
| `NUXT_API_CORS` | Workers Builds variable or Pages unified variable | Exactly `true` enables CORS route rules for `/api/**`. |

#### Workers Builds only

| Variable                | Placement           | Enabled when                                                                                                           |
| ----------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `DEPLOY_R2_BUCKET_NAME` | Workers Builds only | Set to an existing bucket name to include the `R2` binding in generated Worker configuration. Recommended for backups. |

Pages does not use `DEPLOY_R2_BUCKET_NAME`. Add the `R2` binding to the Pages project in the Cloudflare dashboard instead.

### Optional runtime configuration

| Variable                     | Scope          | Placement                                                         | Enabled when                                                                                |
| ---------------------------- | -------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `NUXT_HOME_URL`              | Runtime        | Worker runtime variable or Pages unified variable                 | A non-empty URL redirects `/`; empty serves the Sink homepage.                              |
| `NUXT_NOT_FOUND_REDIRECT`    | Runtime        | Worker runtime variable or Pages unified variable                 | A non-empty path or URL receives missing-link redirects.                                    |
| `NUXT_CF_ACCESS_TEAM_DOMAIN` | Runtime        | Worker runtime variable or Pages unified variable                 | Cloudflare Access is enabled when this and `NUXT_CF_ACCESS_AUD` are both set.               |
| `NUXT_CF_ACCESS_AUD`         | Runtime        | Worker runtime variable or Pages unified variable                 | Cloudflare Access is enabled when this and the team domain are both set.                    |
| `NUXT_SAFE_BROWSING_DOH`     | Runtime        | Worker runtime variable or Pages unified variable                 | A non-empty DNS-over-HTTPS URL enables unsafe-domain checks when `unsafe` was not supplied. |
| `NUXT_WEBHOOK_URL`           | Runtime        | Worker runtime variable or Pages unified variable                 | A non-empty HTTP(S) URL enables click delivery.                                             |
| `NUXT_WEBHOOK_SECRET`        | Runtime secret | Encrypted Worker runtime secret or encrypted Pages unified secret | A valid `whsec_` value signs webhook requests; empty sends unsigned requests.               |

Cloudflare Family DNS (`https://family.cloudflare-dns.com/dns-query`) or a custom Cloudflare Zero Trust Gateway DoH endpoint can be used for safe browsing. See [Cloudflare Access](./cloudflare-access), [Link Features](/features/links), and [Click Webhooks](./webhooks).

## Advanced defaults

These settings already have application defaults and normally do not need configuration.

| Variable                      | Scope   | Placement                                | Default                      | Purpose                                                                         |
| ----------------------------- | ------- | ---------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------- |
| `NUXT_REDIRECT_STATUS_CODE`   | Runtime | Worker runtime or Pages unified variable | `301`                        | Normal redirect status; also supports `302`, `307`, and `308`.                  |
| `NUXT_LINK_CACHE_TTL`         | Runtime | Worker runtime or Pages unified variable | `60`                         | KV read-cache lifetime in seconds.                                              |
| `NUXT_REDIRECT_WITH_QUERY`    | Runtime | Worker runtime or Pages unified variable | `false`                      | Globally forwards incoming query parameters when `true`; links can override it. |
| `NUXT_REDIRECT_NO_STORE`      | Runtime | Worker runtime or Pages unified variable | `false`                      | Adds no-store behavior to normal redirects when `true`.                         |
| `NUXT_CASE_SENSITIVE`         | Runtime | Worker runtime or Pages unified variable | `false`                      | Preserves custom slug case and permits case-distinct slugs when `true`.         |
| `NUXT_DATASET`                | Runtime | Worker runtime or Pages unified variable | `sink`                       | Analytics dataset queried by the dashboard; must match the `ANALYTICS` binding. |
| `NUXT_LIST_QUERY_LIMIT`       | Runtime | Worker runtime or Pages unified variable | `500`                        | Maximum result count for analytics metric lists.                                |
| `NUXT_DISABLE_BOT_ACCESS_LOG` | Runtime | Worker runtime or Pages unified variable | `false`                      | Excludes detected bots from analytics and click webhooks when `true`.           |
| `NUXT_DISABLE_AUTO_BACKUP`    | Runtime | Worker runtime or Pages unified variable | `false`                      | Disables scheduled R2 snapshots when `true`.                                    |
| `NUXT_AI_MODEL`               | Runtime | Worker runtime or Pages unified variable | `@cf/qwen/qwen3-30b-a3b-fp8` | Workers AI model.                                                               |
| `NUXT_AI_PROMPT`              | Runtime | Worker runtime or Pages unified variable | Built-in slug prompt         | Custom prompt must retain `{slugRegex}`.                                        |
| `NUXT_AI_OG_PROMPT`           | Runtime | Worker runtime or Pages unified variable | Built-in OpenGraph prompt    | Custom metadata prompt; Sink appends the requested locale.                      |
| `DEPLOY_D1_DATABASE_NAME`     | Build   | Workers Builds or Pages unified variable | `sink`                       | Generated D1 database name.                                                     |
| `DEPLOY_ANALYTICS_DATASET`    | Build   | Workers Builds or Pages unified variable | `sink`                       | Generated Analytics Engine dataset name.                                        |

Deployment values generate the ignored `wrangler.deploy.jsonc`; they are not runtime application settings. See [Analytics and Realtime](/features/analytics) and [API](/api/).
