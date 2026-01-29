# ADR 0001: Schemas and public API contract

Date: 2026-01-28
Status: Accepted

## Context

We need a multi-tenant database architecture that enforces isolation, keeps
client access predictable, and supports future modules. Client applications
should not write directly to tables to avoid bypassing authorization rules and
business logic.

## Decision

1. Use separate schemas with clear responsibilities:
   - `app`: core domain data
   - `cfg`: tenant configuration and permissions
   - `authz`: authorization helpers
   - `util`: shared utilities and triggers
   - `audit`: audit logs and event history
   - `int`: integrations and async scaffolding

2. Expose a strict public contract:
   - **Reads** are provided via `public` read-only views.
   - **Writes** are performed via `public` RPC functions only.
   - Client applications do not write to base tables directly.

3. Enforce tenant isolation with RLS on all tenant-scoped tables, and use
   `auth.uid()` + membership checks for access decisions.

## Consequences

- Client access is predictable and secure, with explicit RPC entry points.
- New functionality must include appropriate RPCs and public views.
- Permissions and business rules remain centralized in RPC logic.
- Internal schemas remain private and can evolve without client breakage.
