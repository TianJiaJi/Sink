---
title: Sink REST API
description: Authenticate with Sink and use link, migration, analytics, location, upload, backup, and health-check API endpoints.
---

# Sink REST API

Every Sink instance publishes its own OpenAPI documents:

- `https://your-domain/_docs/openapi.json` — machine-readable OpenAPI JSON
- `https://your-domain/_docs/scalar` — Scalar interactive reference
- `https://your-domain/_docs/swagger` — Swagger UI

The public demo is explicitly available at [https://sink.cool/_docs/scalar](https://sink.cool/_docs/scalar). Its schema documents the demo instance; use your own hostname for a self-hosted instance.

## Authentication

API endpoints require the site token in the `Authorization` header:

```http
Authorization: Bearer YOUR_SITE_TOKEN
```

The value is `NUXT_SITE_TOKEN`. When [Cloudflare Access](/configuration/cloudflare-access) is configured, browser requests from an authenticated dashboard can instead use the signed Access application token supplied by Cloudflare. Sink verifies its signature, issuer, audience, and expiration.

## Endpoints

### Links

| Method | Endpoint           | Description                                                                    |
| ------ | ------------------ | ------------------------------------------------------------------------------ |
| `POST` | `/api/link/create` | Create a short link.                                                           |
| `PUT`  | `/api/link/edit`   | Update an existing link.                                                       |
| `POST` | `/api/link/upsert` | Return the existing link for a slug, or create it when absent.                 |
| `POST` | `/api/link/delete` | Delete a link.                                                                 |
| `GET`  | `/api/link/query`  | Get one link by slug.                                                          |
| `GET`  | `/api/link/search` | Search links.                                                                  |
| `GET`  | `/api/link/list`   | List links with cursor pagination.                                             |
| `GET`  | `/api/link/export` | Export a page of links as JSON. Follow `cursor` until `list_complete` is true. |
| `POST` | `/api/link/import` | Import a validated batch. Existing active slugs are skipped.                   |
| `POST` | `/api/link/check`  | Check up to ten stored links' target availability, with a 1–30 second timeout. |
| `GET`  | `/api/link/ai`     | Generate an AI slug suggestion.                                                |
| `GET`  | `/api/link/og-ai`  | Generate AI OpenGraph metadata.                                                |

### Analytics and logs

| Method | Endpoint              | Description                                                                                              |
| ------ | --------------------- | -------------------------------------------------------------------------------------------------------- |
| `GET`  | `/api/stats/counters` | Get analytics counters.                                                                                  |
| `GET`  | `/api/stats/metrics`  | Get detailed metrics by dimension.                                                                       |
| `GET`  | `/api/stats/views`    | Get time-series view counts.                                                                             |
| `GET`  | `/api/stats/heatmap`  | Get heatmap data.                                                                                        |
| `GET`  | `/api/stats/export`   | Export access analytics as CSV. This is the actual public URL handled by the dynamic stats action route. |
| `GET`  | `/api/logs/events`    | Get recent event logs.                                                                                   |
| `GET`  | `/api/logs/locations` | Get recent access locations.                                                                             |

### Migration and utilities

| Method | Endpoint                     | Description                                                                                                              |
| ------ | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `GET`  | `/api/link/migration/status` | Report whether the KV-to-D1 migration marker exists and return it.                                                       |
| `POST` | `/api/link/migration/run`    | Copy one bounded page (up to 40 KV records) into D1. Continue with the opaque response cursor until `completed` is true. |
| `GET`  | `/api/verify`                | Verify credentials and report `site-token` or `cloudflare-access`.                                                       |
| `GET`  | `/api/location`              | Return request latitude and longitude from Cloudflare request metadata.                                                  |
| `POST` | `/api/upload/image`          | Upload an OpenGraph image to R2.                                                                                         |
| `POST` | `/api/backup`                | Trigger a manual KV compatibility backup to R2.                                                                          |

D1 is authoritative. KV serves as the write-through read cache and the temporary source of legacy links until the migration marker is written. Migration never overwrites an existing D1 row. `force=true` rescans KV without changing that rule. If a migration page returns failures, resolve them and start a new run because that run is discarded.

## Create a short link

```http
POST /api/link/create
Authorization: Bearer SinkCool
Content-Type: application/json

{
  "url": "https://github.com/miantiao-me/Sink",
  "slug": "sink",
  "comment": "GitHub repository",
  "expiration": 1767225599,
  "apple": "https://apps.apple.com/app/id6745417598",
  "google": "https://play.google.com/store/apps/details?id=com.example",
  "geo": { "US": "https://example.com/us" },
  "title": "Sink - Link Shortener",
  "description": "A simple, speedy, secure link shortener",
  "image": "/_assets/images/sink/cover.webp",
  "password": "correct-horse-battery-staple",
  "unsafe": false,
  "redirectWithQuery": true
}
```

| Field                             | Type      | Required | Description                                                            |
| --------------------------------- | --------- | -------- | ---------------------------------------------------------------------- |
| `url`                             | `string`  | Yes      | Target URL, up to 2048 characters.                                     |
| `slug`                            | `string`  | No       | Custom slug; generated when omitted.                                   |
| `comment`                         | `string`  | No       | Internal note.                                                         |
| `expiration`                      | `number`  | No       | Future Unix timestamp in seconds.                                      |
| `apple` / `google`                | `string`  | No       | Device-specific target URL.                                            |
| `geo`                             | `object`  | No       | Country-code-to-URL routing map.                                       |
| `title` / `description` / `image` | `string`  | No       | OpenGraph metadata.                                                    |
| `cloaking`                        | `boolean` | No       | Load the destination in an iframe while keeping the short URL visible. |
| `redirectWithQuery`               | `boolean` | No       | Per-link query forwarding override.                                    |
| `password`                        | `string`  | No       | Password protection; stored as a hash.                                 |
| `unsafe`                          | `boolean` | No       | Require an unsafe-link confirmation page.                              |

Geo routing uses Cloudflare's two-letter country code. Device routing takes precedence over the default or geo target. Programmatic visitors can pass `x-link-password` for protected links and `x-link-confirm: true` after approving unsafe destinations.

## Export analytics

```http
GET /api/stats/export?startAt=1717200000&endAt=1719791999&slug=sink
Authorization: Bearer SinkCool
```

The response is `text/csv` with `slug`, `url`, `viewer`, `views`, and `referer` columns. Filters accepted by analytics views, including time, slug, country, browser, and device filters, can be supplied as query parameters.

## Import and export behavior

Link export uses pages of `NUXT_PUBLIC_KV_BATCH_LIMIT` (default 50). Import accepts half that value (default 25) per request. That bounded API contract remains for compatibility and request cost control; it should not be interpreted as two KV operations per link. Link creation and duplicate detection are authoritative D1 operations, followed by a best-effort write-through KV cache update. Expired imports are rejected and duplicates are skipped. Export preserves password hashes in Sink's portable storage format so they can be imported unchanged; dashboard-masked values cannot be imported as plaintext passwords.

## CORS

Set `NUXT_API_CORS=true` at build time to enable CORS for `/api/**`.
