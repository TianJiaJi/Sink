---
title: Link Features
description: Manage Sink links with custom slugs, routing, expiration, passwords, safety checks, metadata, cloaking, tags, and redirect options.
---

# Link Features

Create and manage links from the dashboard or authenticated API. A link needs a destination URL; every other behavior is optional.

## Slugs and tags

Omit a slug to generate a lowercase random value. Case-sensitive mode only changes how **custom** slugs are normalized and matched: it can make `Docs` and `docs` distinct, but generated random slugs remain lowercase.

Tags are normalized to lowercase and deduplicated. Each link supports up to 10 tags of 1–32 characters.

## Expiration and preview mode

Newly created or edited links require a future expiration timestamp when one is supplied. Once expired, a link no longer resolves as active. Import is different: it intentionally permits already-expired records so portable history is not discarded.

Preview mode is an instance-wide demonstration setting. It limits created links to a five-minute lifetime and prevents editing or deleting them. Enable it only on disposable public demos.

## Passwords and unsafe warnings

Password-protected browser visitors see a password form. API-style redirect clients can send `x-link-password`. Passwords set through current create and edit flows are protected before storage, and exports convert stored password values to a portable protected form. KV-to-D1 migration is the exception: it preserves legacy password values exactly as stored, so an older migrated record may contain plaintext in D1 until the password is edited.

Set `unsafe` on a link to control the warning explicitly. If safe browsing is configured, Sink performs its DNS-over-HTTPS check only when `unsafe` was **not supplied**. A blocked `0.0.0.0` answer marks the link unsafe; lookup failures fail open. An unsafe link without a password requires a `POST` with `confirm=true`; a `GET` header cannot confirm it. For programmatic access to an unsafe password-protected link, clients can send both `x-link-password` and `x-link-confirm: true`.

## Destination routing

- **Query forwarding:** append incoming query parameters globally or override that choice per link.
- **Geo routing:** map two-letter country codes to alternate URLs using Cloudflare request metadata.
- **Device routing:** set Apple or Android destinations. A matching device destination takes precedence over the default or geo destination.

## OpenGraph and cloaking

Custom title, description, and image values provide link previews to recognized social crawlers. OpenGraph images can be uploaded to the configured R2 bucket.

Cloaking renders an HTTPS destination in a full-page iframe while retaining the short URL in the address bar. It is not a privacy feature: the destination remains visible to browsers and developer tools. Sites with restrictive `X-Frame-Options` or `Content-Security-Policy: frame-ancestors` will refuse to load, and sensitive flows such as OAuth or payments may reject framing.

## Instance-wide redirect options

Sink can change the normal redirect status, attach no-store headers, redirect the homepage, and redirect missing slugs. These settings affect the entire instance; review their exact defaults and activation rules in [configuration](/configuration/#advanced-defaults).
