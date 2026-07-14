---
title: Getting Started
description: Prepare Cloudflare resources, deploy Sink, and create your first short link.
---

# Getting Started

Sink is a self-hosted link shortener and analytics application for Cloudflare.

## 1. Fork Sink

Create a [fork of the Sink repository](https://github.com/miantiao-me/Sink/fork) in your GitHub account.

## 2. Choose a deployment target

- [Cloudflare Workers](/deployment/workers) is the recommended Git-integrated option.
- [Cloudflare Pages](/deployment/pages) is also supported.

## 3. Prepare Cloudflare resources

| Binding     | Status      | Purpose                                         |
| ----------- | ----------- | ----------------------------------------------- |
| `DB` (D1)   | Required    | Stores links and related data.                  |
| `KV`        | Required    | Speeds up link redirects.                       |
| `ANALYTICS` | Recommended | Records visits for analytics and logs.          |
| `R2`        | Optional    | Recommended for backups and OpenGraph images.   |
| `AI`        | Optional    | Recommended for AI-assisted slugs and metadata. |

For the complete Sink experience, enable all five resources.

## 4. Configure the deployment

Follow the guide for your chosen target to connect the fork, add the resources, and configure a stable, strong `NUXT_SITE_TOKEN`. Review the [configuration reference](/configuration/) for analytics and other features.

## 5. Deploy

Start the Git deployment from Cloudflare and wait for it to finish.

## 6. Create your first link

Open `/dashboard` on your deployed hostname, sign in with `NUXT_SITE_TOKEN`, and create a link.
