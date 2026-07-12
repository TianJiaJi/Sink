---
title: Sink Configuration
description: Configure Sink build, runtime, public, authentication, analytics, redirect, AI, backup, and deployment settings.
---

# Sink Configuration

Environment variables map to the defaults in `nuxt.config.ts`.

| Category          | Variables                                          | Cloudflare Workers placement                                      |
| ----------------- | -------------------------------------------------- | ----------------------------------------------------------------- |
| Build only        | `NUXT_API_CORS`                                    | **Build variables and secrets**                                   |
| Build and runtime | `NUXT_PUBLIC_*`                                    | Build variables and Worker runtime variables                      |
| Runtime           | Other `NUXT_*` variables mapped to `runtimeConfig` | Worker **Variables and Secrets**                                  |
| Deployment only   | `DEPLOY_*`                                         | Build environment or local `.env`; never Worker runtime variables |

`DEPLOY_*` variables generate `wrangler.deploy.jsonc` for CLI deployment and remote migrations. They are not application settings.

## Public settings

| Variable                          | Default        | Description                                                                                                                                                                                                             |
| --------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NUXT_PUBLIC_PREVIEW_MODE`        | Empty/disabled | Enables demo mode. Created links expire after five minutes and cannot be edited or deleted.                                                                                                                             |
| `NUXT_PUBLIC_SLUG_DEFAULT_LENGTH` | `6`            | Default length of generated slugs.                                                                                                                                                                                      |
| `NUXT_PUBLIC_KV_BATCH_LIMIT`      | `50`           | Page size used by link import and export. Import accepts half this value per request. Despite the historical name, authoritative link operations use D1; KV is the write-through cache and pre-migration legacy source. |

For Workers, set public variables in both the build and runtime environments.

## Authentication and Access

| Variable                     | Default                | Description                                                                                                                                   |
| ---------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `NUXT_SITE_TOKEN`            | Random UUID when unset | Dashboard and API bearer token. Production deployments should set a strong value with at least eight characters and avoid predictable tokens. |
| `NUXT_CF_ACCESS_TEAM_DOMAIN` | Empty                  | Access team domain, such as `https://team.cloudflareaccess.com`.                                                                              |
| `NUXT_CF_ACCESS_AUD`         | Empty                  | Access application audience tag. Access authentication is enabled only when both values are set.                                              |

See [Cloudflare Access authentication](./cloudflare-access).

## Redirects and links

| Variable                    | Default | Description                                                                                                   |
| --------------------------- | ------- | ------------------------------------------------------------------------------------------------------------- |
| `NUXT_REDIRECT_STATUS_CODE` | `301`   | Redirect status; `302`, `307`, and `308` are also supported.                                                  |
| `NUXT_LINK_CACHE_TTL`       | `60`    | KV cache TTL in seconds for short-link reads. Longer values can delay cache refreshes.                        |
| `NUXT_REDIRECT_WITH_QUERY`  | `false` | Global default for appending incoming query parameters. A link can override it.                               |
| `NUXT_REDIRECT_NO_STORE`    | `false` | Sends no-store behavior for redirects so changes take effect promptly in browsers and CDNs.                   |
| `NUXT_HOME_URL`             | Empty   | Redirect target for the root page. Empty uses Sink's introduction page.                                       |
| `NUXT_CASE_SENSITIVE`       | `false` | Preserves slug case when true; otherwise slugs are normalized to lowercase.                                   |
| `NUXT_SAFE_BROWSING_DOH`    | Empty   | DoH endpoint for unsafe-domain detection. A response resolving the domain to `0.0.0.0` marks the link unsafe. |
| `NUXT_NOT_FOUND_REDIRECT`   | Empty   | Optional target when a slug is not found. Empty uses Sink's 404 page.                                         |

Cloudflare Family DNS (`https://family.cloudflare-dns.com/dns-query`) or a custom Cloudflare Zero Trust Gateway DoH endpoint can be used for safe browsing.

## Analytics

| Variable                      | Default | Description                                                                        |
| ----------------------------- | ------- | ---------------------------------------------------------------------------------- |
| `NUXT_CF_ACCOUNT_ID`          | Empty   | Cloudflare account ID used to query Analytics Engine.                              |
| `NUXT_CF_API_TOKEN`           | Empty   | Cloudflare API token with Account Analytics access.                                |
| `NUXT_DATASET`                | `sink`  | Analytics Engine dataset. Keep it aligned with the deployed binding.               |
| `NUXT_LIST_QUERY_LIMIT`       | `500`   | Maximum result count for metric lists.                                             |
| `NUXT_DISABLE_BOT_ACCESS_LOG` | `false` | Excludes detected bot traffic from access statistics and click webhooks when true. |

## Workers AI

| Variable            | Default                      | Description                                                                       |
| ------------------- | ---------------------------- | --------------------------------------------------------------------------------- |
| `NUXT_AI_MODEL`     | `@cf/qwen/qwen3-30b-a3b-fp8` | Workers AI model for slug and OpenGraph generation.                               |
| `NUXT_AI_PROMPT`    | Built-in prompt              | Custom slug-generation prompt. Keep the `{slugRegex}` placeholder.                |
| `NUXT_AI_OG_PROMPT` | Built-in prompt              | Custom OpenGraph title and description prompt. Sink appends the preferred locale. |

Default slug prompt:

```txt
You are a URL shortening assistant, please shorten the URL provided by the user into a SLUG. The SLUG information should be derived from the URL and page content (if provided). Do not make any assumptions beyond the given information. A SLUG is human-readable and should not exceed three words and can be validated using regular expressions {slugRegex} . Only the best one is returned, the format must be JSON reference {"slug": "example-slug"}
```

Default OpenGraph prompt:

```txt
You are an OpenGraph metadata assistant. Please summarize the page content provided by the user into a perfect title and description for an OpenGraph preview. Do not make any assumptions beyond the given information. Only the best one is returned, the format must be JSON reference {"title": "Example Title", "description": "Example description that summarizes the page accurately."}
```

## Backups, webhooks, and CORS

| Variable                   | Default          | Description                                                                                                                |
| -------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `NUXT_DISABLE_AUTO_BACKUP` | `false`          | Disables the automatic daily KV backup to R2 when true. Backups run at 00:00 UTC and use `backups/links-{timestamp}.json`. |
| `NUXT_WEBHOOK_URL`         | Empty            | HTTP(S) receiver for best-effort click webhooks. Empty disables delivery.                                                  |
| `NUXT_WEBHOOK_SECRET`      | Empty            | Optional `whsec_` signing secret. See [Webhooks](./webhooks).                                                              |
| `NUXT_API_CORS`            | `false` at build | Set to `true` during the build to enable CORS on `/api/**`.                                                                |

Automatic backups require the `R2` binding. Note that backup compatibility concerns KV data; D1 remains the authoritative link store.

## Deployment settings

| Variable                   | Default                     | Description                    |
| -------------------------- | --------------------------- | ------------------------------ |
| `DEPLOY_D1_DATABASE_ID`    | Required for CLI deployment | D1 database ID.                |
| `DEPLOY_KV_NAMESPACE_ID`   | Required for CLI deployment | KV namespace ID.               |
| `DEPLOY_D1_DATABASE_NAME`  | `sink`                      | D1 database name.              |
| `DEPLOY_R2_BUCKET_NAME`    | `sink`                      | Existing R2 bucket name.       |
| `DEPLOY_ANALYTICS_DATASET` | `sink`                      | Analytics Engine dataset name. |
