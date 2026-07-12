---
title: Click Webhooks
description: Configure Sink click webhook payloads, HMAC signatures, delivery behavior, and privacy guarantees.
---

# Click Webhooks

Set `NUXT_WEBHOOK_URL` to an HTTP or HTTPS endpoint to receive a best-effort webhook for each click included in access statistics. HTTPS is strongly recommended. Empty configuration disables delivery, and bot clicks excluded by `NUXT_DISABLE_BOT_ACCESS_LOG` are also excluded from webhooks.

## Signing secret

`NUXT_WEBHOOK_SECRET` is optional. It must start with `whsec_`; the suffix is a Base64-encoded HMAC key of 24–64 bytes. Generate a 32-byte key with:

```sh
printf 'whsec_%s\n' "$(openssl rand -base64 32)"
```

Every request has `webhook-id` and `webhook-timestamp`. Signed requests also have `webhook-signature: v1,<base64>`, calculated with HMAC-SHA256 over `<webhook-id>.<webhook-timestamp>.<raw-body>` using the decoded secret suffix. Verify the raw request body before parsing JSON.

An invalid non-empty secret fails delivery and never falls back to unsigned delivery. Without a secret, delivery is unauthenticated and unsigned and is not recommended over untrusted networks.

## Payload

Sink sends a Dub-style payload:

```json
{
  "id": "evt_...",
  "event": "link.clicked",
  "createdAt": "2026-07-11T12:00:00.000Z",
  "data": {
    "click": {
      "id": "clk_...",
      "timestamp": "2026-07-11T12:00:00.000Z",
      "country": "US",
      "region": "California",
      "city": "San Francisco",
      "device": "mobile",
      "browser": "Mobile Safari",
      "os": "iOS",
      "referer": "example.com"
    },
    "link": {
      "id": "link-id",
      "slug": "example"
    }
  }
}
```

Location fields contain raw Cloudflare country code, region, and city values. `device` prefers the parsed category and falls back to the device model.

## Delivery and privacy

Payloads exclude IP addresses, coordinates, full user agents, query parameters, passwords, and destination URLs. Delivery is asynchronous, has a 10-second timeout, accepts only 2xx responses, does not follow redirects, and is not retried. A delivery failure never blocks the short-link redirect.
