---
title: 配置参考
description: Sink 所有受支持环境变量的权威默认值、放置规则和启用条件。
---

# 配置参考

本页列出 Sink 支持的所有环境变量。环境变量值都是字符串；除非另有说明，布尔开关均使用 `true`。

## 范围

| 范围          | 含义                                               | Workers 放置位置                               | Pages 放置位置                                                   |
| ------------- | -------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------- |
| 构建          | 在生成部署配置或构建应用时使用。                   | Workers Builds 变量与密钥。                    | **Settings → Variables and Secrets**；同一套设置也供运行时使用。 |
| 运行时        | 由已部署应用读取。密钥必须使用平台的加密密钥存储。 | Worker **Settings → Variables and Secrets**。  | **Settings → Variables and Secrets**；同一套设置也供构建使用。   |
| 构建 + 运行时 | 构建时由预渲染 UI 使用，部署后由应用使用。         | 在 Workers Builds 和 Worker 设置中配置相同值。 | 只需在 **Settings → Variables and Secrets** 中配置一次。         |

修改构建变量或公开变量后，需要重新构建部署。

## Cloudflare 绑定

| 绑定        | 要求               | 用途                                                                                           |
| ----------- | ------------------ | ---------------------------------------------------------------------------------------------- |
| `DB`        | 必须               | D1 权威链接存储。                                                                              |
| `KV`        | 必须               | 链接读取缓存和迁移兼容。                                                                       |
| `ANALYTICS` | 推荐               | 写入访问分析事件。使用仪表盘访问分析时应启用，并使数据集与 `NUXT_DATASET` 一致。               |
| `R2`        | 可选，备份功能推荐 | 存储快照。Workers Builds 可通过 `DEPLOY_R2_BUCKET_NAME` 生成此绑定；Pages 必须在仪表盘中添加。 |
| `AI`        | 可选，AI 功能推荐  | Workers AI Slug 和元数据生成。                                                                 |
| `ASSETS`    | 自动               | 静态应用资源；部署配置会自动提供。                                                             |

## 必须配置

| 变量                     | 范围       | 放置位置                                        | 要求                                                                                                     |
| ------------------------ | ---------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `NUXT_SITE_TOKEN`        | 运行时密钥 | 加密的 Worker 运行时密钥或加密的 Pages 统一密钥 | 必须显式设置高强度且稳定的值，用于仪表盘和 Bearer 身份认证。不要依赖随机回退值，它可能在每次构建时变化。 |
| `DEPLOY_D1_DATABASE_ID`  | 构建       | Workers Builds 变量或 Pages 统一变量            | 用于生成部署配置的现有 D1 数据库 ID。                                                                    |
| `DEPLOY_KV_NAMESPACE_ID` | 构建       | Workers Builds 变量或 Pages 统一变量            | 用作生产和预览绑定的现有 KV 命名空间 ID。                                                                |

## 推荐配置

| 变量                 | 范围       | 放置位置                                        | 用途                                                                  |
| -------------------- | ---------- | ----------------------------------------------- | --------------------------------------------------------------------- |
| `NUXT_CF_ACCOUNT_ID` | 运行时     | Worker 运行时变量或 Pages 统一变量              | 访问分析仪表盘查询的 Cloudflare 账户。                                |
| `NUXT_CF_API_TOKEN`  | 运行时密钥 | 加密的 Worker 运行时密钥或加密的 Pages 统一密钥 | 与 `NUXT_CF_ACCOUNT_ID` 配合使用、具有 Account Analytics 权限的令牌。 |

同时推荐配置 `ANALYTICS` 绑定。使用[链接备份](/zh-CN/features/backups)时添加 `R2`，使用 [Workers AI](/zh-CN/features/ai)时添加 `AI`。

## 构建 + 运行时公开覆盖值

仅在覆盖默认值时配置这些变量。Workers 需要在 Workers Builds 和 Worker 运行时设置中配置相同值；Pages 只需在统一的 **Variables and Secrets** 中配置一次。每次修改后都需要重新构建。

| 变量                              | 范围          | 放置位置                                    | 默认值 | 用途                                           |
| --------------------------------- | ------------- | ------------------------------------------- | ------ | ---------------------------------------------- |
| `NUXT_PUBLIC_PREVIEW_MODE`        | 构建 + 运行时 | Workers 构建与运行时变量，或 Pages 统一变量 | 空     | `true` 会启用预览模式。                        |
| `NUXT_PUBLIC_SLUG_DEFAULT_LENGTH` | 构建 + 运行时 | Workers 构建与运行时变量，或 Pages 统一变量 | `6`    | 自动生成随机 Slug 时使用的长度。               |
| `NUXT_PUBLIC_KV_BATCH_LIMIT`      | 构建 + 运行时 | Workers 构建与运行时变量，或 Pages 统一变量 | `50`   | 导出分页大小；每个导入请求最多接受该值的一半。 |

## 可选配置

### 可选构建配置

#### Workers Builds 和 Pages

| 变量            | 放置位置                             | 启用条件                                                |
| --------------- | ------------------------------------ | ------------------------------------------------------- |
| `NUXT_API_CORS` | Workers Builds 变量或 Pages 统一变量 | 值严格等于 `true` 时，为 `/api/**` 启用 CORS 路由规则。 |

#### 仅 Workers Builds

| 变量                    | 放置位置          | 启用条件                                                                         |
| ----------------------- | ----------------- | -------------------------------------------------------------------------------- |
| `DEPLOY_R2_BUCKET_NAME` | 仅 Workers Builds | 设置为现有存储桶名称时，在生成的 Worker 配置中包含 `R2` 绑定。备份功能推荐配置。 |

Pages 不使用 `DEPLOY_R2_BUCKET_NAME`。请改为在 Cloudflare 仪表盘中为 Pages 项目添加 `R2` 绑定。

### 可选运行时配置

| 变量                         | 范围       | 放置位置                                        | 启用条件                                                           |
| ---------------------------- | ---------- | ----------------------------------------------- | ------------------------------------------------------------------ |
| `NUXT_HOME_URL`              | 运行时     | Worker 运行时变量或 Pages 统一变量              | 非空 URL 会重定向 `/`；空值提供 Sink 首页。                        |
| `NUXT_NOT_FOUND_REDIRECT`    | 运行时     | Worker 运行时变量或 Pages 统一变量              | 非空路径或 URL 会接收缺失链接的重定向。                            |
| `NUXT_CF_ACCESS_TEAM_DOMAIN` | 运行时     | Worker 运行时变量或 Pages 统一变量              | 它与 `NUXT_CF_ACCESS_AUD` 均已设置时启用 Cloudflare Access。       |
| `NUXT_CF_ACCESS_AUD`         | 运行时     | Worker 运行时变量或 Pages 统一变量              | 它与团队域名均已设置时启用 Cloudflare Access。                     |
| `NUXT_SAFE_BROWSING_DOH`     | 运行时     | Worker 运行时变量或 Pages 统一变量              | 非空 DNS-over-HTTPS URL 会在未提供 `unsafe` 时启用不安全域名检查。 |
| `NUXT_WEBHOOK_URL`           | 运行时     | Worker 运行时变量或 Pages 统一变量              | 非空的 HTTP(S) URL 会启用点击事件投递。                            |
| `NUXT_WEBHOOK_SECRET`        | 运行时密钥 | 加密的 Worker 运行时密钥或加密的 Pages 统一密钥 | 有效的 `whsec_` 值会为 Webhook 请求签名；空值发送未签名请求。      |

安全浏览可以使用 Cloudflare Family DNS（`https://family.cloudflare-dns.com/dns-query`）或自定义 Cloudflare Zero Trust Gateway DoH 端点。详见 [Cloudflare Access](./cloudflare-access)、[链接功能](/zh-CN/features/links)和[点击 Webhook](./webhooks)。

## 高级默认值

这些设置已有应用默认值，通常不需要配置。

| 变量                          | 范围   | 放置位置                         | 默认值                       | 用途                                                              |
| ----------------------------- | ------ | -------------------------------- | ---------------------------- | ----------------------------------------------------------------- |
| `NUXT_REDIRECT_STATUS_CODE`   | 运行时 | Worker 运行时或 Pages 统一变量   | `301`                        | 普通重定向状态码；还支持 `302`、`307` 和 `308`。                  |
| `NUXT_LINK_CACHE_TTL`         | 运行时 | Worker 运行时或 Pages 统一变量   | `60`                         | KV 读取缓存生命周期，单位为秒。                                   |
| `NUXT_REDIRECT_WITH_QUERY`    | 运行时 | Worker 运行时或 Pages 统一变量   | `false`                      | 为 `true` 时全局转发传入的查询参数；单个链接可以覆盖。            |
| `NUXT_REDIRECT_NO_STORE`      | 运行时 | Worker 运行时或 Pages 统一变量   | `false`                      | 为 `true` 时为普通重定向添加 no-store 行为。                      |
| `NUXT_CASE_SENSITIVE`         | 运行时 | Worker 运行时或 Pages 统一变量   | `false`                      | 为 `true` 时保留自定义 Slug 大小写并允许只存在大小写差异的 Slug。 |
| `NUXT_DATASET`                | 运行时 | Worker 运行时或 Pages 统一变量   | `sink`                       | 仪表盘查询的访问分析数据集；必须与 `ANALYTICS` 绑定一致。         |
| `NUXT_LIST_QUERY_LIMIT`       | 运行时 | Worker 运行时或 Pages 统一变量   | `500`                        | 访问分析指标列表的最大结果数。                                    |
| `NUXT_DISABLE_BOT_ACCESS_LOG` | 运行时 | Worker 运行时或 Pages 统一变量   | `false`                      | 为 `true` 时从访问分析和点击 Webhook 中排除识别到的机器人。       |
| `NUXT_DISABLE_AUTO_BACKUP`    | 运行时 | Worker 运行时或 Pages 统一变量   | `false`                      | 为 `true` 时禁用计划 R2 快照。                                    |
| `NUXT_AI_MODEL`               | 运行时 | Worker 运行时或 Pages 统一变量   | `@cf/qwen/qwen3-30b-a3b-fp8` | Workers AI 模型。                                                 |
| `NUXT_AI_PROMPT`              | 运行时 | Worker 运行时或 Pages 统一变量   | 内置 Slug 提示词             | 自定义提示词必须保留 `{slugRegex}`。                              |
| `NUXT_AI_OG_PROMPT`           | 运行时 | Worker 运行时或 Pages 统一变量   | 内置 OpenGraph 提示词        | 自定义元数据提示词；Sink 会附加请求的语言区域。                   |
| `DEPLOY_D1_DATABASE_NAME`     | 构建   | Workers Builds 或 Pages 统一变量 | `sink`                       | 生成的 D1 数据库名称。                                            |
| `DEPLOY_ANALYTICS_DATASET`    | 构建   | Workers Builds 或 Pages 统一变量 | `sink`                       | 生成的 Analytics Engine 数据集名称。                              |

部署变量用于生成被忽略的 `wrangler.deploy.jsonc`，并非运行时应用设置。详见[访问分析与近实时视图](/zh-CN/features/analytics)和 [API](/zh-CN/api/)。
