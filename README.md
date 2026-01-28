# db
A production-ready, multi-tenant database schema for work order and maintenance management systems (CMMS).

## Operating rules (read before making changes)

These are the non-obvious rules and quirks that keep the system secure and
consistent. If you change behavior, update this section.

### 1) Public API surface only
- The **public interface** is **RPC functions** and **public views**.
- Do **not** allow direct table writes from clients. This is intentional.
- app/cfg/audit schemas are treated as **internal**; only service_role should
  have direct access.

### 2) Tenant context is a convenience, not security
- `app.current_tenant_id` is set by `rpc_set_tenant_context` for filtering views.
- **RLS must never rely on tenant context**. It must rely on `auth.uid()` and
  membership tables.

### 3) Permissions are enforced in RPC, not by RLS
- RLS policies enforce **tenant membership**, not fine-grained permissions.
- **All writes must go through RPC** so permission checks are enforced.
- If you add new write paths, mirror the permission checks in RPC.

### 4) Workflow transitions must go through RPC
- Status catalogs and transitions live in `cfg.*`.
- `rpc_transition_work_order_status` is the only supported way to move status.
- Direct status updates bypass guard conditions and are **not allowed**.

### 5) Rate limits are part of the contract
- Use `util.check_rate_limit` (or config-based variants) in new RPC functions.
- These limits protect against abuse and are part of expected behavior.

### 6) Auditing is required for core entities
- `audit.log_entity_change()` is attached to core tables.
- If you add a core entity, add the audit trigger and RLS policy.

### 7) Analytics are materialized
- Read reporting data via `v_*` views.
- Refresh via `public.refresh_analytics_views()` (concurrent refresh).

## Schema layout
- `app`: core CMMS domain data (tenants, assets, locations, work_orders).
- `cfg`: tenant configuration (roles, permissions, workflow catalogs).
- `authz`: authorization helpers (membership/permission functions).
- `util`: shared utilities (timestamps, validations, rate limiting).
- `audit`: audit logs for compliance/security.
- `int`: integration scaffolding (reserved for external systems).
