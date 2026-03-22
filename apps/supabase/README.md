# Supabase database architecture

SQL migrations and CLI config for the **multi-tenant CMMS** Postgres backend. Application code is expected to use **PostgREST** (`public` RPCs/views and `reporting` views)—not direct access to internal schemas.

**Related docs:** [AGENTS.md](../../AGENTS.md) (agent playbook, ports, tests), [CONTRIBUTING.md](../../CONTRIBUTING.md) (workflow), [tests/README.md](../../tests/README.md) (how we verify the contract).

---

## Contents

- [Folder layout](#folder-layout)
- [Schemas](#schemas)
- [What PostgREST exposes](#what-postgrest-exposes)
- [Public API contract](#public-api-contract)
- [Auth and tenant context](#auth-and-tenant-context)
- [Modules, plugins, integrations](#modules-plugins-integrations)
- [Naming conventions](#naming-conventions)
- [Security model](#security-model)
- [Workflows and catalogs](#workflows-and-catalogs)
- [Audit, rate limits, analytics](#audit-rate-limits-analytics)
- [Edge Functions](#edge-functions)
- [Migration rules](#migration-rules)
- [Adding a new domain area](#adding-a-new-domain-area)
- [Local development](#local-development)

---

## Folder layout

| Path | Role |
|------|------|
| **config.toml** | Local Supabase stack settings (`project_id`, API/db ports, exposed schemas, auth hooks). |
| **migrations/** | Ordered, versioned SQL (Supabase CLI). Source of truth for schema. |
| **functions/** | Edge Functions (Deno) deployed with the project; optional side paths to Postgres/API. |
| **.gitignore** | Local CLI artifacts (not committed). |

---

## Schemas

Postgres schemas are **separated by responsibility**. Only some are visible through the API (see next section).

| Schema | Purpose |
|--------|---------|
| **extensions** | Extensions (`pgcrypto`, `citext`, `vector`, etc.). Managed with care in migrations. |
| **app** | Core write model: tenants, assets, locations, work orders, and related CMMS entities. |
| **cfg** | Tenant configuration: roles, permissions, workflow/status/priority catalogs. |
| **authz** | Authorization helpers: membership checks, RLS support, **`authz.custom_access_token_hook`** for JWT claims. |
| **util** | Shared triggers and helpers (`updated_at`, immutability, validations, rate limiting). |
| **audit** | Audit streams (e.g. entity and permission changes) for compliance and forensics. |
| **int** | Integrations: webhooks, async job metadata, opaque external references—**not** secrets. |
| **pm** | Preventive maintenance logic (scheduling, triggers, PM-related business rules). |
| **reporting** | Analytics layer: dimension/fact/KPI-style views for BI export; tenant-scoped, **`security_invoker`** views. |
| **public** | API façade: RPCs and read views that wrap internal tables. Clients use this (and **reporting**) only. |

Internal schemas (**app**, **cfg**, **audit**, **util**, **authz**, **pm**, **int**) are not listed in `[api].schemas`; clients still **reference** them indirectly through `public`/`reporting` objects.

---

## What PostgREST exposes

Configured in **`config.toml`** under `[api]`:

- **schemas:** `public`, `reporting`
- **API URL (local default):** `http://127.0.0.1:54321`
- **extra_search_path:** includes `extensions` where needed for types/operators

After adding or renaming API-facing objects, if PostgREST returns stale “not in schema cache” errors, reload the REST container or `NOTIFY pgrst`—see [AGENTS.md](../AGENTS.md#postgrest-schema-cache).

---

## Public API contract

For **authenticated application users**:

1. **Reads** — Prefer **`public.v_*`** views (and **`reporting.*`** for analytics-shaped reads). No direct table access from clients.
2. **Writes** — Go through **`public.rpc_*`** functions that enforce permissions and invariants.
3. **Internals** — Tables in **app** / **cfg** / etc. are implementation details; API stability is defined by RPCs and views.

---

## Auth and tenant context

- **`[auth.hook.custom_access_token]`** in `config.toml` points at **`authz.custom_access_token_hook`**, which enriches JWTs (e.g. **`tenant_id`**) from user metadata.
- **`authz.get_current_tenant_id()`** reads JWT claims (and may fall back to a session setting for RPC internals). **Do not** treat **`app.current_tenant_id`** or similar session context as the primary security boundary—**RLS** must tie access to **`auth.uid()`** and membership.
- Local **`enable_confirmations = false`** makes sign-up practical for dev; see `config.toml` for auth-related toggles.

---

## Modules, plugins, integrations

Product-level split (keeps schema changes disciplined):

| Term | Meaning |
|------|---------|
| **Module** | Core capability; may add or change tables, RPCs, and views. |
| **Plugin** | Optional behavior on top of existing modules; **avoid** new schema surface unless the module itself evolves. |
| **Integration** | Connects to external systems; **secrets stay outside Postgres**. **int** holds references and integration metadata only. |

---

## Naming conventions

- **Views (public):** `v_<resource>` (plural resource names). Summaries: `_summary`, `_overview`. Breaking changes: prefer additive columns first; if incompatible, use versioned names (e.g. `_v2`).
- **RPCs:** `rpc_<verb>_<resource>`. Version the RPC name if the contract breaks.
- **Parameters:** When **`p_tenant_id`** is required, it is typically **first**, then primary entity ids—follow existing siblings in `public`.

---

## Security model

- **RLS** is enabled on tenant-scoped tables. Policies should express **who is a member of which tenant** using **`auth.uid()`** and membership tables.
- **Fine-grained permissions** (roles, ABAC scopes) are enforced in **RPCs** and configuration—not by overloading RLS with every permission rule.
- **ABAC** scopes (e.g. location/department) live in the model (see **`app.membership_scopes`** and related APIs).
- **Reporting** views use **`security_invoker = true`** so invoker rights and RLS on underlying **app** data apply correctly.

---

## Workflows and catalogs

Work order workflows are **tenant-configurable**. Status catalogs and transitions live in **`cfg.status_catalogs`** and **`cfg.status_transitions`**; priorities in **`cfg.priority_catalogs`**. **Mutating transitions** must go through the appropriate RPCs so guard conditions and permissions stay centralized.

---

## Audit, rate limits, analytics

| Concern | Mechanism |
|---------|-----------|
| **Audit** | **`audit.entity_changes`**, **`audit.permission_changes`**, and related triggers where migrations add them. |
| **Rate limits** | **`util.check_rate_limit`** (and similar) for hot RPCs. |
| **Analytics** | **`reporting`** schema views; refresh orchestration via RPCs such as **`public.refresh_analytics_views()`** where defined in migrations. |

---

## Edge Functions

- **`functions/ingest-meter-reading/`** — Example/production path for meter ingestion; uses env (`SUPABASE_URL`, **`SUPABASE_SERVICE_ROLE_KEY`**, etc.) when run with `supabase functions serve` (see root **`package.json`** script **`supabase:functions`**).

Add new functions alongside existing ones; keep secrets in env or your host’s secret store, not in SQL.

---

## Migration rules

When you add or change schema:

1. Create a new file under **`migrations/`** using the Supabase CLI timestamp pattern (**`YYYYMMDDHHmmss_short_description.sql`**).
2. Use **lowercase SQL** and a **header comment** (purpose, affected objects, rollback notes if non-trivial).
3. **Enable RLS** on new tenant tables; add **explicit policies** (select/insert/update/delete as appropriate) aligned with membership.
4. Add **`updated_at`** / immutability triggers via **`util`** patterns where the domain expects them.
5. Add **audit** triggers for sensitive or regulated entities when migrations establish new core tables.
6. Expose behavior through **`public` RPCs/views** (and **`reporting`** if analytics-facing), not raw table grants to `anon`/`authenticated`.
7. Add or extend tests under **`tests/`** for RLS, RPC errors, and view shape.

Cursor-specific checklist: **`.cursor/rules/migration.mdc`** at repo root. Postgres style: **`.cursor/rules/postgres.mdc`**.

---

## Adding a new domain area

1. Place tables in **app** and/or **cfg** (configuration-heavy pieces in **cfg**).
2. Add RLS and any tenant-consistency triggers.
3. Add **`public.rpc_*`** for writes and **`public.v_*`** (or **reporting** views) for reads.
4. Register **permissions** in **`cfg.permissions`** and default role mappings as needed.
5. Wire **audit** / **analytics** if the domain is security- or ops-sensitive.
6. Ship **Vitest** coverage in **`tests/`**.

---

## Local development

This directory is the **Supabase CLI project** (`config.toml`, `migrations/`, `functions/`). From the **repository root**:

| Task | Command |
|------|---------|
| Install deps | `pnpm install` |
| Start stack | `pnpm start`, `pnpm supabase:start`, or `cd apps/supabase && supabase start` |
| Reset DB (all migrations from scratch) | `pnpm supabase:reset` |
| Run DB tests | `pnpm test` |

**Ports (see `config.toml`—values may differ if you changed them):**

- **PostgREST / Supabase API:** `54321`
- **Postgres (direct):** default local project uses **`[db].port`** (this repo uses **54332** rather than the stock 54322 to reduce collisions). Use **`supabase status`** for the exact connection string after start.

**Environment:** Root **`.env.local`** supplies **`SUPABASE_URL`**, **`SUPABASE_ANON_KEY`**, **`SUPABASE_SERVICE_ROLE_KEY`** for tests and tooling (see **`.env.example`**).

---

## License

Migrations and SQL follow the repository license (**AGPL-3.0-or-later** unless a file header states otherwise). For **open-source status**, **alpha** expectations, and what this repo includes vs excludes, see the monorepo root **README** (sections *Where we are today* and *Open source and license*).
