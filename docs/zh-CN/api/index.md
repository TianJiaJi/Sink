---
title: REST API 参考
description: 查找 Sink 自动生成的 OpenAPI 文档、身份认证和 CORS 要求，以及端点分类索引。
---

# REST API 参考

## OpenAPI 文档

每个 Sink 实例都会在以下位置发布自动生成的 API 描述和交互式参考：

- `https://your-domain/_docs/openapi.json` — OpenAPI JSON
- `https://your-domain/_docs/scalar` — Scalar UI
- `https://your-domain/_docs/swagger` — Swagger UI

请使用自己的域名，因为不同部署版本的路由可能不同。公开演示位于 [https://sink.cool/_docs/scalar](https://sink.cool/_docs/scalar)。

## 身份认证

将配置的站点令牌作为 Bearer 凭据发送：

```http
Authorization: Bearer YOUR_SITE_TOKEN
```

启用 [Cloudflare Access](/zh-CN/configuration/cloudflare-access) 后，受支持的浏览器和服务令牌请求也可以改用经过验证的 Access 应用 JWT 进行身份认证。

## CORS

API CORS 需要在构建时选择启用，并应用于 `/api/**`。详见[配置参考](/zh-CN/configuration/#可选配置)。启用 CORS 不会取消身份认证要求。

## 端点分类索引

请使用自动生成的 OpenAPI 文档查看方法、参数、请求体和响应。

| 分类           | 路由与用途                                                                                                   |
| -------------- | ------------------------------------------------------------------------------------------------------------ |
| 链接管理       | `/api/link/create`、`edit`、`upsert`、`delete`、`query`、`search`、`list`、`check` 和 `tags`                 |
| 可移植性       | `/api/link/import` 和 `/api/link/export`；详见[导入/导出](/zh-CN/features/import-export)                     |
| 存储数据迁移   | `/api/link/migration/status` 和 `/api/link/migration/run`；详见 [KV 到 D1 数据迁移](/zh-CN/storage/kv-to-d1) |
| AI 辅助        | `/api/link/ai` 和 `/api/link/og-ai`；详见 [Workers AI](/zh-CN/features/ai)                                   |
| 访问分析与日志 | `/api/stats/**` 和 `/api/logs/**`；详见[访问分析与近实时视图](/zh-CN/features/analytics)                     |
| 实用工具       | `/api/verify`、`/api/location`、`/api/upload/image` 和 `/api/backup`                                         |
