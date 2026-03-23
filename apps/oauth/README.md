# OAuth consent app (`work-order-systems-oauth`)

Minimal **Next.js** UI for [Supabase OAuth 2.1 server](https://supabase.com/docs/guides/auth/oauth-server) consent: **`/oauth/consent`**, **`/login`**, and **`POST /api/oauth/decision`**.

**`/demo`** is an optional partner playground: PKCE authorize → consent → **`/demo/callback`** → **`POST /api/demo/oauth-token`**. **Register demo OAuth client** uses **OAuth 2.0 Dynamic Client Registration** only (`POST /auth/v1/oauth/clients/register` — the same **`registration_endpoint`** in **`/.well-known/oauth-authorization-server`** that MCP clients use). This repo keeps **`[auth.oauth_server].allow_dynamic_registration = true`**; the consent app does **not** use **`SUPABASE_SERVICE_ROLE_KEY`** or the Admin OAuth client API.

**MCP / Cursor vs `/demo`:** Supabase Auth can **auto-approve** on `GET /oauth/authorizations/:id` when the user **already has consent** for that OAuth client and scopes (same `client_id` as a previous `mcp-remote` registration). The consent app detects GoTrue’s **`{ "redirect_url": "..." }`** response and **redirects immediately** so you are not shown a stale form whose first **Allow** would fail with `authorization request cannot be processed`. **`/demo`** often uses a **new** dynamically registered client each time, so auto-approve is less likely than with a **reused** MCP client under `~/.mcp-auth/`.

## Source layout

| Module | Role |
|--------|------|
| **`lib/supabase-public-env.ts`** | Reads `NEXT_PUBLIC_SUPABASE_URL` + anon key; **`authV1BaseUrl()`** for GoTrue paths. |
| **`lib/oauth-server-api.ts`** | Consent flow: fetch authorization + post consent (user JWT + anon `apikey`). |
| **`lib/demo-oauth-server.ts`** | Demo cookie names, default redirect URIs, **`resolveDemoTokenCredentials`**, **`resolveDemoClientPublicState`**. |
| **`lib/demo-oauth-register-server.ts`** | `POST` to **`/auth/v1/oauth/clients/register`** (dynamic registration). |
| **`lib/demo-client.ts`** | Browser: PKCE `sessionStorage` keys, **`demoPkceRedirectUri()`**. |
| **`lib/runtime-env.ts`** | **`isDevelopment`** / **`isProduction`**. |

## Environment

Use **`apps/oauth/.env.local`** with **`NEXT_PUBLIC_SUPABASE_URL`** and **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**. Optional for `/demo`: **`NEXT_PUBLIC_DEMO_OAUTH_CLIENT_ID`**, **`DEMO_OAUTH_CLIENT_SECRET`** if you prefer env over browser cookies. See **`.env.local.example`**.

## Run locally

1. Start Supabase from the repo root (`pnpm supabase:start` or `pnpm start`).
2. Copy **`apps/oauth/.env.local.example`** → **`apps/oauth/.env.local`** and set the two `NEXT_PUBLIC_*` variables (same project as `supabase status`).
3. **OAuth client for `/demo`:** open **`/demo`** and click **Register demo OAuth client**, or run **`pnpm supabase:oauth-register-demo`** and paste **`client_id`** / **`client_secret`** into **`.env.local`**.
4. **`pnpm --filter work-order-systems-oauth dev`** — port **3005**, aligned with **`[auth].site_url`** in **`apps/supabase/config.toml`** (restart Supabase after changing **`site_url`**).

Register **`http://localhost:3005/demo/callback`** and **`http://127.0.0.1:3005/demo/callback`** on the client (the register button adds both). **`localhost` vs `127.0.0.1`** must match the browser origin.

## Production / staging

- Deploy with **anon** credentials only (`NEXT_PUBLIC_*`).
- Set **`NEXT_PUBLIC_DEMO_OAUTH_CLIENT_ID`** and **`DEMO_OAUTH_CLIENT_SECRET`** if you want a fixed client instead of cookies; otherwise users can register via dynamic registration from **`/demo`** when enabled on the project.
- The callback page does not print tokens or authorization codes in production builds.

## Using OAuth tokens for the CMMS API (work orders, assets, …)

After the authorization code flow, the **access token** is a normal Supabase JWT: **`role`** is **`authenticated`**, **`sub`** is the user id, and **`client_id`** identifies the OAuth app. **PostgREST** and **RLS** treat it like a user session, so partners can call the same **`/rest/v1/...`** endpoints and **`rpc_*`** functions as your first-party app.

**Headers** (every request):

- **`Authorization: Bearer <access_token>`**
- **`apikey: <anon or publishable key>`** (same project)

**Example — list work orders for the current tenant** (adjust host and keys):

```http
GET /rest/v1/v_work_orders?select=id,title,status
```

**Tenant context:** Views such as **`v_work_orders`** filter with **`authz.get_current_tenant_id()`**, which reads the **`tenant_id`** JWT claim (from **`custom_access_token_hook`** when the user has **`current_tenant_id`** in metadata). If that claim is missing, call **`rpc_set_tenant_context(<tenant_uuid>)`** as **`authenticated`**, then **refresh** the session / obtain a new access token so the next JWT includes **`tenant_id`**. Same rules apply to password and OAuth logins.

**OIDC scopes** (`openid`, `email`, `profile`, …) only affect **ID tokens** and **UserInfo** — they do **not** grant table-level access. Database access is always governed by **RLS** (and optional checks on **`(auth.jwt() ->> 'client_id')`** if you want some OAuth clients read-only or blocked from sensitive RPCs). See [Token security & RLS](https://supabase.com/docs/guides/auth/oauth-server/token-security) and **`apps/supabase/README.md`** (OAuth section).

## Implementation note

Authorization details and consent use GoTrue REST (`GET` / `POST` `/auth/v1/oauth/authorizations/...`) so this app works even when **`supabase-js`** does not yet expose **`auth.oauth.*`** in a given release.
