# Upstream v0.3.1: Phase 2 Long URL Support

## Scope

- Branch: `sync/upstream-v0.3.1-phase-2`, based on `master` commit `95c100a`.
- Adapted upstream `ccbikai/Sink` commit `4c484b4` (configurable long target URLs), plus the related import-test mocked-global correction from `f6baaa3`.
- Independent review branch only: no merge into `master`, push, deployment, or production database operation is part of this phase.
- MCP, reverse proxy mode, broad API refactors, and Node.js 24 remain deferred.

## Included changes

- Add `NUXT_PUBLIC_MAX_URL_LENGTH`, defaulting to 16384, with startup validation requiring an integer from 256 through 24000.
- Apply the configured write limit to target, Apple, Google, geo-routing and custom A/B variant URLs. Preserve custom Turnstile, country rules, disable, burn-after-read and click-cap fields.
- Add specific localized required, invalid and over-limit URL feedback, with aligned keys and interpolation placeholders across all 11 locales.
- Move exact duplicate lookup to authenticated `POST /api/link/search`, using a request body rather than a potentially oversized query string. Keep keyword search on GET and retain migration gating.
- Expand the existing GET search/count URL validators and link-check target validator to use the configured bound.
- Regenerate Worker environment types for the new public setting.

## Additional compatibility protection

Unlike the upstream patch alone, stored-record and legacy-KV contracts retain a fixed 24000-character read ceiling. Lowering the configured write limit must not make previously accepted records unreadable. Newly submitted create, edit and import payloads still follow the current write limit, including custom A/B targets.

No database schema or migration was required: the existing storage columns are text fields. Platform byte-size and response-header limits still apply; a character limit is not a guarantee that every encoded URL fits every transport limit.

The previous Cloudflare deployment repair remains unchanged: no AI binding is reintroduced, custom-domain declarations and variable preservation remain intact, and no dependency or lockfile changes were made.

## Verification

Executed with Node.js 22.23.4 and pnpm 11.11.0.

- Production build passed after regenerating Worker types.
- Enabled Workers suite passed: 31 files, 293 tests.
- Boundary tests cover supported configuration endpoints, invalid settings, exact-limit and over-limit writes, custom routing URLs, historical reads after lowering the write limit, and HTTP-only link-check targets.
- Active API regressions cover a 16384-character target redirect, POST duplicate lookup, over-limit create/edit/import rejection, custom-field edit/export/import round trips, authentication and migration gating.
- Separate Node-pool client suite passed: 1 file, 5 tests, including long-path duplicate lookup in a POST body. Combined executed coverage is 298 tests across both commands.
- Locale contracts passed: 11 locales, 8 modules.
- Full typecheck reports only the same pre-existing errors in Heatmap, two generated message-scroller components, and the Turnstile `retryOn` option. This phase does not claim a clean repository-wide typecheck.
- Existing repository-wide lint debt remains outside this phase. The finalization command requires changed-file lint and staged whitespace checks to pass before saving the branch commit.

## Client test setup

The existing default Workers suite excludes Vue-dependent composable tests. This phase adds a narrow Node-pool config for the changed search-store suite:

```bash
pnpm exec vitest --config vitest.node.config.ts --run
```

It resolves the existing Vue peer installed for Pinia instead of adding a second Vue dependency, and provides a minimal test-only Nuxt import shim. It does not re-enable the other excluded Vue suites. The import composable's existing mocked globals were aligned with the new schema contract, but that excluded suite was not executed.

No interactive browser smoke test or production-environment test was performed. The existing redirect and D1 integration exclusions remain; the new active long-URL suite supplies focused redirect and storage round-trip coverage without changing those exclusions.

## Review and rollout notes

- Keep the branch separate until the owner approves merging and publishing.
- For a custom limit, use the same public setting in build and runtime, then rebuild. Leaving the setting unset uses the default; invalid or empty values fail validation.
- Decreasing the write limit preserves reads, but editing or re-importing a longer existing URL requires bringing the submitted value within the new write limit.
- Production behavior for extremely large Unicode or multiply encoded URLs remains constrained by Cloudflare and header byte limits.
