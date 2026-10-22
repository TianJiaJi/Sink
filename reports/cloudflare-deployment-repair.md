# Cloudflare Deployment Configuration Repair

## Diagnosis

- The failed Workers Builds completed compilation, then failed creating a Worker version because the AI binding could not be generated (Cloudflare error 10021).
- Read-only CLI inspection found that dashboard version `50061973-c877-4e91-a62e-cb521f13746c` had explicitly removed the AI binding.
- The repository still declared the AI binding, so each automatic deployment attempted to recreate it. The earlier selective upstream integration did not change `wrangler.jsonc`; it exposed an existing difference between repository and dashboard configuration when deployment ran.
- AI model listing also returned an authentication error. This repair does not claim to fix the underlying account-level Workers AI problem.
- Before repair, the production custom domain and D1, KV, R2, Analytics and Assets bindings were present. The three plaintext variables and two encrypted secret bindings were also present; the failed uploads had not cleared them.

## Approved changes

- Remove the AI declaration to match the production state approved by the owner.
- Explicitly track the existing `url.846605.xyz` custom domain, including its enabled and preview settings.
- Keep `keep_vars: true`, the existing Workers subdomain settings, and all existing storage resource identifiers.
- Explicitly enable Nitro deployment configuration generation so local verification uses the same generated configuration flow as Workers Builds.
- Regenerate Worker types and declare AI as an optional integration.
- Test absent-AI HTTP 501 responses, and mock AI failures without relying on a deployed binding.
- Add configuration regressions for variable preservation, custom domains and storage bindings.
- Document that dashboard-only binding changes must be reflected in repository declarations.

## Validation before publication

- Node.js 22.23.4 and pnpm 11.11.0.
- Production build passed.
- Enabled Vitest suite passed: 29 files, 270 tests.
- Wrangler deployment dry run passed. Its binding list does not include AI.
- Deployment-input preflight compares the generated file with the redacted remote snapshot and rejects storage, domain or preview-setting changes.
- Deployment uses `--keep-vars` explicitly. No remote database migration command is part of this repair.
- Changed-file lint passed with no errors. Unused generated ESLint directives were removed after regeneration.
- Typecheck reported only the same pre-existing Heatmap, message-scroller and Turnstile errors recorded in the Phase 1 report; no new error locations appeared. Repository-wide lint/typecheck are not claimed to pass.

## Production baseline

Read-only checks before publication:

- `/`: HTTP 200.
- `/dashboard/login`: HTTP 200.
- `/api/verify`: HTTP 200 with the existing site credential.
- `/api/link/count?status=all`: HTTP 200, 38 links.
- `/api/link/ai` with a valid URL: HTTP 501, consistent with the removed AI binding.

Redacted configuration snapshots and local variable fingerprints are retained under the ignored `.pi/` directory. No credential values are included in this report.

## Publication result

- CLI publication succeeded with Worker version `f54cc4c2-70be-4480-ac56-fbf4f3136328` and annotation `preserve-production-no-ai-config`.
- Both the Workers subdomain and `url.846605.xyz` custom domain were deployed; custom-domain previews remain disabled.
- Post-publication homepage, login page and authenticated verification checks returned HTTP 200.
- The all-status link count remained 38 before and after publication.
- All three plaintext variable values matched their pre-publication fingerprints; both encrypted secret bindings remained present.
- D1, KV, R2, Analytics and Assets bindings remained present, and AI remained absent. The AI endpoint continued to return HTTP 501 as expected.
- No database migration, data deletion or production link mutation was executed.
- Wrangler can still display a variable-configuration difference because runtime values are not embedded in the repository. The deployment uses `--keep-vars`, and post-publication fingerprints confirm those values were retained. Wrangler also honors the repository's `keep_vars: true` for subsequent CI deployments.
- These checks validate the CLI publication; a subsequent Git-triggered build must be checked separately in Cloudflare Builds.

## Security follow-up

Earlier shared deployment logs exposed a Cloudflare API token and the site token. Revoke or rotate both and store sensitive runtime values as encrypted Secrets. This repair preserves existing values and does not silently rotate credentials or claim that exposed values are safe.
