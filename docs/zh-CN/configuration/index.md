---
title: Sink 配置
description: 配置 Sink 的构建、运行时、公开变量、身份认证、分析、重定向、AI、备份和部署设置。
---

# Sink 配置

环境变量映射到 `nuxt.config.ts` 中的默认值。

| 类别         | 变量                                   | Cloudflare Workers 配置位置                       |
| ------------ | -------------------------------------- | ------------------------------------------------- |
| 仅构建时     | `NUXT_API_CORS`                        | **Build variables and secrets**                   |
| 构建和运行时 | `NUXT_PUBLIC_*`                        | 构建变量与 Worker 运行时变量均需配置              |
| 运行时       | 映射到 `runtimeConfig` 的其他 `NUXT_*` | Worker **Variables and Secrets**                  |
| 仅部署时     | `DEPLOY_*`                             | 构建环境或本地 `.env`；禁止设为 Worker 运行时变量 |

`DEPLOY_*` 用于生成 CLI 部署与远程迁移所需的 `wrangler.deploy.jsonc`，不是应用设置。

## 公开设置

| 变量                              | 默认值  | 说明                                                                                                                           |
| --------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `NUXT_PUBLIC_PREVIEW_MODE`        | 空/禁用 | 启用演示模式；创建的链接 5 分钟后过期，且不能编辑或删除。                                                                      |
| `NUXT_PUBLIC_SLUG_DEFAULT_LENGTH` | `6`     | 自动生成 Slug 的默认长度。                                                                                                     |
| `NUXT_PUBLIC_KV_BATCH_LIMIT`      | `50`    | 链接导入和导出的分页大小；每次导入上限为其一半。尽管沿用历史变量名，权威链接操作使用 D1；KV 是写穿式缓存及迁移前的旧数据来源。 |

使用 Workers 时，公开变量必须同时配置在构建和运行时环境中。

## 身份认证与 Access

| 变量                         | 默认值                | 说明                                                                                  |
| ---------------------------- | --------------------- | ------------------------------------------------------------------------------------- |
| `NUXT_SITE_TOKEN`            | 未设置时生成随机 UUID | 仪表盘与 API 的 Bearer Token。生产环境应配置至少 8 个字符的安全值，并避免可预测令牌。 |
| `NUXT_CF_ACCESS_TEAM_DOMAIN` | 空                    | Access 团队域名，例如 `https://team.cloudflareaccess.com`。                           |
| `NUXT_CF_ACCESS_AUD`         | 空                    | Access 应用 Audience 标签。仅当两项均配置时启用 Access 认证。                         |

详见 [Cloudflare Access 身份认证](./cloudflare-access)。

## 重定向与链接

| 变量                        | 默认值  | 说明                                                                    |
| --------------------------- | ------- | ----------------------------------------------------------------------- |
| `NUXT_REDIRECT_STATUS_CODE` | `301`   | 重定向状态码，也支持 `302`、`307` 与 `308`。                            |
| `NUXT_LINK_CACHE_TTL`       | `60`    | 短链接读取的 KV 缓存 TTL（秒）；更长的值可能延迟缓存更新。              |
| `NUXT_REDIRECT_WITH_QUERY`  | `false` | 是否默认附加请求查询参数；单个链接可覆盖。                              |
| `NUXT_REDIRECT_NO_STORE`    | `false` | 为重定向启用 no-store，使修改更快地在浏览器和 CDN 生效。                |
| `NUXT_HOME_URL`             | 空      | 根页面的重定向目标；空值使用 Sink 介绍页。                              |
| `NUXT_CASE_SENSITIVE`       | `false` | 为 `true` 时保留 Slug 大小写，否则统一转为小写。                        |
| `NUXT_SAFE_BROWSING_DOH`    | 空      | 不安全域名检测的 DoH 地址；若域名解析到 `0.0.0.0`，链接会标记为不安全。 |
| `NUXT_NOT_FOUND_REDIRECT`   | 空      | Slug 不存在时的可选目标；空值使用 Sink 404 页面。                       |

安全浏览可以使用 Cloudflare Family DNS（`https://family.cloudflare-dns.com/dns-query`）或自定义 Cloudflare Zero Trust Gateway DoH 地址。

## 访问分析

| 变量                          | 默认值  | 说明                                                      |
| ----------------------------- | ------- | --------------------------------------------------------- |
| `NUXT_CF_ACCOUNT_ID`          | 空      | 查询 Analytics Engine 的 Cloudflare 账户 ID。             |
| `NUXT_CF_API_TOKEN`           | 空      | 具有 Account Analytics 权限的 API Token。                 |
| `NUXT_DATASET`                | `sink`  | Analytics Engine 数据集，需与部署绑定保持一致。           |
| `NUXT_LIST_QUERY_LIMIT`       | `500`   | 指标列表最大结果数。                                      |
| `NUXT_DISABLE_BOT_ACCESS_LOG` | `false` | 为 `true` 时从访问统计和点击 Webhook 中排除已识别机器人。 |

## Workers AI

| 变量                | 默认值                       | 说明                                                     |
| ------------------- | ---------------------------- | -------------------------------------------------------- |
| `NUXT_AI_MODEL`     | `@cf/qwen/qwen3-30b-a3b-fp8` | 用于生成 Slug 与 OpenGraph 数据的 Workers AI 模型。      |
| `NUXT_AI_PROMPT`    | 内置提示词                   | 自定义 Slug 提示词，应保留 `{slugRegex}` 占位符。        |
| `NUXT_AI_OG_PROMPT` | 内置提示词                   | 自定义 OpenGraph 标题与描述提示词；Sink 会附加首选语言。 |

默认 Slug 提示词：

```txt
You are a URL shortening assistant, please shorten the URL provided by the user into a SLUG. The SLUG information should be derived from the URL and page content (if provided). Do not make any assumptions beyond the given information. A SLUG is human-readable and should not exceed three words and can be validated using regular expressions {slugRegex} . Only the best one is returned, the format must be JSON reference {"slug": "example-slug"}
```

默认 OpenGraph 提示词：

```txt
You are an OpenGraph metadata assistant. Please summarize the page content provided by the user into a perfect title and description for an OpenGraph preview. Do not make any assumptions beyond the given information. Only the best one is returned, the format must be JSON reference {"title": "Example Title", "description": "Example description that summarizes the page accurately."}
```

## 备份、Webhook 与 CORS

| 变量                       | 默认值           | 说明                                                                                                     |
| -------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------- |
| `NUXT_DISABLE_AUTO_BACKUP` | `false`          | 为 `true` 时禁用每日 KV 到 R2 自动备份。备份在 UTC 00:00 运行，路径为 `backups/links-{timestamp}.json`。 |
| `NUXT_WEBHOOK_URL`         | 空               | 接收尽力投递点击 Webhook 的 HTTP(S) 地址；空值禁用。                                                     |
| `NUXT_WEBHOOK_SECRET`      | 空               | 可选的 `whsec_` 签名密钥，详见 [Webhook](./webhooks)。                                                   |
| `NUXT_API_CORS`            | 构建时为 `false` | 构建时设为 `true` 可为 `/api/**` 启用 CORS。                                                             |

自动备份需要 `R2` 绑定。该功能用于 KV 数据兼容性备份；D1 仍是链接的权威存储。

## 部署设置

| 变量                       | 默认值         | 说明                          |
| -------------------------- | -------------- | ----------------------------- |
| `DEPLOY_D1_DATABASE_ID`    | CLI 部署时必填 | D1 数据库 ID。                |
| `DEPLOY_KV_NAMESPACE_ID`   | CLI 部署时必填 | KV 命名空间 ID。              |
| `DEPLOY_D1_DATABASE_NAME`  | `sink`         | D1 数据库名称。               |
| `DEPLOY_R2_BUCKET_NAME`    | `sink`         | 已存在的 R2 存储桶名称。      |
| `DEPLOY_ANALYTICS_DATASET` | `sink`         | Analytics Engine 数据集名称。 |
