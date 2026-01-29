# ADR 0005: Integration and plugin data boundaries

Date: 2026-01-28
Status: Proposed

## Context

We want a plugin and integration system that is multi-tenant secure and does
not allow plugins to alter the database schema. We also need a clear boundary
between what is stored in the database and what is stored externally (secrets,
tokens, and runtime config).

## Decision Drivers

- Preserve database stability and tenant isolation.
- Avoid storing secrets in Postgres.
- Enable integrations without schema changes from plugin authors.

## Options Considered

- Allow plugins to add SQL migrations.
- Store tokens and secrets in the database.
- Keep a strict boundary: DB for metadata, external store for secrets
  (selected).

## Decision

1. **Plugins do not add SQL or schema changes.**
   - All plugin behavior must use the public API contract (views for reads, RPC
     for writes).

2. **Store plugin metadata and tenant installations in `int`.**
   - The database holds catalog and tenant install state.
   - Secrets and OAuth tokens are stored outside the database with references
     stored in `int` tables.

3. **Runtime execution is external.**
   - Plugin code runs in a separate host/service and authenticates with
     tenant-scoped credentials.

## Scope

Defines data ownership boundaries for integrations and plugins. It does not
choose a specific secrets manager or plugin runtime.

## Consequences

- The core database remains stable and multi-tenant safe.
- Integrations can be added without schema changes from plugin authors.
- Secrets management and runtime isolation are enforced outside Postgres.

## Security and Privacy Considerations

- Secrets and tokens must never be stored in database tables.
- Integration access uses tenant-scoped credentials and least privilege.

## Operational Impact

- Requires an external secrets store and plugin runtime service.
- Installation metadata must be kept in sync with external secrets.

## Testing / Verification

- RLS tests for `int` tables once introduced.
- Integration tests verify tenant scoping and secret references.
