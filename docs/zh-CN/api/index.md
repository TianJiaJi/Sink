---
title: Sink REST API
description: 认证并使用 Sink 的链接、迁移、分析、位置、上传、备份与健康检查 API 端点。
---

# Sink REST API

每个 Sink 实例都会发布自己的 OpenAPI 文档：

- `https://your-domain/_docs/openapi.json` — 机器可读的 OpenAPI JSON
- `https://your-domain/_docs/scalar` — Scalar 交互式参考
- `https://your-domain/_docs/swagger` — Swagger UI

公开演示明确位于 [https://sink.cool/_docs/scalar](https://sink.cool/_docs/scalar)。该 Schema 描述演示实例；自托管实例请换成自己的域名。

## 身份认证

API 端点要求在 `Authorization` Header 中携带站点令牌：

```http
Authorization: Bearer YOUR_SITE_TOKEN
```

其值是 `NUXT_SITE_TOKEN`。配置 [Cloudflare Access](/zh-CN/configuration/cloudflare-access) 后，已登录仪表盘的浏览器请求也可以使用 Cloudflare 提供的已签名 Access 应用令牌。Sink 会校验签名、签发者、受众和有效期。

## 端点

### 链接

| 方法   | 端点               | 说明                                                                    |
| ------ | ------------------ | ----------------------------------------------------------------------- |
| `POST` | `/api/link/create` | 创建短链接。                                                            |
| `PUT`  | `/api/link/edit`   | 更新现有链接。                                                          |
| `POST` | `/api/link/upsert` | Slug 已存在时返回原链接，否则创建新链接。                               |
| `POST` | `/api/link/delete` | 删除链接。                                                              |
| `GET`  | `/api/link/query`  | 按 Slug 获取一个链接。                                                  |
| `GET`  | `/api/link/search` | 搜索链接。                                                              |
| `GET`  | `/api/link/list`   | 使用游标分页列出链接。                                                  |
| `GET`  | `/api/link/export` | 以 JSON 导出一页链接；持续传递 `cursor`，直到 `list_complete` 为 true。 |
| `POST` | `/api/link/import` | 导入已校验批次；已有活动 Slug 会跳过。                                  |
| `POST` | `/api/link/check`  | 检查最多 10 个已存链接的目标可用性，超时范围为 1–30 秒。                |
| `GET`  | `/api/link/ai`     | 生成 AI Slug 建议。                                                     |
| `GET`  | `/api/link/og-ai`  | 生成 AI OpenGraph 元数据。                                              |

### 分析与日志

| 方法  | 端点                  | 说明                                                             |
| ----- | --------------------- | ---------------------------------------------------------------- |
| `GET` | `/api/stats/counters` | 获取分析计数器。                                                 |
| `GET` | `/api/stats/metrics`  | 按维度获取详细指标。                                             |
| `GET` | `/api/stats/views`    | 获取时序访问量。                                                 |
| `GET` | `/api/stats/heatmap`  | 获取热力图数据。                                                 |
| `GET` | `/api/stats/export`   | 将访问分析导出为 CSV；这是动态 stats action 路由实际公开的 URL。 |
| `GET` | `/api/logs/events`    | 获取近期事件日志。                                               |
| `GET` | `/api/logs/locations` | 获取近期访问位置。                                               |

### 迁移与工具

| 方法   | 端点                         | 说明                                                                                                  |
| ------ | ---------------------------- | ----------------------------------------------------------------------------------------------------- |
| `GET`  | `/api/link/migration/status` | 检查 KV 到 D1 的迁移标记并返回标记内容。                                                              |
| `POST` | `/api/link/migration/run`    | 将一页受限数据（最多 40 条 KV 记录）复制到 D1；携带响应中的不透明游标继续，直到 `completed` 为 true。 |
| `GET`  | `/api/verify`                | 验证凭据，并报告 `site-token`、`access-user` 或 `access-service`。                                    |
| `GET`  | `/api/location`              | 返回 Cloudflare 请求元数据中的纬度和经度。                                                            |
| `POST` | `/api/upload/image`          | 将 OpenGraph 图片上传到 R2。                                                                          |
| `POST` | `/api/backup`                | 手动触发 KV 兼容性备份到 R2。                                                                         |

D1 是权威存储。KV 是写穿式读取缓存，并在写入迁移标记前临时提供旧链接。迁移不会覆盖已有 D1 行；`force=true` 只会重新扫描 KV，不会改变这条规则。如果某一页出现失败，该次迁移运行会被丢弃；解决问题后需开始新的运行。

## 创建短链接

```http
POST /api/link/create
Authorization: Bearer SinkCool
Content-Type: application/json

{
  "url": "https://github.com/miantiao-me/Sink",
  "slug": "sink",
  "comment": "GitHub repository",
  "expiration": 1767225599,
  "apple": "https://apps.apple.com/app/id6745417598",
  "google": "https://play.google.com/store/apps/details?id=com.example",
  "geo": { "US": "https://example.com/us" },
  "title": "Sink - Link Shortener",
  "description": "A simple, speedy, secure link shortener",
  "image": "/_assets/images/sink/cover.webp",
  "password": "correct-horse-battery-staple",
  "unsafe": false,
  "redirectWithQuery": true
}
```

| 字段                              | 类型      | 必填 | 说明                               |
| --------------------------------- | --------- | ---- | ---------------------------------- |
| `url`                             | `string`  | 是   | 目标 URL，最多 2048 个字符。       |
| `slug`                            | `string`  | 否   | 自定义 Slug；省略时自动生成。      |
| `comment`                         | `string`  | 否   | 内部备注。                         |
| `expiration`                      | `number`  | 否   | 未来的 Unix 秒级时间戳。           |
| `apple` / `google`                | `string`  | 否   | 特定设备的目标 URL。               |
| `geo`                             | `object`  | 否   | 国家/地区代码到 URL 的路由映射。   |
| `title` / `description` / `image` | `string`  | 否   | OpenGraph 元数据。                 |
| `cloaking`                        | `boolean` | 否   | 在 iframe 中加载目标并保留短网址。 |
| `redirectWithQuery`               | `boolean` | 否   | 单链接查询参数转发覆盖值。         |
| `password`                        | `string`  | 否   | 密码保护；以哈希形式存储。         |
| `unsafe`                          | `boolean` | 否   | 要求显示不安全链接确认页。         |

地域路由使用 Cloudflare 的两字母国家/地区代码。设备路由优先于默认或地域目标。程序客户端访问受密码保护链接时可传 `x-link-password`，确认不安全目标后可传 `x-link-confirm: true`。

## 导出访问分析

```http
GET /api/stats/export?startAt=1717200000&endAt=1719791999&slug=sink
Authorization: Bearer SinkCool
```

响应为 `text/csv`，包含 `slug`、`url`、`viewer`、`views` 与 `referer` 列。可以传入分析视图使用的时间、Slug、国家/地区、浏览器和设备等查询参数。

## 导入与导出行为

链接导出分页大小为 `NUXT_PUBLIC_KV_BATCH_LIMIT`（默认 50）；每次导入接受其一半（默认 25）。该限制用于兼容性与控制请求成本，并不表示每条链接固定执行两次 KV 操作。链接创建和重复检测是 D1 权威操作，随后进行尽力而为的 KV 写穿缓存更新。已过期的导入会被拒绝，重复项会跳过。导出会保留 Sink 可迁移存储格式中的密码哈希，以便原样导入；仪表盘显示的遮盖值不能作为明文密码导入。

## CORS

构建时设置 `NUXT_API_CORS=true`，即可为 `/api/**` 启用 CORS。
