---
title: Analytics and Realtime
description: Enable Sink analytics, inspect traffic metrics, understand realtime polling and replay, exclude bots, and export CSV data.
---

# Analytics and Realtime

Analytics is optional. It requires an `ANALYTICS` binding plus Cloudflare account credentials that can query Analytics Engine. The configured dataset name must match the bound dataset.

## What Sink records

Successful link visits can feed counters, time-series views, metrics, heatmaps, recent events, and locations. Available filters include link, time range, country, browser, operating system, device, and referrer. Sink uses sampled Analytics Engine results, so large-volume values can be estimates rather than transaction records.

Detected bot traffic can be excluded from both access statistics and [click webhooks](/configuration/webhooks).

## Realtime dashboard

The realtime view is intentionally pseudo-live. The dashboard polls analytics every 10 seconds, discovers new access events, and replays queued events in the client at approximately one event per second. It does **not** use Server-Sent Events or WebSockets.

The queues are bounded. Pausing stops polling, event replay, and WebGL movement; hiding the page pauses replay until it becomes visible again. Realtime should be treated as an operational visualization, not a lossless event stream.

## Export

Use the dashboard or authenticated stats export route to download filtered analytics as CSV. The export contains aggregate columns for slug, URL, viewers, views, and referrers. Link JSON export is a separate feature described in [Import and Export](./import-export).

See [configuration](/configuration/#recommended-configuration) for credentials, dataset, list-limit, and bot-filter settings.
