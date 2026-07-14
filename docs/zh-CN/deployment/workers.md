---
title: 部署到 Cloudflare Workers
description: 通过 Git 集成将 Sink 部署到 Cloudflare Workers。
---

# 部署到 Cloudflare Workers

## 1. Fork Sink 并准备资源

[Fork Sink 仓库](https://github.com/miantiao-me/Sink/fork)，然后准备以下 Cloudflare 资源：

| 绑定        | 状态 | 用途                                       |
| ----------- | ---- | ------------------------------------------ |
| `DB`（D1）  | 必需 | 存储链接及相关数据。                       |
| `KV`        | 必需 | 加速链接重定向。                           |
| `ANALYTICS` | 推荐 | 记录访问数据，用于分析和日志。             |
| `R2`        | 可选 | 使用备份和 OpenGraph 图片功能时推荐启用。  |
| `AI`        | 可选 | 使用 AI 辅助生成 Slug 和元数据时推荐启用。 |

如需完整的 Sink 使用体验，建议启用以上五项资源。

## 2. 连接 Workers Builds

在 Cloudflare 仪表盘中创建采用 Git 集成的 Worker，并连接你的 Fork。使用以下设置：

- **生产分支：** `master`
- **构建命令：** `pnpm build`
- **部署命令：** `pnpm deploy:worker`

添加以下构建变量：

| 变量                     | 设置条件                         |
| ------------------------ | -------------------------------- |
| `DEPLOY_D1_DATABASE_ID`  | 必需，填写 D1 数据库 ID。        |
| `DEPLOY_KV_NAMESPACE_ID` | 必需，填写 KV 命名空间 ID。      |
| `DEPLOY_R2_BUCKET_NAME`  | 使用 R2 时设置，填写存储桶名称。 |

连接仓库后，Workers Builds 会使用 Cloudflare 自动生成的部署令牌，无需添加其他凭据。

## 3. 配置应用设置

在 **Settings → Variables and Secrets** 中，将稳定且高强度的 `NUXT_SITE_TOKEN` 设置为加密的运行时密钥。按照[配置参考](/zh-CN/configuration/)添加所需的公开设置和可选设置。

如需在仪表盘中查询访问分析，请按照[推荐配置](/zh-CN/configuration/#推荐配置)配置 `NUXT_CF_ACCOUNT_ID`、加密的 `NUXT_CF_API_TOKEN` 和 `NUXT_DATASET`。

确认已启用资源的绑定名称分别为 `DB`、`KV`、`ANALYTICS`、`R2` 和 `AI`。

## 4. 部署

启动 Workers 构建并等待 Sink 发布完成。

首次部署后，打开 `/dashboard`，登录并创建链接。后续发布请按照[升级 Sink](./upgrading)操作。
