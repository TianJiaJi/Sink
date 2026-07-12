---
title: 快速开始
description: 选择 Sink 部署目标、配置 Cloudflare 绑定，并打开第一个自托管仪表盘。
---

# 快速开始

Sink 是为 Cloudflare 构建的自托管短链接与访问分析应用。D1 是链接的权威存储；KV 是写穿式读取缓存，并且仅在 KV 到 D1 的迁移标记完成前临时提供旧版链接数据。

## 准备工作

- 本地命令需要 Node.js 22 或更高版本及 pnpm 11.11.0
- Cloudflare 账户
- [Sink 仓库](https://github.com/miantiao-me/Sink/fork)的 Fork
- D1 数据库、KV 命名空间、R2 存储桶和 Analytics Engine 数据集

## 选择部署目标

- [Cloudflare Workers](/zh-CN/deployment/workers) 是推荐的 Git 集成部署方式，使用 Sink 生成的 Wrangler 配置。
- [Cloudflare Pages](/zh-CN/deployment/pages) 通过仪表盘管理绑定；包含数据库结构变更的版本发布前必须执行远程 D1 迁移。

## 配置实例

至少需要配置 Cloudflare 绑定，并设置安全的 `NUXT_SITE_TOKEN`。建议使用至少 8 个字符，并避免纯数字等可预测值。随后检查[环境变量](/zh-CN/configuration/)，并按需配置 [Cloudflare Access](/zh-CN/configuration/cloudflare-access) 或[点击 Webhook](/zh-CN/configuration/webhooks)。

部署后打开实例域名下的 `/dashboard`。API 客户端可以将相同的站点令牌作为 Bearer Token 使用。请参阅 [API 参考](/zh-CN/api/)，也可以浏览公开的 [Sink API 演示](https://sink.cool/_docs/scalar)。

## 存储迁移

新安装会把链接写入 D1，并同步填充 KV 缓存。已有 KV 链接的升级实例应重复调用已认证的迁移端点，直到状态显示完成。迁移按受限分页把旧 `link:*` KV 记录复制到 D1，且不会覆盖已有 D1 行。详见 [API 迁移端点](/zh-CN/api/#迁移与工具)。
