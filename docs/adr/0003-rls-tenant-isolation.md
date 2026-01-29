# ADR 0003: RLS model and tenant isolation strategy

Date: 2026-01-28
Status: Accepted

## Context

The database is multi-tenant and must enforce strict tenant isolation. We need
clear, consistent rules for how RLS is applied, how tenant context is derived,
and what guarantees are (and are not) provided by session context.

## Decision

1. **Enable RLS on all tenant-scoped tables.**
   - Access is granted only to users who are members of the tenant.
   - Membership is checked via `app.tenant_memberships` and `auth.uid()`.

2. **Use `auth.uid()` as the primary security anchor.**
   - RLS policies rely on `auth.uid()` + membership tables.
   - Session context (`app.current_tenant_id`) is a convenience for views/RPC
     but **never** a security boundary.

3. **Provide a tenant context helper for client convenience.**
   - `public.rpc_set_tenant_context` sets the session variable after validating
     membership.
   - Views may use this context for filtering, but RLS remains authoritative.

4. **Separate access concerns by schema.**
   - `app` and `cfg` are tenant-scoped with RLS.
   - `audit` is tenant-scoped and readable only by authorized tenant admins.
   - `public` contains read-only views and RPCs as the client contract.

## Consequences

- Tenant isolation is enforced consistently across all data access paths.
- Client code must rely on public views and RPCs; direct table writes are blocked.
- Session context is useful for convenience, but misuse does not weaken security.
- New tables and views must follow these RLS and membership conventions.
