# ADR 0007: Deletion policy (soft vs hard delete)

Date: 2026-01-28
Status: Proposed

## Context

The database includes both operational data (work orders, assets, locations) and
audit history. We need a consistent approach to deletions that balances data
retention, performance, and compliance. The platform is still in active
development, so we need a policy that is flexible but explicit.

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

## Consequences

- The schema remains lean and performant for core tables.
- Audit logs provide historical visibility for hard deletes.
- Soft delete behavior is intentional, scoped, and documented.
