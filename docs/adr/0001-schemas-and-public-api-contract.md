# ADR 0001: Schemas and public API contract

Date: 2026-01-28
Status: Accepted

## Context

We need a multi-tenant database architecture that enforces isolation, keeps
client access predictable, and supports future modules. Client applications
should not write directly to tables to avoid bypassing authorization rules and
business logic.

## Decision Drivers

- Strong tenant isolation and least privilege.
- A stable, explicit client contract that can evolve safely.
- Clear separation of responsibilities across schemas.

## Options Considered

- Single schema with direct table access.
- Public table access with RLS-only enforcement.
- Schema separation + public views/RPC contract (selected).

## Decision

1. **Separate schemas by responsibility.**
   - `app`: core domain data.
   - `cfg`: tenant configuration and permissions.
   - `authz`: authorization helpers.
   - `util`: shared utilities and triggers.
   - `audit`: audit logs and event history.
   - `int`: integrations and async scaffolding.

2. **Expose a strict public contract.**
   - **Reads** are provided via `public` read-only views.
   - **Writes** are performed via `public` RPC functions only.
   - Client applications do not write to base tables directly.

3. **Enforce tenant isolation via RLS.**
   - RLS is enabled on all tenant-scoped tables.
   - Access is derived from `auth.uid()` and membership checks.

## Scope

Applies to all tenant-scoped data in this repository and the public database
contract. It does not define external services, UI behavior, or plugin runtimes.

## Consequences

- Client access is predictable and secure, with explicit RPC entry points.
- New functionality must include appropriate RPCs and public views.
- Permissions and business rules remain centralized in RPC logic.
- Internal schemas remain private and can evolve without client breakage.

## Security and Privacy Considerations

- RLS enforces membership boundaries on all base tables.
- Service-role access is reserved for internal automation, not client use.
- Public views and RPCs are the only supported client entry points.

## Operational Impact

- Views and RPCs must be maintained alongside schema changes.
- Automated tests must verify RLS and RPC permissions.

## Testing / Verification

- Integration tests validate tenant isolation and permission checks.
- Migration tests validate that new tables have RLS and correct policies.

## References

- `supabase/README.md`
