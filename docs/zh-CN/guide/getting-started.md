---
title: 快速开始
description: 准备 Cloudflare 资源、部署 Sink 并创建第一个短链接。
---

# 快速开始

Sink 是一款面向 Cloudflare 的自托管短链接与访问分析应用。

## 1. Fork Sink

在你的 GitHub 账户中 [Fork Sink 仓库](https://github.com/miantiao-me/Sink/fork)。

## 2. 选择部署目标

- [Cloudflare Workers](/zh-CN/deployment/workers) 是推荐的 Git 集成部署方式。
- 也可以部署到 [Cloudflare Pages](/zh-CN/deployment/pages)。

## 3. 准备 Cloudflare 资源

| 绑定        | 状态 | 用途                                       |
| ----------- | ---- | ------------------------------------------ |
| `DB`（D1）  | 必需 | 存储链接及相关数据。                       |
| `KV`        | 必需 | 加速链接重定向。                           |
| `ANALYTICS` | 推荐 | 记录访问数据，用于分析和日志。             |
| `R2`        | 可选 | 使用备份和 OpenGraph 图片功能时推荐启用。  |
| `AI`        | 可选 | 使用 AI 辅助生成 Slug 和元数据时推荐启用。 |

如需完整的 Sink 使用体验，建议启用以上五项资源。

## 4. 配置部署

按照所选部署目标的指南连接 Fork、添加资源，并配置稳定且高强度的 `NUXT_SITE_TOKEN`。访问分析和其他功能的设置请查看[配置参考](/zh-CN/configuration/)。

## 5. 部署

在 Cloudflare 中启动 Git 部署并等待完成。

## 6. 创建第一个链接

打开已部署域名下的 `/dashboard`，使用 `NUXT_SITE_TOKEN` 登录并创建链接。
