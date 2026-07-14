---
title: Workers AI
description: Enable optional Workers AI assistance for slug suggestions and OpenGraph metadata generation in Sink.
---

# Workers AI

Sink can use a Cloudflare Workers AI binding to suggest slugs and generate OpenGraph titles and descriptions. It is optional and does not affect normal link creation or redirects.

## Enable AI assistance

Bind the Workers AI catalog as `AI`. You may then select a model or replace the prompts through [configuration](/configuration/#advanced-defaults). A custom slug prompt must retain the `{slugRegex}` placeholder so Sink can provide the instance's slug rules.

If the binding is unavailable, AI endpoints return `501 AI not enabled`. Do not make integrations depend on AI unless every deployment environment has the binding.

## Behavior and limits

For a requested URL, Sink attempts to obtain page content and asks the configured model for structured output. The slug result is normalized according to custom-slug case settings. Metadata generation accepts a preferred locale.

If model execution or output parsing fails after the AI request begins, Sink returns a deterministic fallback based on the URL. Suggestions can still conflict with existing slugs or contain unsuitable wording; review them before saving.

Page content and the destination URL can be sent to Cloudflare Workers AI. Consider the sensitivity and policy of target pages before using this feature.
