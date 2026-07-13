---
title: Sink FAQs
description: Troubleshoot Sink bindings, authentication, analytics, redirects, link routing, import and export, cloaking, and safety features.
---

# Frequently Asked Questions

## Why can't I create a link?

Confirm that both D1 and KV are bound with the exact uppercase names `DB` and `KV`. D1 is the authoritative link store; KV is the write-through read cache and the temporary legacy source before migration completion.

<details>
  <summary><b>KV binding screenshot</b></summary>
  <img alt="KV binding settings in Cloudflare" src="./images/faqs-kv.png">
</details>

## Why can't I log in?

Check that the supplied token exactly matches `NUXT_SITE_TOKEN`. For production, use a strong value with at least eight characters and avoid predictable values such as digit-only tokens.

## Why can't I see analytics data?

1. Verify `NUXT_CF_ACCOUNT_ID` and `NUXT_CF_API_TOKEN`. The account ID must belong to the deployment account and the token needs Account Analytics access.
2. Enable Analytics Engine and bind `ANALYTICS` to the dataset named by `NUXT_DATASET` (default `sink`).

<details>
  <summary><b>Analytics Engine binding screenshot</b></summary>
  <img alt="Analytics Engine binding settings in Cloudflare" src="./images/faqs-Analytics_engine.png">
</details>

## Can the homepage redirect to my website?

Yes. Set `NUXT_HOME_URL` to your blog or website URL.

## Why are statistics missing after a NuxtHub deployment?

NuxtHub's `ANALYTICS` binding can point to its own dataset. Set `NUXT_DATASET` to that same dataset name so Sink queries the dataset receiving events.

## Why are links case-insensitive?

Sink normalizes slugs to lowercase by default to avoid accidental capitalization differences. Set `NUXT_CASE_SENSITIVE=true` to preserve case. New random slugs can then contain uppercase and lowercase characters, and `MyLink` and `mylink` become distinct.

## Why does the metric list show only 500 entries?

The default `NUXT_LIST_QUERY_LIMIT` is 500 to bound analytics query cost. Increase it if your deployment can support larger queries.

## How do I exclude bots and crawlers?

Set `NUXT_DISABLE_BOT_ACCESS_LOG=true`. Excluded bot clicks are also omitted from click webhooks.

## What is link cloaking?

Cloaking keeps the short link in the address bar and loads the HTTPS destination in a full-screen iframe. Enable **Link Cloaking** in link settings.

It does not hide the destination from source, developer tools, network logs, or inspection. Sites using `X-Frame-Options: DENY` or restrictive `Content-Security-Policy: frame-ancestors` will not load. OAuth and payment flows may also reject iframe use. Device-specific redirects take precedence. If you control the destination, allow your short-link origin, for example:

```http
Content-Security-Policy: frame-ancestors 'self' https://your-short-domain.example
```

## How does query forwarding work?

With `redirectWithQuery`, parameters from a request such as `https://s.example/link?ref=social` are appended to the destination. Set `NUXT_REDIRECT_WITH_QUERY=true` for the global default, then override it per link with **Redirect with Query Parameters**.

## How do import and export work?

- **Export:** Fetches cursor-paginated JSON pages, defaulting to 50 links per page.
- **Import:** Accepts bounded batches, defaulting to 25 links per request.
- **Storage:** D1 performs authoritative duplicate detection and writes. Successful writes update KV as a best-effort cache operation. The batch sizes are compatibility and request-cost limits, not a claim that every link consumes two KV operations.
- **Expiration:** Imports with expiration timestamps in the past are rejected.
- **Duplicates:** Existing active slugs are skipped and preserved.
- **Validation:** The complete request is schema-validated before import processing.
- **Passwords:** Export preserves password hashes in Sink's portable storage format, and those hashes can be imported unchanged. Values masked by the dashboard cannot be imported as plaintext passwords.

Legacy KV records are migrated separately through `/api/link/migration/run`; import/export is not the KV-to-D1 migration mechanism.

## How do protected and unsafe links work?

Password-protected browser visitors receive a password form. Programmatic clients can send `x-link-password`. Unsafe links display a warning and programmatic clients can send `x-link-confirm: true` after approval. Set `NUXT_SAFE_BROWSING_DOH` to a DoH endpoint for automatic unsafe-domain checks during create and edit.

## How does geo-routing work?

Set country-specific destinations with two-letter codes, such as `{ "US": "https://example.com/us" }`. Sink uses Cloudflare's `request.cf.country`; device-specific Apple or Android destinations take precedence.

## How can I export analytics?

Use the dashboard or authenticated `GET /api/stats/export`. It returns CSV with `slug`, `url`, `viewer`, `views`, and `referer`. Supply the same filters used by analytics views, such as `startAt`, `endAt`, `slug`, `country`, `browser`, or `device`.
