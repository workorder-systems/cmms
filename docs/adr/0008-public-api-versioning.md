# ADR 0008: Public view and RPC versioning

Date: 2026-01-28
Status: Proposed

## Context

The public API contract is defined by `public` views and RPC functions. We need
guidelines for evolving this contract across pre-release and stable phases
without breaking clients unnecessarily.

## Decision Drivers

- Maintain a stable client contract over time.
- Allow rapid iteration before a stable release.
- Provide a clear upgrade path without long-term breakage.

## Options Considered

- Freeze public views/RPCs early and avoid breaking changes.
- Allow breaking changes at any time with no versioning.
- Allow pre-release breakage with a defined path to versioned APIs (selected).

## Decision

1. **Pre-release flexibility with explicit documentation.**
   - Breaking changes to views or RPCs are allowed during active development.
   - Each breaking change must be documented in migration comments and
     ADRs where applicable.

2. **Use additive changes by default.**
   - Prefer adding new columns, views, or RPCs over modifying existing ones.
   - Deprecate before removal when possible, even during pre-release.

3. **Adopt versioned APIs for stable releases.**
   - Introduce `rpc_<name>_v2` functions instead of changing behavior in place.
   - Use versioned view names (`v_<name>_v2`) when breaking changes are needed.
   - Keep prior versions available during a documented deprecation window.

## Scope

Applies to `public` views and RPCs. It does not constrain internal schemas or
internal helper functions.

## Consequences

- Early development remains fast while keeping change history visible.
- Consumers can adapt to changes with clear migration guidance.
- The path to stable API versioning is defined before release.

## Security and Privacy Considerations

- Versioning must not weaken RLS or permission checks.
- Deprecated endpoints remain protected by current policies.

## Operational Impact

- Versioned functions and views increase maintenance burden.
- Deprecation schedules require clear documentation and testing.

## Testing / Verification

- Tests cover both current and deprecated RPCs/views during migration windows.
- Contract tests validate backward-compatible behavior.
