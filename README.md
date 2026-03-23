<div align="center">

<h1>WorkOrder Systems</h1>

<p><strong>Open-source CMMS core</strong> · <strong>AGPL-3.0</strong></p>

<p><strong><em>The Linux of maintenance software.</em></strong></p>

<p>
  A <strong>production-grade</strong>, <strong>self-hostable</strong> <strong>CMMS backend</strong> on Postgres and Supabase.<br />
  <strong>RLS</strong>, <strong>RPCs</strong>, typed <code>@workorder-systems/sdk</code>, <strong>OAuth&nbsp;2.1</strong> for partners, <strong>MCP</strong> for AI tools, tests, and docs.
</p>

<p><b>Deploy it. Own it. Extend it.</b></p>

<p>No vendor lock-in. No black-box workflows.</p>

<br />

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

<br />

<p>
  <a href="GETTING_STARTED.md"><strong>Setup</strong></a>
  &nbsp;·&nbsp;
  <a href="docs/PROJECT.md">Vision &amp; adoption</a>
  <br />
  <br />
  <a href="CONTRIBUTING.md">Contributing</a>
  &nbsp;·&nbsp;
  <a href="SECURITY.md">Security</a>
</p>

<br />

</div>

## Quick start

**Stack:** Node **20+**, **pnpm**, **Docker**, [**Supabase CLI**](https://supabase.com/docs/guides/cli).

**New here?** Open **[`GETTING_STARTED.md`](GETTING_STARTED.md)** first (Docker must be running for the commands below).

```bash
pnpm install
pnpm start    # local Supabase (first cold start often 1 to 2 min)
pnpm test
```

After `git pull`, if tests look wrong: **`pnpm supabase:reset`** then **`pnpm test`**, or **`pnpm test:reset`**.

## Repository

| Path | What |
|:-----|:-----|
| [`apps/supabase/`](apps/supabase/) | Migrations, RLS, RPCs, Edge Functions, local `config.toml` |
| [`apps/oauth/`](apps/oauth/) | OAuth 2.1 **consent UI** (Next.js) for Supabase Auth — pairs with **`[auth.oauth_server]`** in Supabase |
| [`apps/mcp/`](apps/mcp/) | **MCP** server (Streamable HTTP): CMMS tools via **`@workorder-systems/sdk`**, Supabase JWT + [RFC 9728](https://datatracker.ietf.org/doc/html/rfc9728) metadata for Cursor / Claude / `mcp-remote` |
| [`packages/sdk/`](packages/sdk/) | **`@workorder-systems/sdk`** (typed public API) |
| [`apps/docs/`](apps/docs/) | API docs site (Next.js) |
| [`tests/`](tests/) | Vitest + real Supabase integration tests |
| [`.cursor/mcp.json`](.cursor/mcp.json) · [`.mcp.json`](.mcp.json) | Example MCP client config (Cursor / Claude Code) pointing at local **`http://127.0.0.1:3765/mcp`** |

**Not in this repo:** the customer-facing product SPA. Build your UI on the SDK and Supabase.

## Documentation

| Topic | Link |
|:------|:-----|
| Database architecture | [`apps/supabase/README.md`](apps/supabase/README.md) |
| OAuth 2.1 consent app | [`apps/oauth/README.md`](apps/oauth/README.md) |
| MCP (tools, Cursor, OAuth) | [`apps/mcp/README.md`](apps/mcp/README.md) |
| Vision, alpha, stability, license | [`docs/PROJECT.md`](docs/PROJECT.md) |
| Agents & CI playbook | [`AGENTS.md`](AGENTS.md) |

<br />

<div align="center">

<sub><strong>Alpha.</strong> Pin a git commit before you depend on it. · <a href="https://github.com/workorder-systems/db/issues">Issues</a></sub>

</div>
