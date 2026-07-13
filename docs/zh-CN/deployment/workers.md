---
title: 部署 Sink 到 Cloudflare Workers
description: 使用 D1、KV、R2、Analytics Engine、运行时变量和自动迁移将 Sink 部署到 Cloudflare Workers。
---

# 部署 Sink 到 Cloudflare Workers

1. [Fork 仓库](https://github.com/miantiao-me/Sink/fork)。
2. 创建 [KV 命名空间](https://developers.cloudflare.com/kv/)并复制其 ID。
3. 创建 D1 并复制 ID：`pnpm wrangler d1 create sink`。
4. 创建名为 `sink` 的 [R2 存储桶](https://developers.cloudflare.com/r2/)，或运行 `pnpm wrangler r2 bucket create sink`。部署配置始终包含 `R2`；OpenGraph 图片上传和自动兼容性备份依赖它。
5. 创建连接到 Fork 的 [Cloudflare Workers](https://developers.cloudflare.com/workers/) 项目。
6. 配置命令：
   - **构建命令：** `pnpm build`
   - **部署命令：** `pnpm deploy:worker`
7. 在 **Workers Builds** → **Build variables and secrets** 中配置：
   - `DEPLOY_D1_DATABASE_ID`（**必填**）
   - `DEPLOY_KV_NAMESPACE_ID`（**必填**，用于生产与预览 KV 绑定）
   - `DEPLOY_D1_DATABASE_NAME`（可选，默认 `sink`）
   - `DEPLOY_R2_BUCKET_NAME`（可选，默认 `sink`，存储桶必须已存在）
   - `DEPLOY_ANALYTICS_DATASET`（可选，默认 `sink`）
   - `NUXT_API_CORS`（可选，仅构建时）
   - 实例需要的所有 `NUXT_PUBLIC_*` 值

`DEPLOY_*` 仅用于部署。不要将其添加为 Worker 运行时变量，也不要编辑版本库中的 `wrangler.jsonc`。部署命令会生成已被 Git 忽略的 `wrangler.deploy.jsonc`、应用待执行的 D1 迁移并发布 Worker。

8. 保存并部署。
9. 在 Worker 的 **Settings** → **Variables and Secrets** 中配置运行时值：
   - 重复配置构建阶段的全部 `NUXT_PUBLIC_*` 值。
   - 设置安全的 `NUXT_SITE_TOKEN`；建议使用至少 8 个字符，并避免纯数字等可预测值。
   - 配置 `NUXT_CF_ACCOUNT_ID`，以及至少拥有 Account Analytics 权限的 `NUXT_CF_API_TOKEN`。
   - 按需添加其他运行时 `NUXT_*`，包括 `NUXT_DATASET`、Access 和 Webhook 设置。
10. 在 **Workers & Pages** → **Account details** 中启用 Analytics Engine，并保持 `NUXT_DATASET` 与 `DEPLOY_ANALYTICS_DATASET` 一致。
11. 重新部署项目。

D1 是链接的权威存储。KV 是写穿式读取缓存，并在迁移完成前临时提供旧数据。已有 KV 链接的升级实例应在应用 D1 迁移后使用[迁移 API](/zh-CN/api/#迁移与工具)。

如需保护仪表盘，请参阅 [Cloudflare Access](/zh-CN/configuration/cloudflare-access)；事件投递详见[点击 Webhook](/zh-CN/configuration/webhooks)。更新 Fork 可参考 GitHub 的[同步 Fork](https://docs.github.com/zh/pull-requests/collaborating-with-pull-requests/working-with-forks/syncing-a-fork)指南。
