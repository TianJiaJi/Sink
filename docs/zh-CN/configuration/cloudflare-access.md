---
title: Cloudflare Access 身份认证
description: 为 Sink 仪表盘启用 Cloudflare Access 身份认证，同时保留公开链接和受支持的 API 客户端。
---

# Cloudflare Access 身份认证

Cloudflare Access 是可选功能。配置后，Sink 会接受有效的站点令牌 Bearer 凭据或有效的 Access 应用 JWT 进行 API 身份认证。Sink 会验证 JWT 的签名、签发者、受众和过期时间，绝不会仅凭 Cookie 或 Header 的存在就信任它们。

## 兼容性优先配置

1. 为 Sink 域名创建 Cloudflare Access 自托管应用。
2. 保护 `/dashboard` 及其子路由。
3. 将 `/api` 排除在 Access 代理策略之外，以便使用站点令牌的客户端仍可访问 Sink 身份认证。
4. 保持 Access 的 **Cookie Path** 设置处于禁用状态，使已签名的应用 Cookie 能够到达 `/api`。
5. 设置 `NUXT_CF_ACCESS_TEAM_DOMAIN` 和 `NUXT_CF_ACCESS_AUD`，然后重新部署。启用规则详见[配置参考](./)。

最小配置：

```ini
NUXT_CF_ACCESS_TEAM_DOMAIN=https://team.cloudflareaccess.com
NUXT_CF_ACCESS_AUD=your-application-aud-tag
```

将 `team` 替换为你的 Access 团队名称。Team Domain 必须使用上述不含路径的源格式。从 Access 应用中复制 AUD 值。

短链接保持公开。API 操作仍由 Sink 进行身份认证。如果自动生成的 OpenAPI 文档不能公开，请在边缘单独保护 `/_docs`。

## 安全模型

在兼容性优先模式下，Sink 会在本地验证已签名的 JWT。已撤销的 Access 会话在该 JWT 过期前可能仍然可用，因此应选择合适的 Access 会话时长。

通过 Access 认证的浏览器请求在执行状态变更方法时会接受来源检查。非浏览器客户端通常应使用站点令牌。被接受的 Access 服务令牌会映射到 Sink 的 `root` 身份，因此 Access 策略中应只允许明确受信任的服务令牌。

保护路由到该部署的每个域名。只保护一个仪表盘域名，并不能保护另一个使用弱站点令牌公开同一应用的域名。

## 严格边缘强制

你可以同时使用 Access 保护 `/dashboard` 和 `/api`。这样，边缘会在请求到达 Sink 前将其拦截。仅使用站点令牌的客户端无法访问该域名，除非它们也通过 Access；必要时请使用单独的 API 域名。

启用 Access 身份认证时，仪表盘注销会使用 `/cdn-cgi/access/logout`。

## Cloudflare 参考资料

- [验证 Access JWT](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/)
- [Access 应用路径](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths/)
- [Access 会话管理](https://developers.cloudflare.com/cloudflare-one/access-controls/access-settings/session-management/)
