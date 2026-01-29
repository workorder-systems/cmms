# ADR implementation plan (proposed ADRs)
Date: 2026-01-29
Status: Draft

## Scope
This plan covers the ADRs that are still in **Proposed** status:
- [0002](0002-modules-plugins-integrations.md)
- [0005](0005-integration-plugin-data-boundaries.md)
- [0007](0007-deletion-policy.md)
- [0008](0008-public-api-versioning.md)
- [0009](0009-audit-retention-and-access.md)
- [0010](0010-public-api-naming-conventions.md)

## Guiding principles
- Treat `public` views + RPCs as the only client contract.
- Prefer additive changes; use versioned endpoints for breaking changes.
- Keep tenant isolation and least privilege as non-negotiable invariants.
- Use migrations for all schema changes, with tests covering new behavior.

## Phase 0: inventory and gap analysis (cross-cutting)
1. **Catalog the current public surface.**
   - List all `public` views and RPCs, including parameters and return types.
   - Identify any naming or ordering deviations from ADR 0010.
2. **Review existing delete paths and audit logging.**
   - Identify which entities support delete RPCs today and how audit is captured.
   - Capture any tables that already include soft delete fields.
3. **Assess integration scaffolding.**
   - Confirm current `int` schema usage (likely empty) and existing RLS patterns.

**Current snapshot (2026-01-29):**
- No `int` tables exist yet in migrations.
- No `deleted_at` columns exist in `app` or `cfg` tables.
- Summary/overview views use singular resource names today
  (`v_work_order_summary`, `v_asset_summary`, `v_location_summary`,
  `v_tenant_overview`), which will need versioned renames or documented
  exceptions once ADR 0010 is enforced.

## Plan by ADR

### ADR 0002: Modules vs plugins vs integrations
**Goal:** Make the taxonomy enforceable in docs and review.
1. **Documentation updates.**
   - Add the module/plugin/integration checklist to `supabase/README.md`.
   - Add a review checklist entry to `.github/PULL_REQUEST_TEMPLATE.md`.
2. **Governance and review flow.**
   - Require new features to declare their classification in PR summaries.
   - Document which changes are allowed only for modules (schema changes).
3. **Verification.**
   - Add a lightweight test or CI check that schema changes only appear in
     migrations (already standard, but make it explicit in docs).

### ADR 0005: Integration and plugin data boundaries
**Goal:** Define the database contract for plugin metadata without storing secrets.
1. **Design the `int` data model.**
   - `int.plugins`: catalog of available plugins and integrations.
   - `int.plugin_installations`: tenant installation state with secret references.
   - Optional `int.plugin_events` (future): execution logs or sync states.
2. **Implement migrations.**
   - Create tables in `int` with RLS enabled.
   - Add policies: tenant-admin access for reads/writes; no public access.
   - Store only opaque secret references, never secrets or tokens.
3. **Public API surface.**
   - Add RPCs for install, update, and uninstall operations.
   - Add read-only `public` views for tenant-scoped installation status.
4. **Tests.**
   - RLS tests for `int` tables.
   - API tests to ensure secret references are handled but secrets are not stored.
5. **Operational documentation.**
   - Document the external secret store contract and required runtime service.

### ADR 0007: Deletion policy (soft vs hard delete)
**Goal:** Make deletion behavior explicit, consistent, and auditable.
1. **Retention matrix.**
   - For each table in `app` and `cfg`, decide: hard delete or soft delete.
   - Document decisions in module docs and link to this ADR.
2. **Schema updates (where soft delete is required).**
   - Add `deleted_at` and optional `deleted_by` with indexes.
   - Update public views to filter soft-deleted rows by default.
3. **RPC behavior.**
   - Ensure delete RPCs do hard deletes by default.
   - Add soft-delete RPCs only for explicitly approved entities.
4. **Audit verification.**
   - Confirm delete actions are recorded in `audit.entity_changes`.
5. **Tests.**
   - Validate deleted rows are excluded from `public` views.
   - Ensure audit entries are created for both hard and soft deletes.

### ADR 0008: Public view and RPC versioning
**Goal:** Provide a predictable path for breaking changes.
1. **Define versioning rules in docs.**
   - Add a dedicated section in `supabase/README.md` for API versioning.
   - Document deprecation windows and required migration notes.
2. **Introduce versioned endpoints when needed.**
   - Use `v_<resource>_v2` and `rpc_<verb>_<resource>_v2` for breaking changes.
   - Keep older versions during the deprecation window.
3. **Testing and validation.**
   - Add contract tests that assert existing view/RPC signatures remain stable
     unless a versioned replacement is introduced.
   - Add a checklist item to ensure breaking changes are documented.

### ADR 0009: Audit retention and access policy
**Goal:** Keep audit data useful, secure, and bounded in size.
1. **Admin-only audit access.**
   - Add tenant-scoped `public` views for audit data with admin-only access.
   - Ensure audit tables remain private and are not queried directly by clients.
2. **Retention configuration.**
   - Add a config table for retention window overrides (default 24 months).
   - Document deployment-specific overrides.
3. **Purge and archive tooling.**
   - Add a purge RPC or scheduled function to delete old audit records.
   - Document optional export workflow before purge.
4. **Tests.**
   - Verify admin-only access to audit views.
   - Validate purge logic in staging (with smaller retention window).

### ADR 0010: Public view and RPC naming conventions
**Goal:** Enforce consistent naming and parameter ordering across the public API.
1. **Inventory and remediation.**
   - Identify any view/RPC names that do not match the conventions.
   - Rename non-conforming endpoints using versioned replacements if needed.
2. **Enforcement.**
   - Add a test that queries `pg_proc` and `pg_views` to enforce naming rules.
   - Include parameter ordering checks (`p_tenant_id` first where applicable).
3. **Documentation.**
   - Add examples and exceptions to `supabase/README.md` or a dedicated doc.

## Dependencies and sequencing
- ADR 0010 (naming) and ADR 0008 (versioning) should be implemented before
  introducing any new public endpoints for integrations or deletion policies.
- ADR 0005 (data boundaries) is a prerequisite for any integration runtime work.
- ADR 0009 (audit retention) should follow once audit access views exist.

## Definition of done (for each ADR)
- Migrations applied with RLS and comments where required.
- Tests added or updated with coverage for new behavior.
- Documentation updated, including `supabase/README.md` and PR checklist.
- ADR status updated to **Accepted** once implementation is complete.
