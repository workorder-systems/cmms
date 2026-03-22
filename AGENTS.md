# AGENTS.md

## Cursor Cloud and local development

### Architecture overview

This is a **pnpm** monorepo (**Turborepo**) for a multi-tenant CMMS **database layer** and related packages. In Cursor Cloud the checkout is often at `/workspace`; locally it is your clone path.

| Workspace | Path | Purpose |
|-----------|------|---------|
| Root (`database`) | `.` | Supabase migrations, root Vitest suite (`tests/`), scripts |
| Docs | `apps/docs` | Next.js documentation site (MDX) |
| SDK | `packages/sdk` | Type-safe SDK for the public Supabase API (views + RPCs) |
| UI | `packages/ui` | Shared components (Radix UI, Tailwind v4, Storybook) |
| ESLint config | `packages/eslint-config` | Shared flat ESLint configs |
| TypeScript config | `packages/typescript-config` | Shared `tsconfig` presets |

The customer-facing **SPA is not in this repository** (this repo is schema, tests, SDK, docs site, and UI package).

### Playbook for cloud agents (what to do)

Use this as a default order of operations. Adjust when the user’s task is narrowly scoped (e.g. docs-only).

#### 1. Orient yourself

- Read **`supabase/README.md`** before changing schema, RLS, views, or RPCs.
- For **new migrations**, follow project SQL/RLS conventions in **`.cursor/rules/migration.mdc`** (and **`CONTRIBUTING.md`** → Database changes).
- For **tests**, read **`tests/README.md`** for what the suite covers and which helpers exist.

#### 2. Change the database

1. Add a new file under **`supabase/migrations/`** (Supabase CLI naming: `YYYYMMDDHHmmss_description.sql`), with a header comment and **lowercase** SQL.
2. Prefer **RLS on new tables**, tenant-scoped policies, and exposing writes through **RPCs** / reads through **`public` (or `reporting`) views**—see `supabase/README.md`.
3. Apply locally: **`pnpm supabase:reset`** (or `supabase db reset`) so the DB matches all migrations, then fix forward if something breaks.
4. If PostgREST does not see new objects, see **PostgREST schema cache** below.

#### 3. Write tests

- Put integration tests in **`tests/*.test.ts`** (Vitest, Node environment, setup in **`tests/setup.ts`**).
- **DB contract / RLS / RPCs:** almost all `*.test.ts` files **except** **`tests/sdk.test.ts`** use the Supabase JS client and helpers in **`tests/helpers/`** (`supabase.ts`, `tenant.ts`, `auth.ts`, `entities.ts`, `rpc.ts`, etc.).
- **SDK:** extend or add coverage in **`tests/sdk.test.ts`** when the typed SDK must stay aligned with the API.
- Reuse helpers instead of ad-hoc clients; use **`createServiceRoleClient()`** only when the scenario requires bypassing RLS.
- Prefer assertions that include PostgREST **code / details / hint** (helpers already surface these where relevant).

#### 4. Run tests

From the **repository root**:

| Goal | Command |
|------|---------|
| Full suite (matches CI style) | `pnpm test` or `pnpm test:ci` |
| Faster config | `pnpm test:fast` |
| DB tests only (skip SDK file) | `pnpm test:db` |
| SDK file only | `pnpm test:sdk` |
| One file | `pnpm test -- tests/work_orders.test.ts` |
| One test by name | `pnpm test -- -t "should create a work order"` |
| DB out of sync / many auth errors | `pnpm test:reset` (reset + test) |

Ensure **Docker + Supabase** are available. If **`SUPABASE_URL`** and **`SUPABASE_ANON_KEY`** are **not** set, **`tests/setup.ts`** will run **`supabase start`** when the stack is down. For a **remote** project, set those (and **`SUPABASE_SERVICE_ROLE_KEY`**) in **`.env.local`**—then local Supabase will not be started by tests.

#### 5. Regenerate types and package tests

- After schema or RPC/view changes that affect the public API, run **`pnpm gen-types`** and commit updates to **`packages/sdk/src/database.types.ts`** when they are part of the contract.
- Run **`pnpm test:all`** if you changed **`packages/sdk`** (runs that package’s **`test`** task via Turborepo as well as whatever else defines `test`).

#### 6. Before you call a task “done”

- Run **`pnpm test`** (or the narrowest command above that still covers your change).
- If you touched **docs app** or **UI**, try **`pnpm lint`** and **`pnpm build`**; fix any failures you introduced.
- Summarize what you changed (migrations, tests, generated types) for the user or PR description.

### Prerequisites

- **Docker** (Cursor Cloud images typically include usable storage/network defaults for the Supabase stack.)
- **Supabase CLI**
- **Node.js 20+** (GitHub Actions uses Node 20; newer LTS is fine.)
- **pnpm 9.12.3** — pinned via `packageManager` in root `package.json` (use `corepack enable` if needed).

### Starting services

1. **Docker** must be running. On Cursor Cloud: `sudo dockerd &>/dev/null &`, wait a few seconds, then if needed `sudo chmod 666 /var/run/docker.sock`.
2. **Supabase** from the repository root: `pnpm supabase:start` or `supabase start`. First cold start can take ~2 minutes; later starts are faster.
3. **Environment**: put **`SUPABASE_URL`**, **`SUPABASE_ANON_KEY`**, and **`SUPABASE_SERVICE_ROLE_KEY`** in a **root** `.env.local` for Vitest (see `.env.example`). `tests/setup.ts` loads `.env.local` / `.env` explicitly. With local CLI defaults, the API URL is `http://127.0.0.1:54321`.
4. **Dev servers**: `pnpm dev` runs every workspace **`dev`** script via Turborepo (e.g. SDK `tsup --watch`, docs Next.js, UI Storybook). Run one workspace only, for example:
   - `pnpm --filter work-order-systems-docs dev` → Next.js (default **http://localhost:3000**)
   - `pnpm --filter @workspace/ui dev` → Storybook (**http://localhost:6006**)
   - `pnpm --filter @workorder-systems/sdk dev` → SDK watch build

### Environment variable precedence

If variables are set in the **process environment** (e.g. Cursor Cloud Secrets) **and** in `.env.local`, tools that merge both usually prefer the process environment. Vitest loads `.env.local` in `tests/setup.ts`, but shell-injected values can still override depending on how the runner is started—unset or adjust secrets if local Supabase URLs/keys disagree.

### PostgREST schema cache

After `supabase start`, errors like a table missing from the schema cache are often fixed by reloading PostgREST:

```bash
docker restart supabase_rest_database
```

Or:

```bash
docker exec supabase_db_database psql -U postgres -c "NOTIFY pgrst, 'reload schema';"
```

Names assume `project_id = "database"` in `supabase/config.toml`.

### Running tests

- **`pnpm test`** / **`pnpm test:ci`** — root Vitest suite (`vitest run`, config `vitest.config.ts`).
- **`pnpm test:fast`** — same runner with `vitest.config.fast.ts` when you need a quicker subset/config.
- **`pnpm test:db`** — root tests excluding `tests/sdk.test.ts`.
- **`pnpm test:sdk`** — only `tests/sdk.test.ts`.
- **`pnpm test:all`** — `turbo run test` (includes `packages/sdk` and any other package that defines `test`).
- **`pnpm test:reset`** — `supabase db reset` then **`pnpm test`** (use when migrations are ahead of the local DB).

`tests/setup.ts`: if **`SUPABASE_URL`** and **`SUPABASE_ANON_KEY`** are set, it **does not** start Supabase locally; otherwise it runs **`supabase start`** when **`supabase status`** fails.

If many tests fail with auth/schema errors, reset the DB (`pnpm supabase:reset` or `pnpm test:reset`). See **CONTRIBUTING.md** (Tests).

### Lint and build

- **`pnpm lint`** — Turborepo runs `lint` only where defined. Today that is mainly **`apps/docs`** (`next lint`) and **`packages/ui`** (`eslint .` via `eslint.config.js` with `--max-warnings 0`). Next.js 15 still ships `next lint` but deprecates it; first-time setup can prompt for ESLint options in some environments.
- **`pnpm build`** — builds **`packages/sdk`** and **`apps/docs`**. **`packages/ui`** has no root `build` script; use `pnpm --filter @workspace/ui build-storybook` for a static Storybook bundle.

### Type generation

- **`pnpm gen-types`** — runs `packages/sdk/scripts/gen-types.sh` to refresh `packages/sdk/src/database.types.ts` (requires Supabase CLI and appropriate DB/API access).

### Database

- Migrations live in `supabase/migrations/` (50+ SQL files; grows with the project).
- Custom schemas include **`app`**, **`cfg`**, **`int`**, **`audit`**, **`util`**, **`authz`**, **`pm`**, and **`reporting`** (plus standard **`extensions`** usage where migrations create it). See **`supabase/README.md`** for architecture rules.
- PostgREST exposes **`public`** and **`reporting`** (`[api].schemas` in `supabase/config.toml`).
- Local DB port is **54332** (not the Supabase default 54322) per `[db].port` in `supabase/config.toml`—use that URL when connecting with `psql` or GUI clients.
- Auth: **`authz.custom_access_token_hook`** (wired in `supabase/config.toml`) adds tenant context to JWT claims from user metadata.
- **`enable_confirmations = false`** in local config — sign-up is auto-confirmed for development.
