---
title: Cloudflare Access Authentication
description: Protect the Sink dashboard with Cloudflare Access while preserving public short links and SiteToken API clients.
---

# Cloudflare Access Authentication

Sink can use Cloudflare Access as an alternative to the site token. An API request is accepted when it has either a valid `NUXT_SITE_TOKEN` bearer token or a valid Cloudflare Access application JWT for a user or service token. Sink verifies the JWT signature, issuer, audience, and expiration against the team's public keys; a header or cookie is never trusted by presence alone.

## Compatibility-first setup

This setup protects the dashboard while keeping public short links and SiteToken clients unchanged.

1. Create a Cloudflare Access self-hosted application for your Sink hostname.
2. Cover `/dashboard` and its child routes with the application path.
3. Do not protect `/api` at the Access proxy layer. Sink authenticates API requests with SiteToken or the signed Access application cookie.
4. In advanced cookie settings, leave **Cookie Path** disabled so the cookie reaches `/api`. Use `Lax` or `Strict` SameSite when cross-site requests are unnecessary.
5. Configure both values and redeploy:

```ini
NUXT_CF_ACCESS_TEAM_DOMAIN=https://your-team.cloudflareaccess.com
NUXT_CF_ACCESS_AUD=your-application-aud-tag
```

The team domain must not include a path. Find the AUD tag in the Access application's additional settings.

Short links, static assets, and API documentation remain public at the Access layer. Sink still authenticates API operations. Protect `/_docs` separately if the OpenAPI schema should not be public.

## Security considerations

In compatibility-first mode, Sink validates the signed JWT locally instead of asking the Access proxy to evaluate every `/api` request. An administrator-revoked session can therefore remain usable until its JWT expires. Choose an appropriately short Access policy or application session duration.

Because Access uses a browser cookie, Sink rejects cross-site browser requests authenticated through Access and verifies `Origin` for state-changing methods. SiteToken requests are unchanged; non-browser clients should use `NUXT_SITE_TOKEN`.

A verified Access service token is mapped to Sink's `root` identity. Only allow explicitly designated, trusted service tokens in the Access policy because each accepted service token receives full root access. Sink authenticates the signed application JWT and does not trust raw `CF-Access-Client-Id` or `CF-Access-Client-Secret` headers.

Do not expose another deployment hostname with a weak SiteToken. Protecting the dashboard hostname does not protect other hostnames routed to the same Worker or Pages project.

## Logout

When the dashboard uses Access authentication, Sink redirects logout to `/cdn-cgi/access/logout`, which revokes the Access session across applications and clears the application cookie.

## Strict setup

For stronger edge enforcement, protect both `/dashboard` and `/api`. Cloudflare then blocks requests before they reach Sink. A client that passes Access with an allowed service token can use the signed application JWT that reaches the Worker; it does not also need a Sink SiteToken. A SiteToken-only client cannot use that hostname unless it also passes Access, so use a separate API hostname when Access is not available to the client.

## References

- [Validate Access JWTs](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/)
- [Access application token](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/application-token/)
- [Access application paths](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths/)
- [Access session management](https://developers.cloudflare.com/cloudflare-one/access-controls/access-settings/session-management/)
