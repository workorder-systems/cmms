# @workorder-systems/sdk

The **typed bridge** to **WorkOrder Systems OSS**—the Postgres/Supabase **CMMS core** this repo is building to be the **default substrate** for maintenance software (see the [monorepo README](https://github.com/workorder-systems/db#vision)). Public **views** for reads, **RPCs** for writes, nothing hidden. Use it in the browser, Node.js, or edge runtimes (Cloudflare Workers, Vercel Edge) so your apps speak the same contract the database tests enforce.

## Install

```bash
npm install @workorder-systems/sdk @supabase/supabase-js
```

Peer dependency: `@supabase/supabase-js` ^2.39.0.

## Quick start

```ts
import { createDbClient } from '@workorder-systems/sdk';

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

| Resource | Reads | Writes |
|----------|-------|--------|
| `tenants` | `list()`, `getById()` | `create()`, `inviteUser()`, `assignRole()`, `removeMember()` |
| `workOrders` | `list()`, `getById()`, `listAttachments(workOrderId)`, `listMyRequests()`, `listSlaStatus()`, `getSlaStatus(workOrderId)` | `create()`, `createRequest()` (portal), `acknowledge()`, `upsertSlaRule()`, `transitionStatus()`, `complete()`, `logTime()`, `updateAttachmentMetadata()` |
| `assets` | `list()`, `getById()`, `listWarranties(assetId?)` | `create()`, `update()`, `delete()`, `bulkImport()`, `upsertWarranty()`, `recordDowntime()` |
| `fieldOps` | `listTools()`, `listToolCheckouts()`, `listShiftHandovers()` | `createTool()`, `updateTool()`, `checkoutTool()`, `returnTool()`, `createShiftHandover()`, `submitShiftHandover()`, `acknowledgeShiftHandover()`, `addShiftHandoverItem()` |
| `locations` | `list()`, `getById()` | `create()`, `update()`, `delete()`, `bulkImport()` |
| `spaces` | `list()`, `getById()` | `create()`, `update()`, `delete()` |
| `departments` | `list()`, `getById()` | `create()`, `update()`, `delete()` |
| `meters` | `list()`, `getReadings()` | `create()`, `update()`, `recordReading()`, `delete()` |
| `plugins` | `list()`, `getById()`, `listInstallations()`, webhook helpers | `install()`, `updateInstallation()`, `uninstall()`, webhook subscription upsert/delete (tenant.admin where required) |
| `authorization` | permissions, roles, scopes, profiles | assign/revoke permission, grant/revoke scope, `hasPermission()`, `getUserPermissions()` |
| `catalogs` | statuses, priorities, maintenance types, transitions, workflow graph | create/update catalog entries and transitions (per RLS) |
| `pm` | templates, schedules, due/overdue/upcoming/history | create/update templates and schedules, generate due PMs, manual trigger, dependencies |
| `dashboard` | metrics, MTTR, open/overdue WO, summaries, site rollups | read-only views |
| `audit` | entity changes, permission changes, retention config | read-only |
| `tenantApiKeys` | `list()` | `create()`, `revoke()` |
| `labor` | technicians, crews, skills, shifts, assignments, capacity, conflicts | create/update technicians and related entities; scheduling helpers |
| `scheduling` | schedule blocks, validation issues | `scheduleWorkOrder()`, `updateScheduleBlock()`, `validateSchedule()`, unschedule |
| `costs` | WO/asset/location/department/project costs, lifecycle alerts | `costRollup()`, `assetLifecycleAlerts()`, `assetTotalCostOfOwnership()` |
| `projects` | `list()`, `getById()` | — (read-only) |
| `partsInventory` | parts, stock, suppliers, reservations, POs | reserve/issue parts, receive PO, create parts/suppliers/POs (see resource types) |
| `safetyCompliance` | inspections, incidents, history/report views | create/update templates, runs, incidents, actions |
| `mobile` | `sync()`, mobile list views | `startWorkOrder()`, `stopWorkOrder()`, `addWorkOrderNote()`, `registerWorkOrderAttachment()` |
| `mapZones` | `list()`, `getById()` | `create()`, `update()`, `delete()` |

**Not wrapped as a resource yet (fully typed on `client.supabase`):** in-app **notifications** — query `v_my_notifications` or call `rpc_list_my_notifications`, `rpc_mark_notifications_read`, `rpc_upsert_notification_preference`. Server automation uses `rpc_process_due_notifications` (service role / scheduled jobs). See the docs site **Notifications** page.

All resource methods throw `SdkError` (with `code`, `message`, `details`, `hint`) on failure. Success returns typed data.

### Asset lifecycle and cost of ownership

- **Assets** (`client.assets.list()` / `getById()`): Rows include lifecycle fields — `commissioned_at`, `end_of_life_estimate`, `decommissioned_at`, `replaced_by_asset_id`, `replacement_of_asset_id`, `warranty_expires_at`, `service_contract_expires_at`, `planned_replacement_date`.
- **Costs** (`client.costs`): Work order costs (labor, parts, vendor), roll-ups by asset/location/department/project, lifecycle alerts (warranty, EOL, contract, replacement), and `costRollup()`, `assetLifecycleAlerts()`, `assetTotalCostOfOwnership()` RPCs for reporting.
- **Projects** (`client.projects.list()` / `getById()`): Read-only list of projects for the tenant; use `projectId` in `workOrders.create()` to link work orders to projects for cost roll-up.
- **Work orders**: `CreateWorkOrderParams.projectId` optional when creating a work order.

## Options (runtime-specific)

For edge runtimes or custom fetch/storage:

```ts
const client = createDbClient(url, anonKey, {
  global: { fetch: fetch },
  auth: { persistSession: false, storage: customStorage },
});
```

## Versioning and API stability

- **Alpha:** Work Order Systems is **alpha** end-to-end; this package is **0.x** and tracks a database that **changes without a stability guarantee**. Pin a **commit** of the monorepo (or your own fork) if you need reproducible schema + SDK pairs.
- **Semver (intent):** Minor = new resources/methods (additive); Major = breaking renames or signature changes.
- **Backend versioning** (ADR 0008): When the database adds `rpc_*_v2` or `v_*_v2`, the SDK may expose versioned methods (e.g. `workOrders.createV2()`) and document migration from v1. Deprecated endpoints remain supported during the deprecation window.

## Regenerating types

Types are generated from the local Supabase **public** schema. From the repo root with Supabase running:

```bash
pnpm supabase:start
pnpm gen-types
```

CI runs `gen-types` after `supabase start` and builds the SDK so committed types stay in sync with migrations.

## Open source

`@workorder-systems/sdk` is developed in the **[workorder-systems/db](https://github.com/workorder-systems/db)** monorepo and licensed under **AGPL-3.0-or-later** together with the migrations and docs. See the repository **README** for project status, what is and is not included in that tree, and a short AGPL summary (not legal advice).
