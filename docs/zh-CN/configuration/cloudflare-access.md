---
title: Cloudflare Access 身份认证
description: 使用 Cloudflare Access 保护 Sink 仪表盘，同时保留公开短链接与 SiteToken API 客户端。
---

# Cloudflare Access 身份认证

Sink 可以使用 Cloudflare Access 作为站点令牌的替代认证方式。API 请求只要携带有效的 `NUXT_SITE_TOKEN` Bearer Token 或有效的 Cloudflare Access 应用 JWT 即可通过。Sink 会通过团队公钥验证 JWT 的签名、签发者、受众和有效期；绝不会只因请求中存在某个 Header 或 Cookie 就信任它。

## 兼容优先配置

此方案保护仪表盘，同时保持公开短链接与 SiteToken 客户端不变。

1. 为 Sink 域名创建 Cloudflare Access 自托管应用。
2. 将应用路径覆盖 `/dashboard` 及其子路由。
3. 不要在 Access 代理层保护 `/api`。Sink 会用 SiteToken 或已签名的 Access 应用 Cookie 自行认证 API 请求。
4. 在高级 Cookie 设置中关闭 **Cookie Path**，确保 Cookie 也会发往 `/api`。不需要跨站请求时，将 SameSite 设为 `Lax` 或 `Strict`。
5. 配置以下两个值并重新部署：

```ini
NUXT_CF_ACCESS_TEAM_DOMAIN=https://your-team.cloudflareaccess.com
NUXT_CF_ACCESS_AUD=your-application-aud-tag
```

团队域名不能带路径。AUD 标签可在 Access 应用的附加设置中找到。

短链接、静态资源和 API 文档在 Access 层仍然公开，API 操作仍由 Sink 认证。如果 OpenAPI Schema 不应公开，请单独保护 `/_docs`。

## 安全注意事项

在兼容优先模式中，Sink 本地验证已签名 JWT，而不是让 Access 代理评估每个 `/api` 请求。因此，管理员撤销的会话在 JWT 过期前仍可能可用，请设置适当短的 Access 策略或应用会话时长。

Access 使用浏览器 Cookie，因此 Sink 会拒绝通过 Access 认证的跨站浏览器请求，并对修改数据的方法校验 `Origin`。SiteToken 请求不受影响；非浏览器客户端应使用 `NUXT_SITE_TOKEN`。

不要通过另一个部署域名暴露弱 SiteToken。保护仪表盘域名并不会自动保护指向同一 Worker 或 Pages 项目的其他域名。

## 退出登录

仪表盘通过 Access 认证时，Sink 会把退出操作重定向到 `/cdn-cgi/access/logout`，从而撤销跨应用的 Access 会话并清除应用 Cookie。

## 严格配置

如需更强的边缘强制策略，可以同时保护 `/dashboard` 与 `/api`。Cloudflare 会在请求抵达 Sink 前拦截它；仅携带 SiteToken 的客户端将无法使用该域名，还必须提供 Access Service Token，或改用独立 API 域名。

## 参考资料

- [验证 Access JWT](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/)
- [Access 应用令牌](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/application-token/)
- [Access 应用路径](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths/)
- [Access 会话管理](https://developers.cloudflare.com/cloudflare-one/access-controls/access-settings/session-management/)
