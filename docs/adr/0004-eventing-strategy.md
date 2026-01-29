# ADR 0004: Eventing strategy (audit log vs outbox)

Date: 2026-01-28
Status: Accepted

## Context

Integrations, analytics, and automation require a reliable change feed. We need
an eventing strategy that works with multi-tenant RLS, is easy to query, and can
scale without breaking the public API contract.

## Decision

1. **Use `audit.entity_changes` as the primary change feed.**
   - All core entity tables emit audit records via triggers.
   - `public.v_audit_entity_changes` provides a read-only view for consumers.

2. **Keep outbox support as a future extension.**
   - If throughput or delivery guarantees require it, add an
     `int.events_outbox` table with explicit event payloads and idempotency keys.
   - Outbox publishing will be handled by a relay service, not client queries.

## Consequences

- Current event consumers can read the audit view without schema changes.
- A relay can publish tenant-scoped events to a message bus.
- If higher reliability is needed, an outbox can be introduced without changing
  the public API contract.
