---
title: Sink 常见问题
description: 排查 Sink 绑定、认证、访问分析、重定向、链接路由、导入导出、隐匿和安全功能问题。
---

# 常见问题

## 为什么无法创建链接？

确认 D1 与 KV 均已绑定，且变量名严格使用大写 `DB` 和 `KV`。D1 是链接的权威存储；KV 是写穿式读取缓存，并在迁移完成前临时提供旧数据。

<details>
  <summary><b>KV 绑定截图</b></summary>
  <img alt="Cloudflare 中的 KV 绑定设置" src="../images/faqs-kv.png">
</details>

## 为什么无法登录？

检查提交的令牌是否与 `NUXT_SITE_TOKEN` 完全一致。生产环境建议使用至少 8 个字符的安全值，并避免纯数字等可预测令牌。

## 为什么看不到访问分析数据？

1. 检查 `NUXT_CF_ACCOUNT_ID` 与 `NUXT_CF_API_TOKEN`。账户 ID 必须属于部署账户，Token 需要 Account Analytics 权限。
2. 启用 Analytics Engine，并将 `ANALYTICS` 绑定到 `NUXT_DATASET` 指定的数据集（默认 `sink`）。

<details>
  <summary><b>Analytics Engine 绑定截图</b></summary>
  <img alt="Cloudflare 中的 Analytics Engine 绑定设置" src="../images/faqs-Analytics_engine.png">
</details>

## 首页可以跳转到自己的网站吗？

可以。将 `NUXT_HOME_URL` 设为博客或官网地址。

## 为什么通过 NuxtHub 部署后看不到统计数据？

NuxtHub 的 `ANALYTICS` 绑定可能指向其自己的数据集。请将 `NUXT_DATASET` 设为同一个数据集名称，确保 Sink 查询的正是接收事件的数据集。

## 为什么链接默认不区分大小写？

Sink 默认将 Slug 统一转为小写，以避免意外大小写差异。设置 `NUXT_CASE_SENSITIVE=true` 可保留大小写；此后随机 Slug 可以同时包含大小写字符，`MyLink` 与 `mylink` 也会成为不同链接。

## 为什么指标列表只显示 500 条？

`NUXT_LIST_QUERY_LIMIT` 默认为 500，以限制分析查询成本。如果部署能够承受更大的查询，可以提高该值。

## 如何排除机器人和爬虫？

设置 `NUXT_DISABLE_BOT_ACCESS_LOG=true`。被排除的机器人点击也不会发送点击 Webhook。

## 什么是链接隐匿？

链接隐匿会让浏览器地址栏保留短网址，并在全屏 iframe 中加载 HTTPS 目标。可在链接设置中启用 **Link Cloaking**。

它无法向页面源代码、开发者工具、网络日志或主动检查的用户隐藏目标。设置了 `X-Frame-Options: DENY` 或严格 `Content-Security-Policy: frame-ancestors` 的网站无法加载，OAuth 和支付流程也可能拒绝 iframe。设备专用重定向优先级更高。如果你控制目标站点，可以允许短链接来源，例如：

```http
Content-Security-Policy: frame-ancestors 'self' https://your-short-domain.example
```

## 查询参数转发如何工作？

启用 `redirectWithQuery` 后，`https://s.example/link?ref=social` 等请求的查询参数会附加到目标 URL。使用 `NUXT_REDIRECT_WITH_QUERY=true` 设置全局默认值，再通过链接设置中的 **Redirect with Query Parameters** 为单个链接覆盖。

## 导入和导出如何工作？

- **导出：** 使用游标分页下载 JSON，默认每页 50 条。
- **导入：** 接受受限批次，默认每个请求 25 条。
- **存储：** D1 执行权威重复检测和写入；成功写入后进行尽力而为的 KV 缓存更新。批次大小用于兼容与控制请求成本，并不代表每条链接执行两次 KV 操作。
- **过期时间：** 过期时间已在过去的导入会被拒绝。
- **重复 Slug：** 跳过并保留已有活动链接。
- **校验：** 处理导入前会对整个请求执行 Schema 校验。
- **密码：** 导出会保留 Sink 可迁移存储格式中的密码哈希，这类哈希可以原样导入；仪表盘显示的遮盖值不能作为明文密码导入。

旧 KV 记录通过 `/api/link/migration/run` 单独迁移；导入/导出不是 KV 到 D1 的迁移机制。

## 受密码保护和不安全链接如何工作？

浏览器访问受密码保护链接时会看到密码表单，程序客户端可以发送 `x-link-password`。不安全链接会显示警告，程序客户端确认后可发送 `x-link-confirm: true`。配置 `NUXT_SAFE_BROWSING_DOH` 后，创建和编辑链接时可以自动检查不安全域名。

## 地域路由如何工作？

使用两字母代码配置目标，例如 `{ "US": "https://example.com/us" }`。Sink 使用 Cloudflare 的 `request.cf.country`；Apple 或 Android 设备专用目标优先级更高。

## 如何导出访问分析？

使用仪表盘或已认证的 `GET /api/stats/export`。响应为 CSV，包含 `slug`、`url`、`viewer`、`views` 和 `referer`。可传入 `startAt`、`endAt`、`slug`、`country`、`browser` 或 `device` 等分析视图过滤条件。
