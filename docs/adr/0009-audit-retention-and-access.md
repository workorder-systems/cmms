# ADR 0009: Audit retention and access policy

Date: 2026-01-28
Status: Proposed

## Context

Audit tables provide critical visibility into changes for security,
troubleshooting, and compliance. They also grow without bound if unmanaged. We
need a durable policy for retention, access, and data sensitivity that scales
with tenants and future modules.

## Decision Drivers

- Maintain tenant isolation and least-privilege access.
- Preserve audit history long enough for investigations and compliance.
- Prevent unbounded growth and performance degradation.

## Options Considered

- Retain audit data indefinitely with no purge strategy.
- Fixed retention window for all deployments.
- Default retention window with deployment-specific overrides (selected).

## Decision

1. **Tenant-scoped access only.**
   - Audit tables remain in `audit` and are not exposed directly to clients.
   - Access is provided through tenant-scoped views with admin-level
     authorization.

2. **Default retention window.**
   - Target default retention is **24 months**.
   - Deployments may extend retention for regulated environments.

3. **Purge and archive strategy.**
   - A scheduled job purges records beyond the retention window.
   - Optional export to external storage is allowed before purge.

4. **Data minimization.**
   - Audit records must never contain secrets or tokens.
   - Sensitive fields should be minimized or redacted when feasible.

## Scope

Applies to `audit.entity_changes` and `audit.permission_changes` and any future
audit tables. It does not define external SIEM or log aggregation systems.

## Consequences

- Audit data remains useful without growing indefinitely.
- Long-term compliance is supported through configurable retention.
- Purge and export workflows become operational requirements.

## Security and Privacy Considerations

- Audit access is limited to tenant admins and audited by design.
- Any break-glass or support access requires a dedicated ADR and tooling.

## Operational Impact

- Requires a scheduled purge process and monitoring of audit table growth.
- Retention configuration must be documented per deployment.

## Testing / Verification

- Tests verify audit views enforce admin-only access.
- Purge jobs are validated in staging with retention thresholds.

## References

- `supabase/migrations/20260121125000_enterprise_features.sql`
