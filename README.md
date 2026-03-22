<div align="center">

<h1>WorkOrder Systems</h1>

<p><strong>Open-source CMMS core · AGPL-3.0</strong></p>

<p>
  <strong><em>The Linux of maintenance software.</em></strong>
</p>

<p>
  A production-grade, <strong>self-hostable</strong> CMMS <strong>backend</strong><br />
  — Postgres, RLS, RPCs, <code>@workorder-systems/sdk</code>, tests, docs.<br />
  <b>Deploy it. Own it. Extend it.</b> No vendor lock-in. No black-box workflows.
</p>

<p>
  <a href="https://github.com/workorder-systems/db/actions/workflows/test.yml"><img src="https://github.com/workorder-systems/db/actions/workflows/test.yml/badge.svg" alt="CI" /></a>
  &nbsp;
  <a href="LICENSE"><img src="https://img.shields.io/github/license/workorder-systems/db?style=flat-square&label=license" alt="License" /></a>
  &nbsp;
  <a href="docs/PROJECT.md#where-we-are-today"><img src="https://img.shields.io/badge/status-alpha-f97316?style=flat-square" alt="Alpha" /></a>
</p>

<p>
  <img src="https://img.shields.io/badge/Postgres-4169E1?style=flat-square&logo=postgresql&logoColor=white" alt="Postgres" />
  &nbsp;
  <img src="https://img.shields.io/badge/Supabase-3FCF8E?style=flat-square&logo=supabase&logoColor=1C1C1C" alt="Supabase" />
  &nbsp;
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  &nbsp;
  <img src="https://img.shields.io/badge/pnpm-F69220?style=flat-square&logo=pnpm&logoColor=white" alt="pnpm" />
</p>

<p>
  <b><a href="GETTING_STARTED.md">Setup guide</a></b>
  &nbsp;·&nbsp;
  <a href="docs/PROJECT.md">Vision &amp; adoption</a>
  &nbsp;·&nbsp;
  <a href="CONTRIBUTING.md">Contributing</a>
  &nbsp;·&nbsp;
  <a href="SECURITY.md">Security</a>
</p>

<br />

</div>

---

## Quick start

Prerequisites: **Node 20+**, **pnpm**, **Docker**, [**Supabase CLI**](https://supabase.com/docs/guides/cli).  
**First time?** Walk through **[`GETTING_STARTED.md`](GETTING_STARTED.md)** — the commands below assume Docker is running.

```bash
pnpm install
pnpm start    # local Supabase (~1–2 min first cold start)
pnpm test
```

DB out of sync after `git pull`? `pnpm supabase:reset` then `pnpm test` (or **`pnpm test:reset`**).

---

## Repository

| Path | What |
|------|------|
| [`apps/supabase/`](apps/supabase/) | Migrations, RLS, RPCs, Edge Functions |
| [`packages/sdk/`](packages/sdk/) | **`@workorder-systems/sdk`** — typed public API |
| [`apps/docs/`](apps/docs/) | API documentation site (Next.js) |
| [`tests/`](tests/) | Vitest + real Supabase integration tests |

**Not here:** the customer-facing product SPA — build your UI on the SDK and Supabase.

---

## Docs

| | |
| :--- | :--- |
| **Architecture** | [`apps/supabase/README.md`](apps/supabase/README.md) |
| **Vision, alpha, stability, AGPL, OSS vs commercial** | [`docs/PROJECT.md`](docs/PROJECT.md) |
| **Agents / CI** | [`AGENTS.md`](AGENTS.md) |

---

<div align="center">

<br />

<sub>
  <strong>Alpha</strong> — pin a git commit before depending on it.
  ·
  Questions? <a href="https://github.com/workorder-systems/db/issues">Issues</a>
</sub>

</div>
