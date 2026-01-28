# Supabase database architecture

This folder contains the Supabase configuration and SQL migrations for the
multi-tenant CMMS backend.

## Folder layout
- `config.toml`: Supabase local config.
- `migrations/`: Ordered SQL migrations applied by the Supabase CLI.
- `.gitignore`: Local Supabase artifacts.

## Architecture at a glance
The database is split into clear schemas to keep responsibilities isolated:
- `app`: core CMMS domain data (tenants, assets, locations, work_orders).
- `cfg`: tenant configuration (roles, permissions, workflow catalogs).
- `authz`: authorization helpers (membership and permission functions).
- `util`: shared utilities (timestamps, validations, rate limiting).
- `audit`: audit logs for compliance and security.
- `int`: integration scaffolding (reserved for external systems).

## Public API contract
This database is designed with a strict public surface:
- **Public interface = RPC functions + public views only.**
- **Direct table writes are not allowed** for client applications.
- Internal schemas (`app`, `cfg`, `audit`, `util`, `authz`) are intended for
  service_role or internal tooling only.

## Security model (multi-tenant)
- **RLS is enabled** on all tenant-scoped tables.
- **Tenant isolation** is enforced via membership tables and `auth.uid()`.
- `app.current_tenant_id` is a **convenience context** for views only.
  It must **never** be relied on for security enforcement.
- **Permissions are enforced in RPC**, not by RLS. RLS checks tenant membership;
  RPC enforces fine-grained permissions.
- **ABAC scopes** (`app.membership_scopes`) support location/department access.

## Workflow and catalogs
Work order workflows are tenant-configurable:
- Status catalogs and transitions live in `cfg.status_catalogs` and
  `cfg.status_transitions`.
- Priorities live in `cfg.priority_catalogs`.
- **All status transitions must go through RPC** to enforce guard conditions.

## Auditing, rate limits, analytics
- **Audit logging**: `audit.entity_changes` and `audit.permission_changes`
  capture changes to core entities and permission assignments.
- **Rate limiting**: `util.check_rate_limit` protects write-heavy RPCs.
- **Analytics**: materialized views support reporting and are refreshed via
  `public.refresh_analytics_views()`.

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
3. Add RPC functions for create/update/delete with permission checks.
4. Add public views for reads.
5. Add permissions to `cfg.permissions` and include defaults.
6. Add audit triggers and analytics (if needed).
7. Add tests.

## Local dev and tests
- Start Supabase: `npm run supabase:start`
- Reset database: `npm run supabase:reset`
- Run tests: `npm test`

