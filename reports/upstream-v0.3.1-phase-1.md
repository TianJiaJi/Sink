# Upstream v0.3.1: Phase 1 Integration

## Scope

- Branch: `sync/upstream-v0.3.1`.
- Local starting commit: `270452f` on `master`.
- Inspected upstream: `https://github.com/ccbikai/Sink`, `master` at `bafa4e1` (v0.3.1).
- This is a selective integration, not a complete merge of upstream v0.3.1. The application version remains 0.3.0.
- Upstream history contains equivalent changes with different commit IDs. `445f050` corresponds to the last synchronized upstream change; the older Git merge base exaggerates the amount of new work.

## Included changes

1. Reject reserved slugs in create and import contracts, including case variants. Keep edit, stored-record, and legacy-KV parsing compatible.
   - Source: upstream `5892ed6`.
2. Quote hyphenated Analytics Engine dataset names while retaining identifier validation.
   - Source: upstream `f1dea98`.
3. Export all, active, or expired links, validate export query parameters, and include effective expiration in exports without updating stored rows.
4. Disable the preview-mode import picker and reject preview-mode import requests on the server.
   - Sources for export/import changes: upstream `e60432f`, including translations for all 11 locales.
5. Honor `NUXT_PUBLIC_HOME_URL` during SPA navigation and full-page requests. Keep `NUXT_HOME_URL` as a legacy server-side fallback and build-time initializer.
   - Adapted from the final homepage configuration in upstream `bafa4e1`, including compatibility work in `5d61cd1`.
   - Public settings require a rebuild; changing only the legacy runtime variable does not change the built SPA.
6. Disable remote bindings in Vitest only. The existing remote AI binding required an expired Cloudflare login before tests could start. The successful test run used local bindings instead; `wrangler.jsonc` was not changed.

## Preserved and deferred

- Preserved custom Turnstile, disable, burn-after-read, country rules, A/B routing, click caps, reset-clicks, and batch-operation code.
- Added an export/import round-trip regression for custom fields.
- No database schema, migration, dependency, lockfile, or deployment configuration changes.
- Deferred MCP, reverse proxy mode, long-URL support, broad API refactors, Node.js 24 requirements, and generated UI component refactors.
- No push, deployment, production database migration, or merge into `master` was performed.

## Verification

Executed with Node.js 22.23.4 and pnpm 11.11.0.

- **Production build:** passed using `node scripts/build-sphere.js` followed by `pnpm exec nuxt build`, with an 8 GB Node heap.
- **Enabled Vitest suite:** passed, 28 files and 264 tests, using local bindings.
- **Locale contracts:** passed, 11 locales and 8 modules.
- **Changed-file lint:** passed with 0 errors and 0 warnings, including the final test configuration and this report. The export component's line-ending warning was corrected without changing behavior.
- **Whitespace validation:** passed before final staging; checked again before committing.
- **Repository-wide lint:** blocked by 37 errors and 170 warnings. All error locations are in files unchanged from `master`: `CLAUDE.md`, the English and Chinese Pages deployment documents, and migration snapshots `0005` through `0010`.
- **Repository-wide typecheck:** blocked by errors in unchanged files, listed below.

The normal build script uses POSIX shell syntax and has a deployment-sensitive `postbuild` hook. Verification ran the equivalent prebuild and Nuxt build steps directly on Windows, without invoking that hook.

### Typecheck blockers

- `app/components/dashboard/analysis/Heatmap.vue:291`: implicit `any` parameter.
- `app/components/ui/message-scroller/MessageScroller.vue:15`: implicit `any` parameter.
- `app/components/ui/message-scroller/MessageScrollerViewport.vue:68`: implicit `any` parameter.
- `server/utils/turnstile.ts:54`: unsupported `retryOn` fetch option, reported in two TypeScript projects.

These files are unchanged from `master`. No unrelated fixes or hand-edits to generated UI components were included.

### Coverage limits

The existing Vitest exclusions were retained:

- `tests/redirect.spec.ts`.
- `tests/api/link-d1.spec.ts`.
- Vue-dependent search-store, realtime-log, link-check, link-counter, and import composable unit suites listed in `vitest.config.ts`.

New active suites cover export filtering and pagination, effective expiration, invalid export status, preview import rejection, custom-field round trips, homepage runtime configuration, and SPA middleware decisions. Existing active tests cover reserved-slug rejection and Analytics SQL compilation.

No interactive browser smoke test or deployment-environment test was performed. The passing enabled test suite does not imply that excluded suites or all custom-feature combinations have been validated.

## Recommendation

Keep this branch separate from `master` for review. Phase 1 builds and its enabled tests pass, but the repository-wide lint/typecheck gates are not green. Resolve or explicitly accept those blockers and perform a browser smoke test before treating the branch as fully verified for production.
