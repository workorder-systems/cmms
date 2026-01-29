# ADR 0002: Modules vs plugins vs integrations

Date: 2026-01-28
Status: Proposed

## Context

We need consistent terminology and boundaries for product capabilities, optional
extensions, and external system connectivity. The platform is multi-tenant and
must remain secure; we also want to avoid plugins adding SQL or schema changes.

## Decision Drivers

- Keep the data model stable and multi-tenant safe.
- Make the roadmap predictable as new capabilities are added.
- Enable optional extensions without database churn.

## Options Considered

- Treat all optional features as modules (schema changes everywhere).
- Allow plugins to add SQL and schema changes.
- Use a clear taxonomy with stable boundaries (selected).

## Decision

1. **Module** (core product capability)
   - First-party feature owned by the core product.
   - Defines or changes the data model (SQL allowed).
   - Exposed via `public` views and `public` RPC functions.

2. **Plugin** (optional extension)
   - Adds optional behavior or UI around existing modules.
   - Does **not** add SQL or schema changes.
   - Uses the public API contract (views for reads, RPC for writes).

3. **Integration** (external connectivity)
   - A plugin subtype that connects to third-party systems.
   - May be backend-only, UI-assisted, or both.
   - Stores secrets outside the database (with references in config).

**Classification checklist**
- Changes or adds core data model? **Module**
- Optional behavior/UI around existing data? **Plugin**
- External system connectivity? **Integration**

## Scope

Defines terminology and boundaries for architecture and documentation. It does
not define implementation details of the plugin runtime or UI frameworks.

## Consequences

- Core features that require data model changes must be implemented as modules.
- Optional or niche capabilities should be implemented as plugins.
- External systems are treated as integrations and follow plugin constraints.
- This classification guides architecture, documentation, and roadmap decisions.

## Security and Privacy Considerations

- Plugins and integrations must adhere to the public API contract.
- Secrets and tokens are stored outside the database.

## Operational Impact

- Teams can decide early whether a change requires migrations.
- Integration effort is scoped to plugin runtime, not database changes.

## Testing / Verification

- Module changes require database migration and RLS tests.
- Plugin changes require API contract and permission tests.

