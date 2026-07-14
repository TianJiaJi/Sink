---
title: Deploy on Cloudflare Pages
description: Deploy Sink on Cloudflare Pages through Git integration and dashboard-managed bindings.
---

# Deploy on Cloudflare Pages

## 1. Create the Pages project

Create a [fork of the Sink repository](https://github.com/miantiao-me/Sink/fork). In the Cloudflare dashboard, create a Pages application, import the fork, and configure:

- **Production branch:** `master`
- **Framework preset:** Nuxt
- **Build command:** `pnpm build`
- **Build output directory:** `dist`

Create the project so its settings become available. If an initial deployment starts before configuration is complete, cancel it.

## 2. Prepare resources and bindings

Create the resources you want to use, then add them under **Settings → Bindings**:

| Binding     | Status      | Purpose                                         |
| ----------- | ----------- | ----------------------------------------------- |
| `DB` (D1)   | Required    | Stores links and related data.                  |
| `KV`        | Required    | Speeds up link redirects.                       |
| `ANALYTICS` | Recommended | Records visits for analytics and logs.          |
| `R2`        | Optional    | Recommended for backups and OpenGraph images.   |
| `AI`        | Optional    | Recommended for AI-assisted slugs and metadata. |

For the complete Sink experience, enable all five resources. Add the `nodejs_compat` compatibility flag to both production and preview environments.

## 3. Configure variables and secrets

Under **Settings → Variables and Secrets**, add the following values. Pages makes this single set available to both the build and Functions runtime.

| Variable                 | Status      | Type             | Value or purpose                                                    |
| ------------------------ | ----------- | ---------------- | ------------------------------------------------------------------- |
| `DEPLOY_D1_DATABASE_ID`  | Required    | Variable         | Your D1 database ID.                                                |
| `DEPLOY_KV_NAMESPACE_ID` | Required    | Variable         | Your KV namespace ID.                                               |
| `NUXT_SITE_TOKEN`        | Required    | Encrypted secret | A strong, stable token for dashboard and Bearer authentication.     |
| `NUXT_CF_ACCOUNT_ID`     | Recommended | Variable         | Your Cloudflare account ID, used by dashboard analytics.            |
| `NUXT_CF_API_TOKEN`      | Recommended | Encrypted secret | An API token with Account Analytics access.                         |
| `NUXT_PUBLIC_*`          | Optional    | Variable         | Configure only when overriding a default; rebuild after any change. |

See the [configuration reference](/configuration/) for optional settings. Configure R2 only through **Settings → Bindings**.

## 4. Deploy

Start a deployment from the `master` branch and wait for it to finish.

After the first deployment, open `/dashboard`, sign in, and create a link.

Pages supports manual [R2 link snapshots](/features/backups), but this repository does not configure a Pages scheduled trigger.
