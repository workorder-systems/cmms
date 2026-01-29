# ADR 0008: Public view and RPC versioning

Date: 2026-01-28
Status: Proposed

## Context

The public API contract is defined by `public` views and RPC functions. We need
guidelines for evolving this contract without breaking clients, while the
platform is still in active development and has not reached a stable release.

## Decision

1. **Pre-release flexibility with explicit documentation.**
   - Breaking changes to views or RPCs are allowed during active development.
   - Each breaking change must be documented in migration comments and
     ADRs where applicable.

2. **Use additive changes by default.**
   - Prefer adding new columns, views, or RPCs over modifying existing ones.
   - Deprecate before removal when possible, even during pre-release.

3. **Adopt versioned RPCs when breaking changes become frequent.**
   - Introduce `rpc_<name>_v2` functions instead of changing behavior in place.
   - Keep prior versions available during a deprecation window.

## Consequences

- Early development remains fast while keeping change history visible.
- Consumers can adapt to changes with clear migration guidance.
- The path to stable API versioning is defined before release.
