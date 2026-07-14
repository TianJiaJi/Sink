---
title: REST API
description: Find Sink's generated OpenAPI documents, authentication and CORS requirements, and endpoint category index.
---

# REST API

## OpenAPI documents

Every Sink instance publishes its generated API description and interactive references at:

- `https://your-domain/_docs/openapi.json` — OpenAPI JSON
- `https://your-domain/_docs/scalar` — Scalar UI
- `https://your-domain/_docs/swagger` — Swagger UI

Use your own hostname because routes can differ by deployed version. The public demo is available at [https://sink.cool/_docs/scalar](https://sink.cool/_docs/scalar).

## Authentication

Send the configured site token as a bearer credential:

```http
Authorization: Bearer YOUR_SITE_TOKEN
```

When [Cloudflare Access](/configuration/cloudflare-access) is enabled, supported browser and service-token requests can instead authenticate with a verified Access application JWT.

## CORS

API CORS is opt-in at build time and applies to `/api/**`. See [configuration](/configuration/#optional-configuration). Enabling CORS does not remove authentication requirements.

## Endpoint category index

Use the generated OpenAPI document for methods, parameters, request bodies, and responses.

| Category           | Routes and purpose                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------- |
| Link management    | `/api/link/create`, `edit`, `upsert`, `delete`, `query`, `search`, `list`, `check`, and `tags`          |
| Portability        | `/api/link/import` and `/api/link/export`; see [Import and Export](/features/import-export)             |
| Storage migration  | `/api/link/migration/status` and `/api/link/migration/run`; see [KV-to-D1 Migration](/storage/kv-to-d1) |
| AI assistance      | `/api/link/ai` and `/api/link/og-ai`; see [Workers AI](/features/ai)                                    |
| Analytics and logs | `/api/stats/**` and `/api/logs/**`; see [Analytics and Realtime](/features/analytics)                   |
| Utilities          | `/api/verify`, `/api/location`, `/api/upload/image`, and `/api/backup`                                  |
