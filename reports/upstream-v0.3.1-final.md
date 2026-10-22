# Final Upstream v0.3.1 Integration

## Release boundary

The owner initially approved a local-only merge, then explicitly authorized merging and pushing once verification passes. The owner subsequently approved backing up production D1 and applying the nullable proxy-column migration with its corresponding ledger entry before pushing. Read-only inspection found the old query-index migration `0010_quiet_lionheart.sql` also pending; the owner explicitly approved applying both `0010` and `0011`, without replaying `0000`–`0009` or rebuilding link tables. Stop for further approval if the historical migration ledger is inconsistent; do not blindly replay or mark historical migrations applied. Direct ad hoc deployment is not requested. Because pushing the main branch can trigger Cloudflare publication, verify database readiness before pushing.

- Local starting point: `82e4d2e`.
- Upstream target: `ccbikai/Sink` `bafa4e1` (v0.3.1).
- Integration branch: `sync/upstream-v0.3.1-final`.
- Application version: 0.3.1.

Upstream history had been rewritten: its `445f050` baseline corresponds to the last synchronized source, while Git's older merge base made hundreds of equivalent commits appear unrelated. A tree-preserving `ours` merge acknowledges that historical baseline without replacing the fork's code; the subsequent normal merge records the actual upstream v0.3.1 parent. Existing fork commits remain ancestors of the result. No rebase or force-push is involved.

## Remaining functionality integrated

- Native authenticated `/api/mcp` endpoint, using the official server SDK v2 and stateless legacy fallback.
- Link management, search, tag, link-check and analytics tools, with shared REST/MCP schemas and mutation helpers.
- Runtime OpenAPI request schemas generated from the same Zod contracts, including the fork's custom fields.
- Shared analytics query construction and link-check implementation.
- Opt-in reverse proxy delivery, including header filtering, private response handling and safe replay of consumed gate forms as bodyless GET requests.
- Proxy UI switch, persistence, export/import and migration support; proxy delivery is disabled by default.
- Upstream message-scroller registry updates, imported exactly from upstream without manual registry edits.
- Updated upstream documentation and related tests.

## Fork compatibility and security

- Preserved Turnstile, country rules, A/B routing and analysis, link disable, burn-after-read, click caps, counter reset, batch operations, and the existing long-URL/read-compatibility work.
- Custom fields are advertised and accepted by MCP, and retained during complete read/update round trips.
- Legacy KV migration preserves custom protection/routing metadata and existing click counts. The migration-specific raw SQL retains its tombstone guard and atomic tag-write pattern.
- Batch and counter-reset APIs remain migration-gated. Batch writes now obey preview-mode restrictions, normalize/limit merged tags, advance metadata versions, and report optimistic concurrency failures rather than silently succeeding.
- Header-password requests still require Turnstile when configured. Unsafe warning confirmations render a fresh challenge rather than reusing a consumed CAPTCHA token. Consumed gate forms are never forwarded upstream, and proxy targets do not receive cookies or Sink gate headers, including `x-turnstile-token`.
- Preview-mode counter resets explicitly return HTTP 403 without throwing an extra rejected handler promise. The unhandled-error filter was not broadened to hide this case.
- Gated, country-dependent and A/B proxy responses use private/no-store caching.
- MCP browser-origin checks compare the full origin, including scheme and port.
- OpenAPI schema injection also handles requests with a query string.
- Fixed the existing app-owned Heatmap ref type and the unsupported Turnstile retry option. The supported option is `retryStatusCodes`.

The repository's production `wrangler.jsonc`, domain declarations, variable-preservation policy and disabled AI binding remain unchanged. Node.js 22 and pnpm 11.11.0 are retained under the project policy; the upstream Node.js 24 engine declarations are intentionally not adopted. SDK v2 supports Node.js 20 and later.

## Additive database migration

New migration: `drizzle/0011_link_proxy.sql`.

```sql
ALTER TABLE `links` ADD `proxy` integer;
```

Existing rows receive a nullable proxy value and continue normal delivery. Historical SQL migration files are unchanged. Historical snapshot schemas and prior journal entries are unchanged; missing trailing newlines in old snapshots were formatted without changing their parsed schema content. Only a new snapshot and journal entry were appended.

**Production preparation completed with explicit owner approval on 2026-10-22.** A private full D1 SQL backup was exported before applying only `0010_quiet_lionheart.sql` (query index) and `0011_link_proxy.sql` (nullable proxy column). The backup is 28,602 bytes; its SHA-256 and exact private path are recorded in ignored local artifacts, and its contents are not committed.

Post-migration verification confirmed 38 links before and after, identical existing-record fingerprints for links, tags, link-tag associations and 11 tombstones, unchanged historical migration ledger entries, both new migrations recorded, and no remaining pending migration files. The proxy column is nullable INTEGER and all 38 existing rows have NULL proxy values. No table rebuild or historical migration replay occurred.

Even with proxy delivery disabled, the new server reads the proxy column. Future deployments must preserve this migration prerequisite; do not publish the new code against an older schema.

## Verification

- Dependency installation passed with the frozen lockfile and its supply-chain policy checks.
- Production build passed using Node.js 22.23.4. On Windows `cmd`, the equivalent build command was `pnpm build:sphere` followed by `pnpm exec nuxt build`, with `NODE_OPTIONS=--max-old-space-size=8192`; the package build script uses POSIX environment-assignment syntax. Production postbuild hooks were not executed.
- Full typecheck passed; the previously recorded type errors are resolved.
- Full repository ESLint passed with 0 errors and 164 non-blocking warnings, excluding only ignored local agent artifacts in `.pi/`.
- Node-pool client suite passed: 5 tests.
- Locale contracts passed: 11 locales, 8 modules.
- Default Worker suite passed: 392 tests across 38 files, including all 42 MCP cases and 9 final custom/proxy compatibility cases.
- Additional redirect/D1 suite passed: 59 tests across 2 files. Two old expiration assertions were updated to verify the existing friendly HTTP 200 expired page, HTML content, no redirect, and no-store caching rather than expecting HTTP 404. Combined Worker coverage: 451 passing tests.
- Final preservation guard and `git diff --check` passed. Both the direct Node executable and pnpm child runtime report Node.js 22.23.4.

Modern MCP tests use protocol revision `2026-07-28` envelopes with matching `Mcp-Method` and, for tool calls, `Mcp-Name` headers. The initial two HTTP 400 failures were invalid test requests missing the required method header; SDK header/body validation remains intact.

A preservation guard checks unchanged historical migration SQL, equal parsed historical snapshot schemas, unchanged prior journal entries, byte-equivalent production configuration, retained runtime policy, exact upstream registry component contents, and a migration containing only the nullable proxy-column addition.

Build and test verification is local, not a browser smoke test. Production database preparation was separately authorized and verified as described above; Cloudflare's Git-triggered build/deployment is not certified by the local build. Four pre-existing Vue-dependent suites (`realtime-logs`, `use-link-check`, `use-link-counters`, and `use-link-import`) remain excluded from the Worker pool and outside the current Node profile; the Node profile covers the dashboard link-search store.

## Publication prerequisites and production-change approval

1. Completed: inspected the production schema and migration ledger; `0000`–`0009` were already recorded, and only `0010`/`0011` were pending.
2. Completed: exported and verified a private full production D1 SQL backup before schema changes.
3. Completed: applied only owner-approved `0010` and `0011`, with their normal Wrangler migration ledger entries; no historical create/drop migration replay.
4. Completed: verified the nullable proxy column, the query index, unchanged existing records and no pending migrations. Repository bindings/domain/runtime policy remain preserved.
5. Push the local `master` now that database readiness is confirmed, then monitor the Git-triggered build and deployment. No direct Wrangler deployment is part of this operation.
6. Verify login, existing redirects, create/edit/import/export, MCP authentication and custom gates. Keep `NUXT_PUBLIC_LINK_PROXY_ENABLED=false` unless the owner explicitly enables trusted-target proxying.

For local development, apply local D1 migrations before running the proxy-aware server against an older local database. Verification tests use their own local Worker databases and apply migrations there automatically.

Rolling back application code to fork commit `82e4d2e` does not require dropping the additive nullable column. Do not use the upstream release tag as a rollback substitute for the fork's known-good commit.

## Security follow-up

Previously shared deployment logs exposed a Cloudflare API token and the site token. Revoke/rotate those credentials and store sensitive runtime values as encrypted Secrets before publication. Preserving plaintext dashboard variables does not make leaked values safe, and Wrangler configuration-difference logs may display them again. No credential rotation was performed as part of this local-only integration.
