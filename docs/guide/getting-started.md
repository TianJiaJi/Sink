---
title: Getting Started
description: Choose a Sink deployment target, configure Cloudflare bindings, and open your first self-hosted dashboard.
---

# Getting Started

Sink is a self-hosted link shortener and analytics application built for Cloudflare. D1 is the authoritative link store. KV is a write-through read cache and remains a temporary source for legacy links only until the KV-to-D1 migration is marked complete.

## Prerequisites

- Node.js 22 or later and pnpm 11.11.0 for local commands
- A Cloudflare account
- A fork of the [Sink repository](https://github.com/miantiao-me/Sink/fork)
- A D1 database, KV namespace, R2 bucket, and Analytics Engine dataset

## Choose a deployment target

- [Cloudflare Workers](/deployment/workers) is the recommended Git-integrated deployment path and uses Sink's generated Wrangler configuration.
- [Cloudflare Pages](/deployment/pages) uses dashboard-managed bindings and requires remote D1 migrations before releases that change the schema.

## Configure the instance

At minimum, configure the required Cloudflare bindings and set a strong `NUXT_SITE_TOKEN`. Use at least eight characters and avoid predictable values such as digit-only tokens. Then review [environment variables](/configuration/) and optionally configure [Cloudflare Access](/configuration/cloudflare-access) or [click webhooks](/configuration/webhooks).

After deployment, open `/dashboard` on your hostname. API clients can use the same site token as a bearer token. See the [API reference](/api/) or explore the public [Sink demo API](https://sink.cool/_docs/scalar).

## Storage migration

New installations write links to D1 and populate KV as a cache. Upgraded installations should call the authenticated migration endpoints until the status reports completion. The migration copies bounded pages of legacy `link:*` KV records into D1 without overwriting existing D1 rows. See [API migration endpoints](/api/#migration-and-utilities).
