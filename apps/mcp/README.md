# work-order-systems-mcp

MCP server for **Work Order Systems** CMMS: typed access via [`@workorder-systems/sdk`](../../packages/sdk/README.md), **Zod**-validated tool inputs, and **Supabase** user JWTs (same as the REST API).

## Clients overview

| Client | Transport | Typical setup |
|--------|-----------|----------------|
| **Cursor** | stdio → `mcp-remote` → HTTP MCP | `.cursor/mcp.json` `command` + `args` (no secrets) |
| **Claude Code** | Native HTTP MCP (OAuth via `/mcp`) | Project [`.mcp.json`](../.mcp.json) or `claude mcp add --transport http` |
| **Claude Code** (fallback) | stdio → `mcp-remote` | Same args as Cursor if native HTTP OAuth misbehaves |
| **Any stdio host** | Direct stdio | Env tokens or `pnpm mcp:oauth-login` |

---

## Cursor + OAuth (no tokens in MCP config)

Same pattern as **Linear**: Cursor runs **`mcp-remote`**, which talks **HTTP MCP** to this server. **Supabase Auth** is the authorization server ([RFC 9728](https://datatracker.ietf.org/doc/html/rfc9728) metadata is served at `/.well-known/oauth-protected-resource`). **Cursor / `mcp-remote` should run the browser OAuth flow** and attach the Bearer token to requests — you do **not** put access or refresh tokens in `.cursor/mcp.json`.

### 1. Run the HTTP MCP server (terminal)

Needs **`SUPABASE_URL`** and **`SUPABASE_ANON_KEY`** (server-side only — root **`.env.local`**, or `apps/work-order-systems-mcp/.env.local`, gitignored):

```bash
# From repo root (builds SDK + MCP, then listens on :3765)
pnpm mcp:work-order-systems
```

Or step by step:

```bash
pnpm --filter @workorder-systems/sdk build
pnpm --filter work-order-systems-mcp build
pnpm --filter work-order-systems-mcp start   # default http://0.0.0.0:3765/mcp
```

**If Cursor logs `ECONNREFUSED` / `connect ECONNREFUSED 127.0.0.1:3765`:** nothing is listening on that port — start the server *before* MCP connects, and keep that terminal open. The `mcp-remote` callback port warning (e.g. reusing `9876`) is normal; the fatal error is always the refused connection to **`3765`**.

Leave this process running while you use Cursor or Claude Code against this URL.

**Health check:** `GET /health` returns `{"ok":true,"service":"work-order-systems-mcp"}` (no auth).

### 2. Cursor MCP entry (no `env` secrets)

Local example (matches [`.cursor/mcp.json`](../../.cursor/mcp.json) in this repo). Prefer **`node`** plus the workspace copy of **`mcp-remote`** so Cursor’s shell does not depend on `npx`/`npm` on `PATH`, and you pick up this repo’s **patched** `mcp-remote` (OAuth `form_post` → `/oauth/callback`). Run **`pnpm install`** once so `apps/work-order-systems-mcp/node_modules/mcp-remote` exists.

```json
{
  "mcpServers": {
    "workorder": {
      "command": "node",
      "args": [
        "${workspaceFolder}/apps/work-order-systems-mcp/node_modules/mcp-remote/dist/proxy.js",
        "http://127.0.0.1:3765/mcp",
        "9876",
        "--host",
        "127.0.0.1"
      ]
    }
  }
}
```

If logs show **`mcp-remote: command not found`**, Cursor was trying to run the binary without a working `npx` chain — use the **`node` … `proxy.js`** form above instead of `npx -y mcp-remote`.

The **third numeric argument** (`9876`) is **`mcp-remote`’s OAuth callback port** — it **must not** be the same as the MCP HTTP port (`3765`). If they collide, the browser posts to this server and you get **Cannot POST /oauth/callback** (or the explanatory HTML page we serve). Stale registrations live under `~/.mcp-auth/mcp-remote-*/*_client_info.json`; delete those if mcp-remote keeps the wrong `redirect_uri`.

If you **double-submit** the consent screen, the first request usually wins and MCP connects; a duplicate is redirected back to the same callback with `error=server_error` (and `error_description=authorization_step_already_completed`) so **`mcp-remote`** gets a normal OAuth redirect instead of a JSON error page—check Cursor; you may already be signed in.

Production: replace the URL with your deployed HTTPS origin, e.g. `https://mcp.example.com/mcp`, and set **`WORKORDER_SYSTEMS_PUBLIC_ORIGIN`** on the server so metadata matches the public URL.

### Claude Code (native HTTP + OAuth)

[Claude Code](https://code.claude.com/docs/en/mcp) recommends **HTTP** transport for remote MCP. This server exposes Streamable HTTP at **`/mcp`** and protected-resource metadata for Supabase OAuth.

1. Start the HTTP server (same as step 1 above).
2. Either rely on the repo **project** config [`.mcp.json`](../.mcp.json) (checked in; Claude prompts for approval), or add locally:

   ```bash
   claude mcp add --transport http work-order-systems http://127.0.0.1:3765/mcp
   ```

3. In Claude Code, run **`/mcp`** and authenticate when prompted (OAuth 2.0), same pattern as other hosted MCP servers.

Optional: set **`WORKORDER_SYSTEMS_MCP_URL`** (full URL including `/mcp`) so `.mcp.json` expands to your host/port without editing the file.

**Static token (automation only):** not recommended for daily use; if you must:

```bash
claude mcp add --transport http work-order-systems http://127.0.0.1:3765/mcp \
  --header "Authorization: Bearer <supabase-user-jwt>"
```

**Fallback — `mcp-remote` over stdio** (mirrors Cursor if native HTTP OAuth fails):

```bash
claude mcp add --transport stdio work-order-systems -- \
  npx -y mcp-remote http://127.0.0.1:3765/mcp 9876 --host 127.0.0.1
```

On **native Windows** (not WSL), wrap `npx` so the shell can spawn it:

```bash
claude mcp add --transport stdio work-order-systems -- cmd /c npx -y mcp-remote http://127.0.0.1:3765/mcp 9876 --host 127.0.0.1
```

### 3. First connection

When the MCP client hits the server without a valid token, it gets **401** + `WWW-Authenticate` pointing at protected-resource metadata, then should open **Supabase** login in the browser. Exact behavior depends on your **Cursor** and **`mcp-remote`** versions; if OAuth does not start, update Cursor or check [Cursor MCP / remote OAuth issues](https://github.com/cursor/cursor/issues).

### Prove the pipeline (OAuth → `tools/list` → optional `tools/call`)

Same sequence the MCP TypeScript SDK uses with `StreamableHTTPClientTransport` + `authProvider` (what `mcp-remote` / Cursor approximate):

```bash
# Terminal A: HTTP MCP server
pnpm --filter work-order-systems-mcp build
pnpm --filter work-order-systems-mcp start

# Terminal B: anon key in apps/work-order-systems-mcp/.env.local (or env)
pnpm --filter work-order-systems-mcp mcp:oauth-call
pnpm --filter work-order-systems-mcp mcp:oauth-call tenants_list
```

`mcp:oauth-call` adds the Supabase **`apikey`** header on `/auth/v1/*` during discovery, registration, and token exchange (required by GoTrue). Optional: `WORKORDER_SYSTEMS_MCP_URL`, `OAUTH_MCP_CALLBACK_PORT`.

---

## Modes (summary)

| Mode | Transport | Who holds user tokens |
|------|-----------|------------------------|
| **HTTP + `mcp-remote`** | **Recommended** | MCP client (Cursor) after OAuth |
| **stdio** | Optional | You pass tokens via env (MCP spec: no HTTP OAuth on stdio) |

---

## Tenant context and token refresh

RLS and views use **`tenant_id` on the JWT** (from `custom_access_token_hook` after `rpc_set_tenant_context`). After **`set_active_tenant`**, you may need a **refreshed access token** for tenant-scoped views — the OAuth client should refresh via Supabase when possible.

OAuth clients may also need [`app.oauth_client_tenant_grants`](../../apps/supabase/migrations/20260326130000_oauth_client_tenant_grants.sql) populated for the chosen tenant.

---

## Environment variables

### HTTP server (`pnpm start` / `pnpm mcp:http`)

Loaded from the environment, or from `apps/work-order-systems-mcp/.env.local` if present (does not override existing vars).

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | yes | Project URL |
| `SUPABASE_ANON_KEY` | yes | Anon / publishable key (`apikey` header) |
| `PORT` | no | Default `3765` |
| `HOST` | no | Default `0.0.0.0` |
| `WORKORDER_SYSTEMS_MCP_PATH` | no | Default `/mcp` |
| `WORKORDER_SYSTEMS_PUBLIC_ORIGIN` | no | Public URL for metadata behind TLS/proxy |
| `SUPABASE_JWT_AUD` | no | JWT `aud` for verification; omit if not present on tokens |

### stdio only (`pnpm start:stdio`)

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | yes | Project URL |
| `SUPABASE_ANON_KEY` | yes | Anon key |
| `WORKORDER_SYSTEMS_ACCESS_TOKEN` | yes | User JWT |
| `WORKORDER_SYSTEMS_REFRESH_TOKEN` | no | Refresh after `set_active_tenant` |

---

## Scripts

```bash
pnpm --filter work-order-systems-mcp build
pnpm --filter work-order-systems-mcp start          # HTTP (OAuth-capable)
pnpm --filter work-order-systems-mcp start:stdio    # optional legacy
pnpm --filter work-order-systems-mcp mcp:oauth-login # optional: print tokens for stdio/scripts
pnpm --filter work-order-systems-mcp test
```

Published-style entrypoints (after `build`): **`work-order-systems-mcp`** → stdio, **`work-order-systems-mcp-http`** → HTTP (same as `start`).

### Optional: `mcp:oauth-login` (tokens for stdio / automation)

Prints `WORKORDER_SYSTEMS_ACCESS_TOKEN` / refresh to stdout — **not** needed when using **`mcp-remote` + HTTP** and Cursor-driven OAuth.

---

## Cursor: optional stdio (legacy)

Only if you cannot use HTTP OAuth:

```json
{
  "mcpServers": {
    "work-order-systems": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/db/apps/work-order-systems-mcp/dist/stdio.js"],
      "env": {
        "SUPABASE_URL": "http://127.0.0.1:54321",
        "SUPABASE_ANON_KEY": "your-anon-key",
        "WORKORDER_SYSTEMS_ACCESS_TOKEN": "user-access-jwt",
        "WORKORDER_SYSTEMS_REFRESH_TOKEN": "optional-refresh-token"
      }
    }
  }
}
```

Prefer **user-level** Cursor MCP settings for secrets so they are not committed.

---

## Tools (MVP)

| Tool | Purpose |
|------|---------|
| `tenants_list` | Organizations for the current user |
| `set_active_tenant` | `rpc_set_tenant_context` |
| `work_orders_list` | List WOs for JWT tenant context |
| `work_orders_get` | Get one WO by id |
| `work_orders_create` | Create WO via `rpc_create_work_order` |

---

## References

- [MCP authorization](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization)
- [Supabase OAuth server](https://supabase.com/docs/guides/auth/oauth-server)
- [Token security & RLS](https://supabase.com/docs/guides/auth/oauth-server/token-security)
