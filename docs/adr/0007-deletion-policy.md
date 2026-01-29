# ADR 0007: Deletion policy (soft vs hard delete)

Date: 2026-01-28
Status: Proposed

## Context

The database includes both operational data (work orders, assets, locations) and
audit history. We need a consistent approach to deletions that balances data
retention, performance, and compliance. The policy must remain explicit and
stable as modules evolve.

## Decision Drivers

- Keep operational tables lean and performant.
- Preserve auditability and compliance where required.
- Avoid accidental data exposure from soft-deleted rows.

## Options Considered

- Soft delete all entities by default.
- Hard delete all entities by default.
- Hybrid: hard delete by default, soft delete when required (selected).

## Decision

1. **Default to hard deletes for operational data.**
   - Base tables do not include `deleted_at` by default.
   - Deletions are performed via RPC and audited in `audit.entity_changes`.

2. **Use soft deletes only when required by compliance or workflow.**
   - If a module needs reversible deletes or legal retention, add `deleted_at`
     (and related indexes) explicitly for that table.

3. **Document retention requirements per module.**
   - Modules that require retention must define the expected lifecycle and
     restoration behavior in their module docs.

## Scope

Applies to operational tables in `app` and `cfg`. Audit retention is managed
separately.

## Consequences

- The schema remains lean and performant for core tables.
- Audit logs provide historical visibility for hard deletes.
- Soft delete behavior is intentional, scoped, and documented.

## Security and Privacy Considerations

- Soft-deleted rows must be excluded from public views by default.
- Deletions should be auditable to support compliance reviews.

## Operational Impact

- Modules using soft deletes must include cleanup or retention policies.
- Hard deletes may require safeguards in RPCs to prevent data loss.

## Testing / Verification

- Tests verify delete RPC behavior and audit logging.
- Views and RLS policies should exclude soft-deleted data where applicable.
