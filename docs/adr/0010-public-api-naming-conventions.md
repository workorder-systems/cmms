# ADR 0010: Public view and RPC naming conventions

Date: 2026-01-28
Status: Proposed

## Context

The public database contract is formed by `public` views and RPCs. Consistent
naming avoids ambiguity, reduces client churn, and prevents long-term
maintenance debt as modules grow.

## Decision Drivers

- Predictable API naming for clients and integrators.
- Low-friction evolution over time.
- Consistency across modules and teams.

## Options Considered

- Allow ad-hoc names per module.
- Use a strict naming standard with exceptions documented (selected).

## Decision

1. **Public views use `v_<resource>` with plural resource names.**
   - Examples: `public.v_work_orders`, `public.v_assets`.
   - Summary/analytics views use `v_<resource>_summary` or `v_<resource>_overview`.
   - Versioned views use `v_<resource>_v2` when breaking changes are required.

2. **Write RPCs use `rpc_<verb>_<resource>`.**
   - Examples: `public.rpc_create_work_order`, `public.rpc_update_asset`.
   - Verbs are consistent: `create`, `update`, `delete`, `assign`, `complete`,
     `invite`, `set`, `refresh`.
   - Versioned RPCs append `_v2` for breaking changes.

3. **Tenant-scoped RPC parameter ordering.**
   - `p_tenant_id` comes first when required.
   - Primary resource identifiers follow (`p_work_order_id`, `p_asset_id`).
   - Payload fields follow in a stable order.

4. **No direct table writes in public APIs.**
   - All write paths must be RPCs that call `authz.rpc_setup` and validate
     permissions.

## Scope

Applies to all `public` views and RPCs. It does not constrain internal helper
functions or private schemas.

## Consequences

- Clients can infer API behavior by name.
- New modules adopt a predictable public surface.
- Exceptions must be documented to avoid drift.

## Security and Privacy Considerations

- Naming does not replace authorization; RPCs must enforce permissions.
- Public views remain read-only and tenant-scoped.

## Operational Impact

- Requires review checks to enforce naming standards.
- Versioned endpoints increase maintenance but reduce breaking changes.

## Testing / Verification

- Lint or review checks validate naming conventions.
- Contract tests verify view/RPC stability across releases.

## References

- `supabase/migrations/20260121124000_api_layer.sql`
