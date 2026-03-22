# Example (`plugins/example`)

Minimal **Node HTTP receiver** for **outbound plugin webhooks** (`pg_net` → your machine). Use it to verify end-to-end delivery while developing locally.

## Quick smoke test

You need **two terminals**, **Docker** (Supabase + Vault), and **repo root** `.env.local` with `SUPABASE_SERVICE_ROLE_KEY` (and usually `SUPABASE_URL` / `SUPABASE_ANON_KEY` — same as Vitest). Default anon key works for local CLI if unset.

**Terminal A — receiver** (HMAC must match the Vault secret the script creates):

```bash
export WEBHOOK_SECRET='example-plugin-dev-hmac-secret-key-32chars!!'
pnpm --filter work-order-systems-example dev
```

Use the same value if you override with `EXAMPLE_HMAC_SECRET` when running the setup script (legacy: `EXAMPLE_PLUGIN_HMAC_SECRET`).

**Terminal B — database + automation**

```bash
pnpm supabase:start   # or already running
pnpm --filter work-order-systems-example smoke:setup
```

The script will:

1. Call `rpc_register_plugin` for key `example_receiver` (service role).
2. Run `vault.create_secret` inside the DB container (`supabase_db_database` by default; override with `SUPABASE_DB_CONTAINER` if yours differs).
3. Create a **new** Auth user + tenant, install the plugin (`webhook_url` → `http://host.docker.internal:8765/webhook`), add a `work_orders` / `INSERT` subscription, create a work order, then call `rpc_process_plugin_deliveries` twice so `pg_net` can dispatch and collect the response.

**Check the receiver**

```bash
curl -s http://127.0.0.1:8765/events | jq .
```

**Clear stored events (memory + `data/events.jsonl`)**

```bash
curl -s -X POST http://127.0.0.1:8765/dev/reset
```

Optional env:

| Variable | Purpose |
|----------|---------|
| `EXAMPLE_HMAC_SECRET` | Vault + signing (default matches README `WEBHOOK_SECRET` example) |
| `EXAMPLE_WEBHOOK_URL` | Override webhook URL (e.g. Linux LAN IP) |
| `EXAMPLE_PLUGIN_*` | Legacy aliases for the two vars above |
| `SUPABASE_DB_CONTAINER` | Docker container name if not `supabase_db_database` |

---

## Configure environment

| Where | Used by |
|--------|---------|
| **`plugins/example/.env` or `.env.local`** | Receiver (`pnpm dev`): `PORT`, `WEBHOOK_SECRET`, `DATA_DIR`. Optional: Supabase vars for `smoke:setup` (override repo root). |
| **Repository root `.env.local`** | Vitest, `smoke:setup` (loaded first). See root [`.env.example`](../../.env.example). |

**Local Supabase CLI** usually exposes **JWT-style** `anon` / `service_role` keys (`eyJ…`). Hosted projects may use `sb_publishable_…` / `sb_secret_…` — use **Project Settings → API**.

**HMAC:** Same plaintext in:

1. `WEBHOOK_SECRET` (receiver), and  
2. Vault (via `smoke:setup` Docker step) — or `EXAMPLE_HMAC_SECRET` if you change the default.

Trim spaces in `.env` values (e.g. no trailing space after URLs).

---

## Run (receiver only)

From the repository root:

```bash
pnpm --filter work-order-systems-example dev
```

Or from this directory:

```bash
pnpm dev
```

Default port **8765**. Override with `PORT`.

## Point Supabase (Docker) at your laptop

`pg_net` runs **inside** the DB container, so `http://127.0.0.1:8765` usually **does not** work. Use:

- **macOS / Windows (Docker Desktop):** `http://host.docker.internal:8765/webhook`
- **Linux:** host mapping or your machine’s LAN IP, e.g. `http://192.168.1.42:8765/webhook`

Set that URL on the plugin installation `config`:

```json
{
  "webhook_url": "http://host.docker.internal:8765/webhook"
}
```

## HMAC (optional)

Same plaintext as in **Supabase Vault** (installation `secret_ref` = Vault secret **name**):

```bash
export WEBHOOK_SECRET='your-shared-secret-plaintext'
pnpm dev
```

If `WEBHOOK_SECRET` is unset, the app accepts deliveries **without** checking `X-Plugin-Signature` (quick local tests only).

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | JSON summary of service and routes |
| GET | `/health` | Liveness, version, uptime, event count, signature mode |
| POST | `/webhook` | Plugin delivery target (JSON body + headers) |
| GET | `/events` | Recent events (in-memory); includes `totalInMemory` |
| GET | `/events/replay` | Last 50 lines from `data/events.jsonl` |
| POST | `/dev/reset` | Clear memory + delete JSONL file |

Events append to **`data/events.jsonl`** (gitignored).

## Manual checklist (without `smoke:setup`)

1. `pnpm supabase:start` and configure Vault + plugin installation as in [Plugins building](/plugins-building) docs.
2. `rpc_register_plugin` / `rpc_install_plugin` / `rpc_upsert_plugin_webhook_subscription`.
3. Start this app; set `webhook_url` as above.
4. Create a work order (or trigger another audited change).
5. Wait for `pg_cron` or call `rpc_process_plugin_deliveries` with **service role**.
6. Open `http://127.0.0.1:8765/events` and confirm the payload.

## Why not SQLite here?

This example avoids native addons so it runs everywhere `pnpm` runs. JSONL is enough for debugging; swap in `better-sqlite3` or similar if you need SQL queries.
