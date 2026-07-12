# Sink Repository Guide

## Non-obvious constraints

- Write all documentation and code comments in English.
- Use Node.js 22 and pnpm 11.11.0 (`package.json` is authoritative). This is a single-package app; `pnpm-workspace.yaml` only controls dependency build policy.
- Do not hand-edit `app/components/ui/**`; it is managed by shadcn-vue and excluded from ESLint.
- Nuxt and server utilities are auto-imported. Follow nearby code before adding explicit imports for framework globals.

## Setup and commands

```bash
pnpm install                              # also runs build:map, nuxt prepare, and hook setup
pnpm dev                                  # Nuxt dev server on port 7465
pnpm build                                # production build with an 8 GB Node heap
pnpm preview                              # requires existing .output build artifacts
pnpm lint                                 # check only
pnpm lint:fix                             # modifies files
pnpm types:check
pnpm test --run                           # full Vitest run, not watch mode
pnpm test --run tests/api/link.spec.ts    # one test file
pnpm test --run -t 'creates new link'     # tests matching a name
```

- ESLint and TypeScript extend generated `.nuxt` files. If they are missing, run `pnpm postinstall` (or `pnpm install`) before diagnosing config errors.
- Authenticated tests need `NUXT_SITE_TOKEN`; local values are loaded from `.env`, with `.env.example` as the template.
- There is no validation CI workflow. Run the relevant lint, typecheck, and test commands locally.
- The pre-commit hook only runs `eslint --fix` on staged JS/TS/Vue files; it does not replace full-project verification.

## Architecture and data flow

- `app/` is a client-only Nuxt 4 UI (`ssr: false`); `/` and `/dashboard/**` are prerendered. `server/` is the Nitro backend using the `cloudflare-module` preset outside CI.
- `shared/` owns schemas, cross-runtime utilities, and shared types. Prefer `#shared/...`; `app/types/index.ts` only re-exports selected shared types for UI use.
- D1 is the authoritative link store. KV is a write-through read cache and the temporary source for pre-D1 links until the KV-to-D1 migration marker is set. Route link persistence through `server/utils/link-store.ts`; direct KV-only writes can lose authoritative data.
- `server/middleware/1.redirect.ts` intentionally runs before `2.auth.ts`: public short-link resolution happens first, while every `/api/**` request is authenticated by site token or allowed Cloudflare Access identity.
- Cloudflare bindings are declared in `wrangler.jsonc`: `DB`, `KV`, `ANALYTICS`, `AI`, `R2`, and `ASSETS`. Regenerate `worker-configuration.d.ts` with `pnpm gen:types` after changing bindings.

## Database and deployment

```bash
pnpm db:generate         # schema: server/database/schema.ts; output: drizzle/
pnpm db:migrate:local    # apply migrations to local Wrangler D1
pnpm db:migrate:remote   # mutates the configured remote D1 database
```

- Commit generated migrations when changing the Drizzle schema; tests read and apply migrations from `drizzle/` automatically.
- `pnpm deploy:pages` and `pnpm deploy:worker` both run remote D1 migrations before publishing and assume build artifacts already exist. Treat them as production-mutating commands, not verification commands.

## Testing quirks

- Vitest uses `@cloudflare/vitest-pool-workers`, `wrangler.jsonc`, one Worker, `isolate: false`, and `maxWorkers: 1`. Storage is shared across the run.
- Use unique slugs and cleanup helpers from `tests/utils.ts`; do not make state-sharing suites concurrent.
- `tests/setup.ts` applies all D1 migrations before tests. Update migrations, not ad hoc test setup, when schema changes.

## Generated artifacts

- `pnpm install` regenerates ignored `public/world.json` via `build:map`.
- `pnpm build` regenerates `public/sphere.bin` through its prebuild hook. `build:colo` and `build:testimonials` generate `public/colos.json` and `app/data/testimonials.json`; the testimonial task is network-dependent and randomizes order.
