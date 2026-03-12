# Supabase database architecture

Supabase config and SQL migrations for the multi-tenant CMMS backend.

## Folder layout

- **config.toml** — Supabase local config
- **migrations/** — Ordered SQL migrations (Supabase CLI)
- **.gitignore** — Local Supabase artifacts

## Architecture at a glance

The database is split into clear schemas:

- **app** — Core CMMS data (tenants, assets, locations, work_orders)
- **cfg** — Tenant configuration (roles, permissions, workflow catalogs)
- **authz** — Authorization helpers (membership and permission functions)
- **util** — Shared utilities (timestamps, validations, rate limiting)
- **audit** — Audit logs for compliance and security
- **int** — Integration scaffolding (reserved for external systems)

## Public API contract

The public surface is for **application users** (authenticated clients) only:

- **Public interface** — RPC functions and public views only. No direct table access.
- **Writes** — All writes go through RPCs with permission checks.
- **Internal schemas** (`app`, `cfg`, `audit`, `util`, `authz`) are not exposed; application code uses only public RPCs and views.

## Modules, plugins, integrations (ADR 0002 + 0005)

- **Module** — Core product capability; can change the data model.
- **Plugin** — Optional behavior/UI on existing modules; no schema changes.
- **Integration** — Plugin that connects to external systems.
- Plugins and integrations must not add SQL or schema changes.
- Secrets/tokens live outside Postgres; only opaque references go in `int`.

## Public API naming and versioning (ADR 0008 + 0010)

- **Views:** `public.v_<resource>` (plural). Summary/analytics: `_summary` or `_overview`. Breaking changes: `_v2`.
- **RPCs:** `public.rpc_<verb>_<resource>`. Breaking changes: versioned names.
- **Parameters:** `p_tenant_id` first when required, then primary ids.
- Prefer additive changes; document breaking changes in migrations and ADRs.

## Security model (multi-tenant)

- **RLS** is enabled on all tenant-scoped tables. Tenant isolation uses membership tables and `auth.uid()`.
- **Permissions** are enforced in RPCs, not RLS. RLS checks tenant membership; RPCs enforce fine-grained permissions.
- `app.current_tenant_id` is convenience context for views only—never use it for security.
- **ABAC scopes** (`app.membership_scopes`) support location/department access.

## Workflow and catalogs

Work order workflows are tenant-configurable. Status catalogs and transitions live in `cfg.status_catalogs` and `cfg.status_transitions`; priorities in `cfg.priority_catalogs`. All status transitions must go through RPC to enforce guard conditions.

## Auditing, rate limits, analytics

- **Audit:** `audit.entity_changes` and `audit.permission_changes` capture entity and permission changes.
- **Rate limiting:** `util.check_rate_limit` protects write-heavy RPCs.
- **Analytics:** Materialized views are refreshed via `public.refresh_analytics_views()`.

## Migration rules and conventions

When adding migrations:
1. Use Supabase CLI migrations under `supabase/migrations/`.
2. Write **lowercase SQL** and include a header comment describing the change.
3. **Enable RLS** on new tables and add policies for tenant membership.
4. Add `updated_at` triggers and immutability protections where required.
5. Add audit triggers for core entities.
6. Expose new data via **RPC + views**, not direct table access.
7. Add or update tests in `tests/` to cover new behavior.

## Adding a new module (pattern)

1. Define tables in `app` or `cfg`.
2. Add RLS policies and tenant-consistency triggers.
3. Add RPCs for create/update/delete with permission checks.
4. Add public views for reads.
5. Add permissions to `cfg.permissions` and include defaults.
6. Add audit triggers and analytics if needed.
7. Add tests.

## Local dev and tests

- **Start:** `npm run supabase:start`
- **Reset:** `npm run supabase:reset`
- **Test:** `npm test`

