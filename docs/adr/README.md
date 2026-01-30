# Architecture Decision Records (ADR)

This folder stores architecture decision records for the Work Order Systems
platform. ADRs capture durable decisions and the reasoning behind them so the
system stays consistent and maintainable over time.

If a decision changes, create a new ADR and mark the old one as **Superseded**.

See [INDEX.md](INDEX.md) for the current ADR list and statuses.

For implementation planning of proposed ADRs, see
[implementation-plan.md](implementation-plan.md).

## Naming

Use sequential numbering with a short, descriptive slug:

- `0001-schemas-and-public-api-contract.md`
- `0002-modules-plugins-integrations.md`

## Status

- **Proposed**: Under review, not yet adopted.
- **Accepted**: Current decision in use.
- **Superseded**: Replaced by a newer ADR.

## Template

```
# ADR NNNN: Title

Date: YYYY-MM-DD
Status: Proposed | Accepted | Superseded

## Context

Explain the problem and constraints.

## Decision Drivers

What matters most (security, scale, cost, DX, etc).

## Options Considered

- Option A
- Option B

## Decision

State the decision and the rationale.

## Scope

What this applies to and what it does not.

## Consequences

List the expected impacts and tradeoffs.

## Security and Privacy Considerations

Risks, mitigations, and trust boundaries.

## Operational Impact

Runbooks, monitoring, performance, and support implications.

## Testing / Verification

How to validate the decision is working.

## References

Links to related docs, migrations, or code.
```
