---
title: Architecture
description: Understand how Sink handles dashboard, API, redirect, storage, and analytics traffic.
---

# Architecture

Sink runs its dashboard, API, and short-link redirects on Cloudflare Workers or Pages.

## Request flow

1. Visitors open a short link on your Sink hostname.
2. Sink reads the link and returns the configured redirect or link page.
3. The dashboard and external clients use the authenticated `/api/**` routes to manage links.
4. When analytics is enabled, visits are recorded for dashboard reports and logs.

## Cloudflare services

| Binding     | Status      | Purpose                                 |
| ----------- | ----------- | --------------------------------------- |
| `DB` (D1)   | Required    | Stores links and related data.          |
| `KV`        | Required    | Speeds up link redirects.               |
| `ANALYTICS` | Recommended | Records visits for analytics and logs.  |
| `R2`        | Optional    | Stores backups and OpenGraph images.    |
| `AI`        | Optional    | Generates suggested slugs and metadata. |

D1 stores the primary link data, while KV provides fast redirect lookups. Link changes made through the dashboard or API are saved to D1 and reflected in KV.

R2 and Workers AI are independent enhancements. Sink continues to manage and redirect links without them. For deployment requirements, start with [Getting Started](./getting-started).
