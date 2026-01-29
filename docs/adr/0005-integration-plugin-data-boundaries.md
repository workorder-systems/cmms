# ADR 0005: Integration and plugin data boundaries

Date: 2026-01-28
Status: Proposed

## Context

We want a plugin and integration system that is multi-tenant secure and does
not allow plugins to alter the database schema. We also need a clear boundary
between what is stored in the database and what is stored externally (secrets,
tokens, and runtime config).

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

## Consequences

- The core database remains stable and multi-tenant safe.
- Integrations can be added without schema changes from plugin authors.
- Secrets management and runtime isolation are enforced outside Postgres.
