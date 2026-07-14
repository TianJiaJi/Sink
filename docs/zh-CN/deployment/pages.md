---
title: 部署到 Cloudflare Pages
description: 通过 Git 集成和仪表盘管理的绑定将 Sink 部署到 Cloudflare Pages。
---

# 部署到 Cloudflare Pages

## 1. 创建 Pages 项目

[Fork Sink 仓库](https://github.com/miantiao-me/Sink/fork)。在 Cloudflare 仪表盘中创建 Pages 应用，导入该 Fork，并配置：

- **生产分支：** `master`
- **框架预设：** Nuxt
- **构建命令：** `pnpm build`
- **构建输出目录：** `dist`

创建项目以进入项目设置。如果配置完成前已开始首次部署，请取消该部署。

## 2. 准备资源和绑定

创建需要使用的资源，然后在 **Settings → Bindings** 中添加：

| 绑定        | 状态 | 用途                                       |
| ----------- | ---- | ------------------------------------------ |
| `DB`（D1）  | 必需 | 存储链接及相关数据。                       |
| `KV`        | 必需 | 加速链接重定向。                           |
| `ANALYTICS` | 推荐 | 记录访问数据，用于分析和日志。             |
| `R2`        | 可选 | 使用备份和 OpenGraph 图片功能时推荐启用。  |
| `AI`        | 可选 | 使用 AI 辅助生成 Slug 和元数据时推荐启用。 |

如需完整的 Sink 使用体验，建议启用以上五项资源。为生产环境和预览环境添加 `nodejs_compat` 兼容性标志。

## 3. 配置变量和密钥

在 **Settings → Variables and Secrets** 中添加以下值。Pages 只有这一套设置，构建和 Functions 运行时都会使用它。

| 变量                     | 状态 | 类型     | 值或用途                                         |
| ------------------------ | ---- | -------- | ------------------------------------------------ |
| `DEPLOY_D1_DATABASE_ID`  | 必需 | 变量     | D1 数据库 ID。                                   |
| `DEPLOY_KV_NAMESPACE_ID` | 必需 | 变量     | KV 命名空间 ID。                                 |
| `NUXT_SITE_TOKEN`        | 必需 | 加密密钥 | 用于仪表盘和 Bearer 身份认证的高强度、稳定令牌。 |
| `NUXT_CF_ACCOUNT_ID`     | 推荐 | 变量     | Cloudflare 账户 ID，供仪表盘访问分析使用。       |
| `NUXT_CF_API_TOKEN`      | 推荐 | 加密密钥 | 具有 Account Analytics 访问权限的 API Token。    |
| `NUXT_PUBLIC_*`          | 可选 | 变量     | 仅在覆盖默认值时配置；每次修改后都需要重新构建。 |

其他可选设置请查看[配置参考](/zh-CN/configuration/)。R2 只能通过 **Settings → Bindings** 配置。

## 4. 部署

从 `master` 分支启动部署并等待完成。

首次部署后，打开 `/dashboard`，登录并创建链接。

Pages 支持手动创建 [R2 链接快照](/zh-CN/features/backups)，但本仓库没有配置 Pages 计划触发器。
