# ADR 0006: Permissions and ABAC model

Date: 2026-01-28
Status: Accepted

## Context

The platform needs consistent authorization across tenants, roles, and scoped
access to locations or departments. We must support both role-based access
control (RBAC) and attribute-based access control (ABAC) while keeping RLS
simple and performant.

## Decision Drivers

- Least-privilege access by default.
- Tenant-specific roles without duplicating permission catalogs.
- Scalability for future modules and new permission types.

## Options Considered

- Per-tenant permission catalogs.
- RBAC only (no ABAC).
- ABAC only (no roles).
- Global permission catalog + RBAC + ABAC (selected).

## Decision

1. **Use a global permission catalog in `cfg.permissions`.**
   - Permissions are immutable and shared across tenants.
   - Tenants assign permissions to their own roles.

2. **Model roles per tenant.**
   - `cfg.tenant_roles` defines tenant roles.
   - `cfg.tenant_role_permissions` links roles to permissions.
   - `app.user_tenant_roles` assigns users to roles.

3. **Use ABAC scopes for fine-grained access.**
   - `app.membership_scopes` stores attribute scopes (location, department).
   - Helper functions (`authz.check_abac_scope`, `authz.has_location_scope`,
     `authz.has_department_scope`) enforce scoped access.

4. **Enforce permissions via RPC.**
   - `authz.has_permission` and `authz.validate_permission` are required in
     write RPCs; RLS enforces tenant membership.

## Scope

Applies to authorization for tenant-scoped data and RPC write paths. It does
not define UI role management or external identity providers.

## Consequences

- Authorization remains consistent across modules and future features.
- Tenants can customize roles without altering the global permission catalog.
- ABAC scopes provide granular access while preserving RLS performance.

## Security and Privacy Considerations

- RLS enforces tenant membership; permissions gate write access.
- ABAC scopes must be validated through RPC or helper functions.

## Operational Impact

- New modules must register permissions and update defaults.
- Permission changes should be audited and reviewed.

## Testing / Verification

- Permission checks are covered by RPC tests.
- ABAC scope behavior is covered by scoped access tests.
