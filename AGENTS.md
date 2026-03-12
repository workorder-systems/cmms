# AGENTS.md

## Cursor Cloud specific instructions

### Architecture overview

This is a pnpm monorepo (Turborepo) for a multi-tenant CMMS (Computerized Maintenance Management System). Key workspaces:

| Workspace | Path | Purpose |
|-----------|------|---------|
| Root (`database`) | `/workspace` | Supabase migrations, Vitest integration/RLS tests |
| Web app | `apps/web` | React + Vite + TanStack Router SPA |
| Docs | `apps/docs` | Next.js 15 documentation site |
| SDK | `packages/sdk` | Type-safe domain SDK wrapping Supabase views + RPCs |
| UI | `packages/ui` | Shared component library (Radix UI, Tailwind v4) |

### Prerequisites (already installed in the VM snapshot)

- Docker (with `fuse-overlayfs` storage driver and `iptables-legacy`)
- Supabase CLI (installed via `.deb` from GitHub releases)
- Node.js 22 + pnpm 9.12.3

### Starting services

1. **Docker daemon** must be running first: `sudo dockerd &>/dev/null &` then wait 3s. Fix socket permissions if needed: `sudo chmod 666 /var/run/docker.sock`.
2. **Supabase local stack**: `supabase start` from the workspace root. Takes ~2 minutes on first cold start (pulls Docker images). Subsequent starts are faster.
3. **Env files**: The `.env.local` files in `/workspace` and `/workspace/apps/web` must point to the local Supabase instance (`http://127.0.0.1:54321`). The web app uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (the Supabase anon key JWT).
4. **Web app**: `pnpm dev` from root (uses Turborepo) or `pnpm dev` from `apps/web`. Runs on `http://localhost:5173`.

### Critical gotcha: Cursor Cloud injected secrets override `.env.local`

If `VITE_SUPABASE_URL` or `VITE_SUPABASE_PUBLISHABLE_KEY` are set as Cursor Cloud Secrets, they will be injected as process environment variables and **override** the `.env.local` file (Vite gives process env vars higher priority). To use local Supabase, either:
- Remove those secrets from the Cursor Secrets panel, OR
- Start the Vite dev server with: `env -u VITE_SUPABASE_URL -u VITE_SUPABASE_PUBLISHABLE_KEY pnpm dev`

### PostgREST schema cache

After `supabase start`, if you get "Could not find the table 'public.v_tenants' in the schema cache" errors, restart PostgREST:
```bash
docker restart supabase_rest_database
```
Or send a NOTIFY: `docker exec supabase_db_database psql -U postgres -c "NOTIFY pgrst, 'reload schema';"`

### Running tests

- `pnpm test:ci` — runs all 34 test files (526 tests), excludes the `similar_past_fixes_e2e` test that requires `OPENAI_API_KEY`
- `pnpm test` — runs all tests including the e2e test (will fail without `OPENAI_API_KEY`)
- Tests require Supabase local stack to be running. The test setup (`tests/setup.ts`) auto-starts it if needed.

### Running lint

- `pnpm lint` — runs lint across all workspaces via Turborepo
- Pre-existing issues: the web app is missing an `eslint.config.js`, and the UI package has 155 warnings with `--max-warnings 0`

### Building

- `pnpm build` — builds all packages. The SDK builds successfully. The web app runs `vite build` only (no `tsc -b`) so the bundle builds despite pre-existing TS errors in `packages/ui` (Storybook stories, data-table types). To type-check the web app and UI: `pnpm --filter work-order-systems-web typecheck` (will report ~240 errors until UI/stories are fixed).

### Database

- 29 migration files across 7 custom schemas (`app`, `cfg`, `int`, `audit`, `util`, `authz`, `pm`)
- See `supabase/README.md` for architecture rules and patterns
- Auth uses a custom access token hook (`authz.custom_access_token_hook`) that adds tenant_id to JWT claims
- `enable_confirmations = false` in local config — sign-up auto-confirms users
