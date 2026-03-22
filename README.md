# Work Order Systems - Database

[![CI](https://github.com/workorder-systems/db/actions/workflows/test.yml/badge.svg)](https://github.com/workorder-systems/db/actions/workflows/test.yml)
[![License](https://img.shields.io/github/license/workorder-systems/db)](LICENSE)
[![Stage](https://img.shields.io/badge/stage-alpha-orange)](README.md#where-we-are-today)

## Vision

**WorkOrder Systems OSS is the Linux of maintenance software.**

A **production-grade, self-hostable CMMS** that any maintenance team in the world can **deploy, own, and extend**—with **no vendor lock-in**, **no per-seat extortion**, and **no black-box workflows**.

The goal is not “good enough open source.” It is the **best CMMS core that exists, period**—one that:

- **Any developer** can understand, audit, and extend in an afternoon
- **Any team** can self-host on about **$20/month** of infrastructure
- **Any vendor** can build **plugins and integrations** against
- **Becomes the default substrate** the maintenance software **ecosystem** builds on

The **commercial product** wins because the **OSS is genuinely excellent**—not crippled to make the paid tier look good. That is the **GitLab model**, not the open-core bait-and-switch.

## Where we are today

**Alpha.** The stack is **not production-stable** as a turnkey product: schema, RPCs, and SDK surfaces **will change**, coverage and hardening are still growing, and there is **no beta or GA promise** on a fixed date. Use it to learn, prototype, and contribute—or run it in production only with **your own** risk assessment, pinning, and operational discipline.

The vision above is **in motion**. The sections below stay concrete about license, stability, and scope so you can adopt or contribute with eyes open.

## Stability and releases

Use this table when deciding **how** to depend on this project—especially because **semver and LTS are not the story yet**.

| Concern | Today (alpha) | What to do |
|--------|----------------|------------|
| **Database schema** | **No semver** on migrations. **`main` is the contract.** | **Pin a git commit.** Review migration diffs before upgrading. |
| **Public API** (views + RPCs) | Moves with migrations; enforced by **CI integration tests**. | Regenerate types: `pnpm gen-types` after upgrades. |
| **`@workorder-systems/sdk`** | **0.x**, tracks **`main`**; not a separately stabilized release line. | Pin **package version** *and* a **monorepo commit** if you need lockstep behavior. |
| **Git tags / GitHub Releases** | **None** for upgrade ordering. | Do **not** assume tagged drops mean compatibility promises. |
| **Long-term support (LTS)** | **No LTS branch** or backport policy yet. | Plan your own fork or pin until we announce otherwise. |

**Practical advice:** Treat **`main`** like a rolling integration branch: **pin a SHA**, run **`pnpm test`** (or your own smoke tests) before adopting updates, and own your upgrade path. When semver, release cadence, or LTS exist, we will document them here and in release notes.

**Open source.** The repository is released under the [GNU Affero General Public License v3.0 or later](LICENSE). See [Open source and license](#open-source-and-license) for what that implies for use and hosting.

**What is in this repo**

| Area | Role |
|------|------|
| **Migrations + RLS** | Source of truth for the CMMS schema; apply with Supabase CLI to your project. |
| **`@workorder-systems/sdk`** | Typed client over public views and RPCs (**alpha** / **0.x**). |
| **`apps/docs/`** | Public API / domain documentation (Next.js). |
| **`apps/supabase/functions/`** | Edge Functions (e.g. meter ingest); same AGPL license as the rest of the tree unless a file states otherwise. |
| **`tests/`** | Vitest integration tests against a real local (or configured remote) Supabase stack. |
| **`plugins/example/`** | Minimal webhook receiver for local plugin smoke tests. |
| **`packages/ui`** | Shared UI primitives (used by docs/Storybook; not a full application shell). |

**What is not in this repo**

The **customer-facing product SPA** (hosted app UI) lives **outside** this repository. This tree is the **database layer, SDK, tests, and docs** so you can build your own apps or internal tools on top of Supabase + the SDK.

## Open source and license

Licensed under **AGPL-3.0-or-later**. The full legal text is in [LICENSE](LICENSE).

**Plain-language pointer (not legal advice):** You can use, modify, and redistribute this code. The Affero variant matters when you **run a modified version as a service over a network**: AGPL is intended so that users who interact with your service over that network can receive the corresponding source under the same license. If you run **unmodified** code or only use the schema/SDK in ways that do not trigger AGPL’s network provisions, your obligations differ—read the license and, if needed, consult counsel for your situation.

### OSS core and commercial boundary

**This repository** is the AGPL **open core**: SQL migrations, RLS policies, RPCs and views, the TypeScript **SDK**, the **docs** site source in `apps/docs/`, **tests**, in-tree **Edge Functions**, and shared **UI** primitives. Contributions merged here are **open source** under the same license.

**Commercial offerings** (hosted applications, proprietary features such as **AI-assisted** workflows, managed services, enterprise packaging, etc.) are **not shipped as source here**. They are meant to **build on** this core—same migrations, Supabase API, SDK—not to replace or conceal it. We follow the **GitLab-style** bargain: the product succeeds when the OSS core is **excellent**, not when it is **crippled** to force upgrades.

**For contributors:** Your work in this repo targets the **shared substrate** the whole ecosystem can use. Proprietary product code lives in **other** repositories or deployments. **AGPL still applies** if someone modifies **this** codebase and runs that modified stack as a **network service**—that obligation is about **distributing/conveying** the modified core, and is distinct from “using a vendor’s hosted product as a customer.”

**Not legal advice.** Product and compliance questions belong with qualified counsel.

**Contributing:** Contributions are accepted under the same license; see [CONTRIBUTING.md](CONTRIBUTING.md).

**Security:** Report vulnerabilities privately via [SECURITY.md](SECURITY.md). Do not use public issues for undisclosed vulnerabilities.

## What this repository is

The **open core** of that ambition **today** (see [Where we are today](#where-we-are-today) for alpha expectations): a secure, multi-tenant CMMS **data plane**—Postgres with row-level security, RPC-first writes, public (and reporting) views for reads, optional Edge Functions, a typed **SDK**, tests, and docs. One place for **work, assets, places, time, cost, compliance, and history**—so UIs, integrations, and vendors can build **on** a real API instead of a black box.

## Capabilities (today)

Outcomes you get from the current schema and API—not a feature checklist tied to table names.

- **One coherent operations model** — Work, assets, and the built environment tie together so reporting and mobile flows do not rely on ad hoc joins or spreadsheets.
- **Workflows teams actually run** — Statuses, priorities, assignments, time, portal/SLA-related paths, and attachments so the system matches how work gets done.
- **Trust and tenancy** — Strong tenant isolation (RLS), roles and scoped permissions, and audit-oriented views so you know who changed what.
- **Safe evolution** — Writes go through **RPCs** with server-side checks instead of exposing raw tables to every client.
- **A real developer contract** — Typed **`@workorder-systems/sdk`**, generated `database.types`, and documentation that tracks the public PostgREST surface.

## Quick start (local)

**First time here?** Use **[GETTING_STARTED.md](GETTING_STARTED.md)** for Docker, Supabase CLI, env files, and troubleshooting—the README commands assume that setup is done.

Prerequisites (summary): **Node.js 20+**, **pnpm**, **Docker**, **Supabase CLI**.

```bash
pnpm install
pnpm start
pnpm test
```

If tests fail with auth or schema errors, reset the database so migrations match `main`: `pnpm supabase:reset` then `pnpm test` (or `pnpm test:reset`). See [CONTRIBUTING.md](CONTRIBUTING.md#tests).

## Repo layout

- `GETTING_STARTED.md` — First-time setup (Docker, CLI, env, troubleshooting)
- `apps/supabase/` — Supabase CLI project: migrations, `config.toml`, Edge Functions (`pnpm start` / `pnpm supabase:start`)
- `apps/docs/` — Next.js documentation site for the public API
- `packages/sdk/` — Published-style package **`@workorder-systems/sdk`**
- `plugins/example/` — Optional local webhook receiver for plugin smoke tests
- `tests/` — Vitest integration tests
- `docs/` — Client flows, SDK coverage notes, and `docs/adr/` architecture decision records

## Architecture and rules

Database architecture, schemas, and conventions: [`apps/supabase/README.md`](apps/supabase/README.md).  
Agent/automation-oriented overview: [`AGENTS.md`](AGENTS.md).

## Contributing

If you want the **best CMMS core** to be **real**—auditable, extensible, and ecosystem-friendly—we welcome you. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, workflow, and migration rules. If you are unsure what belongs in **this** repo versus commercial product code, read [OSS core and commercial boundary](#oss-core-and-commercial-boundary) above.

## Support

Use GitHub Issues for bug reports and feature requests.

## License

**AGPL-3.0-or-later.** See [LICENSE](LICENSE) and [Open source and license](#open-source-and-license) above.
