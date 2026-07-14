---
title: 点击 Webhook
description: 启用点击 Webhook，并了解其 HMAC 签名验证、投递行为、负载和隐私边界。
---

# 点击 Webhook

点击 Webhook 是可选功能。请按照[配置参考](./)中的说明配置 URL 和可选的签名密钥。Sink 会为访问分析所包含的每次点击尽力发送事件；从访问日志中排除的机器人点击也不会发送到这里。

## 签名

密钥必须以 `whsec_` 开头；其后缀是由 24–64 字节 HMAC 密钥编码而成的 Base64 字符串。以下是一种生成 32 字节密钥的方法：

```sh
printf 'whsec_%s\n' "$(openssl rand -base64 32)"
```

每个请求都包含 `webhook-id` 和 `webhook-timestamp`。已签名请求还包含 `webhook-signature: v1,<base64>`，它是对以下内容计算 HMAC-SHA256 得到的：

```txt
<webhook-id>.<webhook-timestamp>.<raw-body>
```

请在解析 JSON 前验证原始请求体。非空但无效的密钥会导致投递失败，而不会回退到未签名投递。

## 负载

Dub 风格的 `link.clicked` 事件包含事件 ID 和时间戳、链接 ID 和 Slug，以及国家或地区、区域、城市、设备、浏览器、操作系统和来源网站等点击属性。

其中不包含 IP 地址、坐标、完整 User-Agent、查询参数、密码或目标 URL。

## 投递限制

- 投递是异步的，绝不会阻塞重定向。
- 接收方必须在 10 秒内返回 2xx 响应。
- 不会跟随重定向响应。
- 失败的投递不会重试。
- 强烈建议使用 HTTPS，未签名投递尤其如此。
