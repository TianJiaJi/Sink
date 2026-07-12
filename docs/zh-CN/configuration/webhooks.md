---
title: 点击 Webhook
description: 配置 Sink 点击 Webhook 的载荷、HMAC 签名、投递行为和隐私保证。
---

# 点击 Webhook

将 `NUXT_WEBHOOK_URL` 设为 HTTP 或 HTTPS 地址，即可为每次计入访问统计的点击发送尽力投递 Webhook。生产环境强烈建议使用 HTTPS。空值会禁用投递；被 `NUXT_DISABLE_BOT_ACCESS_LOG` 排除的机器人点击也不会发送 Webhook。

## 签名密钥

`NUXT_WEBHOOK_SECRET` 是可选项。它必须以 `whsec_` 开头，后缀是 24–64 字节 HMAC 密钥的 Base64 编码。可用以下命令生成 32 字节密钥：

```sh
printf 'whsec_%s\n' "$(openssl rand -base64 32)"
```

每个请求都包含 `webhook-id` 与 `webhook-timestamp`。签名请求还包含 `webhook-signature: v1,<base64>`；其值使用解码后的密钥后缀，对 `<webhook-id>.<webhook-timestamp>.<raw-body>` 执行 HMAC-SHA256 得到。请在解析 JSON 前使用原始请求体验签。

非空但无效的密钥会导致投递失败，绝不会降级为无签名投递。不配置密钥时，请求未经认证且没有签名，不建议在不受信任的网络中使用。

## 载荷

Sink 发送 Dub 风格载荷：

```json
{
  "id": "evt_...",
  "event": "link.clicked",
  "createdAt": "2026-07-11T12:00:00.000Z",
  "data": {
    "click": {
      "id": "clk_...",
      "timestamp": "2026-07-11T12:00:00.000Z",
      "country": "US",
      "region": "California",
      "city": "San Francisco",
      "device": "mobile",
      "browser": "Mobile Safari",
      "os": "iOS",
      "referer": "example.com"
    },
    "link": {
      "id": "link-id",
      "slug": "example"
    }
  }
}
```

位置字段保留 Cloudflare 提供的国家/地区代码、区域和城市原始值。`device` 优先使用解析出的设备类别，否则回退到设备型号。

## 投递与隐私

载荷不包含 IP 地址、坐标、完整 User-Agent、查询参数、密码和目标 URL。投递异步执行，超时为 10 秒，仅接受 2xx 响应，不跟随重定向，也不会重试。投递失败不会阻塞短链接重定向。
