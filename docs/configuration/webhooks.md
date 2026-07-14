---
title: Click Webhooks
description: Enable click webhooks and verify their HMAC signatures, delivery behavior, payload, and privacy boundaries.
---

# Click Webhooks

Click webhooks are optional. Configure their URL and optional signing secret as described in [configuration](./). Sink sends a best-effort event for each click included in analytics; bot clicks excluded from access logging are excluded here too.

## Signing

The secret must start with `whsec_`; its suffix is a Base64-encoded HMAC key of 24–64 bytes. One way to create a 32-byte key is:

```sh
printf 'whsec_%s\n' "$(openssl rand -base64 32)"
```

Every request includes `webhook-id` and `webhook-timestamp`. Signed requests also include `webhook-signature: v1,<base64>`, calculated with HMAC-SHA256 over:

```txt
<webhook-id>.<webhook-timestamp>.<raw-body>
```

Verify the raw body before parsing JSON. An invalid non-empty secret fails delivery rather than falling back to unsigned delivery.

## Payload

The Dub-style `link.clicked` event contains an event ID and timestamp, the link ID and slug, and click attributes such as country, region, city, device, browser, operating system, and referrer.

It excludes IP addresses, coordinates, full user agents, query parameters, passwords, and destination URLs.

## Delivery limits

- Delivery is asynchronous and never blocks the redirect.
- The receiver must return a 2xx response within 10 seconds.
- Redirect responses are not followed.
- Failed deliveries are not retried.
- HTTPS is strongly recommended, especially for unsigned delivery.
