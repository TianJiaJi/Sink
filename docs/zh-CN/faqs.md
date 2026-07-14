---
title: 故障排查
description: 诊断常见的 Sink 部署、身份认证、访问分析、重定向、导入、备份和可选功能故障。
---

# 故障排查

## 无法创建或解析链接

确认 D1 和 KV 已使用准确名称 `DB` 和 `KV` 进行绑定，然后重新部署最新的 `master` 分支，以自动完成所需的 D1 更新。

如果现有实例从仅使用 KV 存储链接的旧版本升级，请打开 **Dashboard → Links** 启动或继续 [KV 到 D1 迁移](/zh-CN/storage/kv-to-d1)。

<details>
  <summary><b>KV 绑定截图</b></summary>
  <img alt="Cloudflare 中的 KV 绑定设置" src="../images/faqs-kv.png">
</details>

## 无法登录或调用 API

检查提供的 Bearer 值是否与 `NUXT_SITE_TOKEN` 完全一致。如果使用 Cloudflare Access，请确认两项 Access 设置均已提供、AUD 属于该应用，且已签名的应用 Cookie 能够到达 `/api`。严格 Access 策略还要求非浏览器客户端通过边缘策略。

## 访问分析为空

确认以下所有事项：

1. Analytics Engine 已启用并绑定为 `ANALYTICS`。
2. 配置的数据集名称与绑定的数据集一致。
3. 账户 ID 属于部署账户。
4. API Token 具有 Account Analytics 权限。
5. 机器人过滤或所选仪表盘过滤条件没有排除这些流量。

<details>
  <summary><b>Analytics Engine 绑定截图</b></summary>
  <img alt="Cloudflare 中的 Analytics Engine 绑定设置" src="../images/faqs-Analytics_engine.png">
</details>

## 近实时事件成批到达或似乎有延迟

在一定范围内这是预期行为：仪表盘每 10 秒轮询一次，并以大约每秒一个事件的速度回放队列中的事件。请确认视图没有暂停、标签页可见且访问分析查询正常工作。它不是 SSE 或 WebSocket 流。

## 自定义 Slug 不保留大写字符

启用区分大小写设置并重新部署。它会影响自定义 Slug 的规范化；自动生成的随机 Slug 会有意保持小写。现有 Slug 不会自动重命名。

## 隐匿目标显示空白或拒绝加载

目标可能通过 `X-Frame-Options` 或 `Content-Security-Policy: frame-ancestors` 禁止 iframe 嵌入。请禁用隐匿功能；如果你控制目标，也可以修改其策略。OAuth 和支付页面通常会拒绝被嵌入。

## 安全浏览没有更改链接的 unsafe 标志

仅当创建或相关编辑请求中省略 `unsafe` 时，才会运行自动检测。显式提供的 `true` 或 `false` 优先。还应检查 DoH URL，并注意查询错误会放行。

## 导入时跳过或拒绝记录

检查每个项目的结果。活动 Slug 冲突会被跳过，格式错误的记录则会在验证或处理时失败。允许导入过期记录。每个请求不得超过已配置导出批次大小的一半，并应使用可移植密码哈希，而不是仪表盘中经过遮盖的占位符。

## 未创建备份

确认 `R2` 已绑定。如果现有实例从旧版纯 KV 部署升级，请先完成 [KV 到 D1 迁移](/zh-CN/storage/kv-to-d1)。对于计划备份，请确认自动备份设置和 Workers Cron。Pages 在本仓库中没有自动计划触发器；请改用仪表盘中的手动备份操作。

## 重定向变更似乎仍是旧值

KV、浏览器或 CDN 缓存可能会延迟可见变更。请在[配置参考](/zh-CN/configuration/#高级默认值)中查看链接缓存生命周期和重定向 no-store 设置，然后在仪表盘中确认当前链接。
