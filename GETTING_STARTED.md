# Getting started

This guide is for **first-time** contributors and adopters who want a working local stack without guessing prerequisites. The “three commands” in the README assume everything below is already true.

## What you are setting up

- **Docker** running the **Supabase** local stack (Postgres, PostgREST, Auth, etc.).
- **Node.js 20+** and **pnpm** for the monorepo (tests, SDK, docs).
- **Supabase CLI** so `pnpm start` can drive `supabase start` from `apps/supabase`.

If any of these are missing or misconfigured, `pnpm test` or `pnpm start` will fail in opaque ways—start here before opening an issue.

## 1. Install Docker

Supabase CLI expects a working Docker engine (Docker Desktop on macOS/Windows, or Docker Engine on Linux).

- Start Docker and wait until it is **fully** up (daemon ready).
- On **Linux**, ensure your user can use Docker (e.g. `docker run hello-world` works without `sudo`).
- **WSL2:** run Docker in the environment where you also run `pnpm` (paths and the Docker socket must match).

**Symptom:** `Cannot connect to the Docker daemon` → fix Docker before continuing.

## 2. Install Supabase CLI

Install the [Supabase CLI](https://supabase.com/docs/guides/cli) so `supabase` is on your `PATH`. Version skew with the project can cause odd errors; use a recent CLI.

Verify:

```bash
supabase --version
```

## 3. Node.js and pnpm

- **Node.js 20+** (CI uses 20; newer LTS is usually fine).
- **pnpm 9.x** — the repo pins `packageManager` in root `package.json`. Enable Corepack if needed:

```bash
corepack enable
corepack prepare pnpm@9.12.3 --activate
```

## 4. Clone and install dependencies

```bash
git clone https://github.com/workorder-systems/db.git
cd db
pnpm install
```

## 5. Environment variables (tests and tooling)

From the **repository root**, copy the example env file:

```bash
cp .env.example .env.local
```

For **local Supabase** (default after `pnpm start`), tests can discover the stack automatically when `SUPABASE_URL` / `SUPABASE_ANON_KEY` are **not** set—see `tests/setup.ts`. For a **remote** project, put real values in `.env.local` (see `.env.example`).

**Never commit** `.env.local` or service role keys.

## 6. Start Supabase

From the repo root:

```bash
pnpm start
```

This runs the Supabase workspace (`apps/supabase`). The **first** cold start can take **one to two minutes**; later starts are faster.

Check status:

```bash
cd apps/supabase && supabase status
```

You should see API URL (this repo defaults to **`http://127.0.0.1:54321`**) and DB connection info. Direct Postgres uses **`[db].port`** from `config.toml` (often **54332** here—not Supabase’s stock 54322). See [`apps/supabase/README.md`](apps/supabase/README.md#local-development).

**OAuth 2.1 consent UI (optional):** with **`[auth.oauth_server].enabled`** in `apps/supabase/config.toml`, run the Next app **`pnpm --filter work-order-systems-oauth dev`** (port **3005**, matching **`site_url`**) and set **`NEXT_PUBLIC_SUPABASE_URL`** / **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** in **`apps/oauth/.env.local`** (see **`apps/oauth/.env.local.example`**). The **`/demo`** register button uses dynamic client registration only (no service role in this app). Details: [`apps/oauth/README.md`](apps/oauth/README.md) and [`apps/supabase/README.md`](apps/supabase/README.md#oauth-21-server-identity-provider).

## 7. Run the test suite

In a **new terminal** (keep Docker/Supabase running):

```bash
pnpm test
```

If you see many **auth** or **schema** errors after pulling `main`, reset the database so migrations match:

```bash
pnpm supabase:reset
pnpm test
```

Or one shot:

```bash
pnpm test:reset
```

## Common problems

| Problem | What to try |
|--------|-------------|
| Docker not running | Start Docker; retry `pnpm start`. |
| Port already in use | Another Supabase or Postgres on 54321/54332/etc. Stop it or change ports in `apps/supabase/config.toml` (advanced). |
| Stale `.next` or build errors in docs | `rm -rf apps/docs/.next` and rebuild. |
| “Database error finding user” in tests | `pnpm supabase:reset` then `pnpm test`. |
| Remote Supabase env vars wrong | Fix `.env.local`; ensure URL and keys match the same project. |

## Next steps

- **Schema and API rules:** [`apps/supabase/README.md`](apps/supabase/README.md)
- **Contributing and migrations:** [`CONTRIBUTING.md`](CONTRIBUTING.md)
- **Agent/automation playbook:** [`AGENTS.md`](AGENTS.md)
- **Vision, alpha, stability, license:** [`docs/PROJECT.md`](docs/PROJECT.md)
