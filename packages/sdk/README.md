# @db/sdk

Type-safe domain SDK for the database public API. Exposes only **public views** (reads) and **RPCs** (writes). Works in browser, Node.js, and edge runtimes (Cloudflare Workers, Vercel Edge).

## Install

```bash
npm install @db/sdk @supabase/supabase-js
```

Peer dependency: `@supabase/supabase-js` ^2.39.0.

## Quick start

```ts
import { createDbClient } from '@db/sdk';

const client = createDbClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// After auth: set tenant context, then refresh session so JWT has tenant_id
await client.setTenant(tenantId);
// Optional: refresh session so new JWT carries tenant_id (e.g. getSession() then setSession())

const tenants = await client.tenants.list();
const workOrders = await client.workOrders.list();
const id = await client.workOrders.create({
  tenantId,
  title: 'Fix pump',
  priority: 'high',
});
```

## Auth and tenant context

- **Authentication** is handled by Supabase Auth. Use `client.supabase.auth.signInWithPassword()`, `getSession()`, etc. The SDK does not replace Auth.
- **Tenant context** is required for tenant-scoped data. Call `client.setTenant(tenantId)` before querying `v_*` views or calling tenant-scoped RPCs. The backend uses `authz.get_current_tenant_id()` from the JWT or session.
- **Refresh session** after `setTenant()` so the new JWT includes the `tenant_id` claim (e.g. `const { data } = await client.supabase.auth.getSession(); await client.supabase.auth.setSession({ ... });`).
- To clear context (e.g. when switching tenants): `await client.clearTenant()`.

## Resources

| Resource      | Reads              | Writes                                                                 |
|---------------|--------------------|------------------------------------------------------------------------|
| `tenants`     | `list()`, `getById()` | `create()`, `inviteUser()`, `assignRole()`                            |
| `workOrders`  | `list()`, `getById()` | `create()`, `transitionStatus()`, `complete()`, `logTime()`, `addAttachment()` |
| `assets`      | `list()`, `getById()` | `create()`, `update()`, `delete()`                                   |
| `locations`   | `list()`, `getById()` | `create()`, `update()`, `delete()`                                    |
| `departments` | `list()`, `getById()` | `create()`, `update()`, `delete()`                                   |
| `meters`      | `list()`, `getReadings()` | `create()`, `update()`, `recordReading()`, `delete()`              |

For **PM** (templates, schedules, due/overdue pms), **permissions** (grant, revoke, hasPermission), **workflow** (status/priority/maintenance type catalogs), **plugins**, **audit**, and **dashboard** views, use `client.supabase.from('v_*')` and `client.supabase.rpc('rpc_*', params)` until dedicated resource methods are added. All public views and RPCs are typed via the SDK’s `Database` type.

All resource methods throw `SdkError` (with `code`, `message`, `details`, `hint`) on failure. Success returns typed data.

## Options (runtime-specific)

For edge runtimes or custom fetch/storage:

```ts
const client = createDbClient(url, anonKey, {
  global: { fetch: fetch },
  auth: { persistSession: false, storage: customStorage },
});
```

## Versioning and API stability

- **Semver**: Minor = new resources/methods (additive); Major = breaking renames or signature changes.
- **Backend versioning** (ADR 0008): When the database adds `rpc_*_v2` or `v_*_v2`, the SDK may expose versioned methods (e.g. `workOrders.createV2()`) and document migration from v1. Deprecated endpoints remain supported during the deprecation window.

## Regenerating types

Types are generated from the local Supabase **public** schema. From the repo root with Supabase running:

```bash
npm run supabase:start
npm run gen-types
```

CI runs `gen-types` after `supabase start` and builds the SDK so committed types stay in sync with migrations.
