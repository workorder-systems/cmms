# ADR 0002: Modules vs plugins vs integrations

Date: 2026-01-28
Status: Proposed

## Context

We need consistent terminology and boundaries for product capabilities, optional
extensions, and external system connectivity. The platform is multi-tenant and
must remain secure; we also want to avoid plugins adding SQL or schema changes.

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

## Consequences

- Core features that require data model changes must be implemented as modules.
- Optional or niche capabilities should be implemented as plugins.
- External systems are treated as integrations and follow plugin constraints.
- This classification guides future architecture and documentation decisions.

