---
title: Troubleshooting
description: Diagnose common Sink deployment, authentication, analytics, redirect, import, backup, and optional-feature failures.
---

# Troubleshooting

## I cannot create or resolve links

Confirm that D1 and KV are bound with the exact names `DB` and `KV`, then redeploy the latest `master` branch so required D1 updates are applied.

If this is an upgrade from an older instance that stored links only in KV, open **Dashboard → Links** to start or continue the [KV-to-D1 migration](/storage/kv-to-d1).

<details>
  <summary><b>KV binding screenshot</b></summary>
  <img alt="KV binding settings in Cloudflare" src="./images/faqs-kv.png">
</details>

## I cannot sign in or call the API

Check that the supplied bearer value exactly matches `NUXT_SITE_TOKEN`. If using Cloudflare Access, verify that both Access settings are present, the AUD belongs to the application, and the signed application cookie reaches `/api`. Strict Access policies also require non-browser clients to pass the edge policy.

## Analytics is empty

Confirm all of the following:

1. Analytics Engine is enabled and bound as `ANALYTICS`.
2. The configured dataset name matches the bound dataset.
3. The account ID belongs to the deployment account.
4. The API token has Account Analytics access.
5. Bot filtering or the selected dashboard filters are not excluding the traffic.

<details>
  <summary><b>Analytics Engine binding screenshot</b></summary>
  <img alt="Analytics Engine binding settings in Cloudflare" src="./images/faqs-Analytics_engine.png">
</details>

## Realtime events arrive in bursts or appear delayed

This is expected within bounds: the dashboard polls every 10 seconds and replays queued events at about one per second. Verify that the view is not paused, the tab is visible, and analytics queries are working. It is not an SSE or WebSocket stream.

## Custom slugs do not preserve uppercase characters

Enable the case-sensitive setting and redeploy. It affects custom slug normalization; generated random slugs intentionally remain lowercase. Existing slugs are not renamed automatically.

## A cloaked destination is blank or refuses to load

The destination likely blocks iframe embedding through `X-Frame-Options` or `Content-Security-Policy: frame-ancestors`. Disable cloaking or change the destination policy if you control it. OAuth and payment pages commonly reject framing.

## Safe browsing did not change a link's unsafe flag

Automatic detection runs only when a create or relevant edit request omits `unsafe`. An explicitly supplied `true` or `false` wins. Also verify the DoH URL and note that lookup errors fail open.

## Import skips or rejects records

Check the per-item result. Active slug conflicts are skipped, while malformed records fail validation or processing. Expired records are allowed. Keep each request within half the configured export batch size and use portable password hashes rather than dashboard-masked placeholders.

## A backup was not created

Verify that `R2` is bound. If this is a legacy KV-only upgrade, complete the [KV-to-D1 migration](/storage/kv-to-d1) first. For scheduled backups, confirm the automatic-backup setting and the Workers cron. Pages has no automatic scheduled trigger in this repository; use the dashboard's manual backup action instead.

## Redirect changes appear stale

KV and browser or CDN caching can delay visible changes. Review the link cache lifetime and redirect no-store setting in [configuration](/configuration/#advanced-defaults), then confirm the current link in the dashboard.
