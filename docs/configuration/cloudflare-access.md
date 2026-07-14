---
title: Cloudflare Access
description: Enable Cloudflare Access authentication for the Sink dashboard while preserving public links and supported API clients.
---

# Cloudflare Access

Cloudflare Access is optional. When configured, Sink accepts either a valid site-token bearer credential or a valid Access application JWT for API authentication. Sink verifies the JWT signature, issuer, audience, and expiration; it never trusts a cookie or header by presence alone.

## Compatibility-first setup

1. Create a Cloudflare Access self-hosted application for the Sink hostname.
2. Protect `/dashboard` and its child routes.
3. Leave `/api` outside the Access proxy policy so site-token clients can still reach Sink authentication.
4. Leave the Access **Cookie Path** setting disabled so the signed application cookie reaches `/api`.
5. Set `NUXT_CF_ACCESS_TEAM_DOMAIN` and `NUXT_CF_ACCESS_AUD`, then redeploy. See [configuration](./) for activation rules.

Minimal configuration:

```ini
NUXT_CF_ACCESS_TEAM_DOMAIN=https://team.cloudflareaccess.com
NUXT_CF_ACCESS_AUD=your-application-aud-tag
```

Replace `team` with your Access team name. The Team Domain must use this origin format with no path. Copy the AUD value from the Access application.

Short links remain public. API operations remain authenticated by Sink. Protect `/_docs` separately at the edge if the generated OpenAPI document must not be public.

## Security model

In compatibility-first mode, Sink validates the signed JWT locally. A revoked Access session can remain usable until that JWT expires, so choose an appropriate Access session duration.

Browser requests authenticated through Access receive origin checks for state-changing methods. Non-browser clients should normally use the site token. An accepted Access service token maps to Sink's `root` identity, so allow only explicitly trusted service tokens in the Access policy.

Protect every hostname routed to the deployment. Securing one dashboard hostname does not protect another hostname that exposes the same application with a weak site token.

## Strict edge enforcement

You may protect both `/dashboard` and `/api` with Access. The edge then blocks requests before Sink. Site-token-only clients cannot use that hostname unless they also pass Access; use a separate API hostname when necessary.

Dashboard logout uses `/cdn-cgi/access/logout` when Access authentication is active.

## Cloudflare references

- [Validate Access JWTs](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/)
- [Access application paths](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths/)
- [Access session management](https://developers.cloudflare.com/cloudflare-one/access-controls/access-settings/session-management/)
