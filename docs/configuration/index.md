---
title: Configuration Reference
description: Every supported Sink environment variable — what it does, where to set it, and when you need it.
---

# Configuration Reference

All values are strings. Boolean switches use `true` unless noted.

**What most people need**

- Always: `NUXT_SITE_TOKEN`, D1 (`DB`), KV (`KV`), and their IDs
- For analytics: `ANALYTICS` binding + `NUXT_CF_ACCOUNT_ID` + `NUXT_CF_API_TOKEN` — see [Analytics](/features/analytics)
- Everything else is optional

## Where to put variables

Think of two moments:

| When              | Meaning                                                                | Workers                                                  | Pages                                   |
| ----------------- | ---------------------------------------------------------------------- | -------------------------------------------------------- | --------------------------------------- |
| **At build time** | Used while Cloudflare builds/publishes the app                         | Workers Builds → Variables                               | **Settings → Variables and Secrets**    |
| **At runtime**    | Used while the live app is running                                     | Worker **Settings → Variables and Secrets**              | Same **Variables and Secrets** (shared) |
| **Both**          | Needed in the built UI and at runtime (for example public UI settings) | Set the **same** value in Builds **and** Worker settings | Set once                                |

::: tip After changing public/build values
Trigger a new deploy so the app rebuilds. On Workers, “both” values must match in both places.
:::

Names starting with `DEPLOY_*` are only for connecting resources during deploy. They rewrite placeholders in tracked `wrangler.jsonc` into gitignored `wrangler.deploy.jsonc` — set `DEPLOY_*` in `.env` or Cloudflare build variables; do not hardcode production IDs in `wrangler.jsonc`. Names starting with `NUXT_*` configure the running app.

## Cloudflare bindings

A **binding** connects a Cloudflare product to Sink under a fixed name.

| Binding     | Required?   | Plain meaning                                                                                                       |
| ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------- |
| `DB`        | Yes         | D1 database — stores links                                                                                          |
| `KV`        | Yes         | Fast cache for redirects (+ storage-ready flag)                                                                     |
| `ANALYTICS` | Recommended | Visit events for analytics                                                                                          |
| `R2`        | Optional    | File storage for backups and social images. Workers can set `DEPLOY_R2_BUCKET_NAME`; Pages adds R2 in the dashboard |
| `AI`        | Optional    | Workers AI suggestions                                                                                              |
| `ASSETS`    | Automatic   | Static files — provided for you                                                                                     |

Analytics is optional. Without it, short links and the dashboard still work; charts stay empty. Setup: [Analytics](/features/analytics).

## Required

::: warning `NUXT_SITE_TOKEN`
Set this yourself. It is the **dashboard login password** and the **API password**. At least 8 characters; longer is better. Keep it stable.

If you leave it empty, Sink may invent a random password at build time that can change on the next deploy.
:::

| Variable                 | When             | Where                                | Purpose                                   |
| ------------------------ | ---------------- | ------------------------------------ | ----------------------------------------- |
| `NUXT_SITE_TOKEN`        | Runtime (secret) | Encrypted secret on Workers or Pages | Login + API password                      |
| `DEPLOY_D1_DATABASE_ID`  | Build            | Workers Builds or Pages variables    | D1 database ID (from the D1 detail page)  |
| `DEPLOY_KV_NAMESPACE_ID` | Build            | Workers Builds or Pages variables    | KV namespace ID (from the KV detail page) |

## Recommended (analytics)

| Variable             | When             | Where                    | Purpose                                                       |
| -------------------- | ---------------- | ------------------------ | ------------------------------------------------------------- |
| `NUXT_CF_ACCOUNT_ID` | Runtime          | Worker or Pages variable | Your Cloudflare account ID                                    |
| `NUXT_CF_API_TOKEN`  | Runtime (secret) | Encrypted secret         | Custom Token with **Account → Account Analytics → Read** only |

Also bind `ANALYTICS`. Add `R2` for [backups](/features/backups), `AI` for [Workers AI](/features/ai). Token steps: [Analytics](/features/analytics).

## Public overrides (only if you change defaults)

On Workers, set the same value in Builds and runtime. On Pages, set once, then redeploy.

| Variable                          | Default | Purpose                                                   |
| --------------------------------- | ------- | --------------------------------------------------------- |
| `NUXT_PUBLIC_PREVIEW_MODE`        | empty   | `true` = demo mode (links last 5 minutes)                 |
| `NUXT_PUBLIC_SLUG_DEFAULT_LENGTH` | `6`     | Length of auto-generated short codes                      |
| `NUXT_PUBLIC_KV_BATCH_LIMIT`      | `50`    | Export page size; import accepts at most half per request |
| `NUXT_PUBLIC_MAX_URL_LENGTH`      | `16384` | Maximum target URL length in characters (256-24000)       |

### Reverse proxy delivery

`NUXT_PUBLIC_LINK_PROXY_ENABLED` defaults to `false`. After applying the additive database migration, enabling the flag allows individual links to opt into proxy delivery. Stored proxy links fall back to normal redirects while the flag is off. Use only fully trusted destinations: proxied content executes in the Sink origin.

This setting does not restore Workers AI, which remains disabled in this fork. Keep build and runtime public settings aligned and rebuild when changing them. Do not publish the proxy-aware server before the database migration has been applied, even when proxy delivery is disabled.

### Target URL length

`NUXT_PUBLIC_MAX_URL_LENGTH` defaults to `16384` and accepts integers from `256` through `24000`. Set the same value in build and runtime environments, then rebuild. The write limit applies to target, mobile, geo-routing, and A/B variant URLs submitted through create, edit, or import.

Stored and legacy-KV records retain a fixed 24000-character read ceiling, so lowering the write setting does not invalidate existing records. Editing or re-importing those records still requires their submitted URLs to satisfy the current write limit.

Exact duplicate checks use a POST request body instead of putting the target URL in the request URL. Platform byte-size and response-header limits still apply; the configurable character limit does not remove those transport limits.

### Deployment configuration ownership

Wrangler bindings and custom domains are controlled by the repository configuration. A dashboard-only binding removal can be undone by the next deployment if the binding is still declared in `wrangler.jsonc`. Keep these declarations aligned with production. `keep_vars: true` preserves dashboard-managed variables; store credentials as encrypted Secrets rather than plaintext variables.

This fork currently omits the optional Workers AI binding because the production account rejects AI binding creation. AI endpoints return HTTP 501 while the binding is absent; ordinary link management does not require it. Restore the binding only after the account-level AI issue is resolved, regenerate Worker types, and validate the deployment configuration before publishing.

### Homepage redirect

Set `NUXT_PUBLIC_HOME_URL` to redirect both full-page requests and in-app navigation to `/`. Set it in both build and runtime environments, then rebuild. An empty value shows the Sink homepage.

`NUXT_HOME_URL` remains a deprecated fallback for server-side redirects. Its build-time value also initializes the public setting, but changing only the legacy runtime variable does not update the built SPA. An explicit non-empty `NUXT_PUBLIC_HOME_URL` takes precedence.

## Optional

### Build-time options

| Variable                         | Where                   | When it turns on                                                                                     |
| -------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------- |
| `NUXT_API_CORS`                  | Builds or Pages         | Exactly `true` allows browser apps on other sites to call `/api/**` (CORS). Login is still required  |
| `DEPLOY_R2_BUCKET_NAME`          | Workers Builds only     | Set to an existing R2 bucket name to attach R2 (`bucket_name`). Pages: add R2 under Bindings instead |
| `DEPLOY_KV_PREVIEW_NAMESPACE_ID` | Workers Builds or Pages | Optional Wrangler `preview_id`; defaults to `DEPLOY_KV_NAMESPACE_ID`                                 |
| `DEPLOY_R2_PREVIEW_BUCKET_NAME`  | Workers Builds only     | Optional Wrangler `preview_bucket_name`; defaults to `DEPLOY_R2_BUCKET_NAME` when R2 is enabled      |

### Runtime options

| Variable                                            | Purpose                                                                  |
| --------------------------------------------------- | ------------------------------------------------------------------------ |
| `NUXT_HOME_URL`                                     | Deprecated server-side fallback; prefer `NUXT_PUBLIC_HOME_URL`           |
| `NUXT_NOT_FOUND_REDIRECT`                           | Where to send unknown short codes (**always HTTP 302**)                  |
| `NUXT_CF_ACCESS_TEAM_DOMAIN` + `NUXT_CF_ACCESS_AUD` | Both set → enable [Cloudflare Access](./cloudflare-access)               |
| `NUXT_SAFE_BROWSING_DOH`                            | DNS-over-HTTPS URL used to check unsafe domains when `unsafe` is not set |
| `NUXT_WEBHOOK_URL`                                  | HTTP(S) URL for [click webhooks](./webhooks)                             |
| `NUXT_WEBHOOK_SECRET`                               | Optional signing secret starting with `whsec_`                           |

Safe browsing example: Cloudflare Family DNS `https://family.cloudflare-dns.com/dns-query`. See also [Link Features](/features/links).

## Advanced defaults (usually leave alone)

| Variable                      | Default                      | Purpose                                                                                                      |
| ----------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `NUXT_REDIRECT_STATUS_CODE`   | `301`                        | Normal redirect code (`302` / `307` / `308` also work). Unknown-slug redirects stay 302                      |
| `NUXT_LINK_CACHE_TTL`         | `60`                         | How long KV caches a link (seconds)                                                                          |
| `NUXT_REDIRECT_WITH_QUERY`    | `false`                      | `true` appends visitor query params to the target URL                                                        |
| `NUXT_REDIRECT_NO_STORE`      | `false`                      | `true` asks browsers not to cache the redirect                                                               |
| `NUXT_CASE_SENSITIVE`         | `false`                      | `true` keeps custom short-code case (`Docs` ≠ `docs`)                                                        |
| `NUXT_DATASET`                | `sink`                       | Analytics dataset name; must match the `ANALYTICS` binding                                                   |
| `NUXT_LIST_QUERY_LIMIT`       | `500`                        | Max rows in analytics lists                                                                                  |
| `NUXT_DISABLE_BOT_ACCESS_LOG` | `false`                      | `true` drops detected bots from analytics and webhooks                                                       |
| `NUXT_DISABLE_AUTO_BACKUP`    | `false`                      | `true` turns off scheduled R2 backups                                                                        |
| `NUXT_AI_MODEL`               | `@cf/qwen/qwen3-30b-a3b-fp8` | Workers AI model                                                                                             |
| `NUXT_AI_PROMPT`              | built-in                     | Custom slug prompt must keep `{slugRegex}`                                                                   |
| `NUXT_AI_OG_PROMPT`           | built-in                     | Custom social-preview prompt                                                                                 |
| `DEPLOY_D1_DATABASE_NAME`     | `sink`                       | Overrides `d1_databases[].database_name` in generated deploy config                                          |
| `DEPLOY_ANALYTICS_DATASET`    | `sink`                       | Overrides `analytics_engine_datasets[].dataset` in generated deploy config; keep aligned with `NUXT_DATASET` |

See [Analytics](/features/analytics) and [API](/api/).
