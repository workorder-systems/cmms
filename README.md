# Work Order Systems - Database

[![CI](https://github.com/workorder-systems/db/actions/workflows/test.yml/badge.svg)](https://github.com/workorder-systems/db/actions/workflows/test.yml)
[![License](https://img.shields.io/github/license/workorder-systems/db)](LICENSE)

A multi-tenant Supabase/Postgres schema for work order and
maintenance management systems (CMMS).

## What this is
This repository provides the database layer for Work Order Systems: a secure,
multi-tenant CMMS backend designed for teams managing assets, locations, and
maintenance workflows.

## Core features
- Multi-tenant isolation with row level security (RLS)
- Work orders with configurable workflow statuses and priorities
- Assets, locations (hierarchical), and departments
- Roles, permissions, and ABAC scopes for access control
- Audit logging and analytics-friendly materialized views
- RPC-first API surface for safe, permissioned writes

## Quick start (local)
Prereqs:
- Node.js 20+ recommended
- Supabase CLI

```bash
npm install
npm run supabase:start
npm test
```

## Repo layout
- `supabase/` - schema, migrations, and config
- `packages/sdk/` - TypeScript SDK for the public API
- `tests/` - Vitest integration tests
- `docs/adr/` - architecture decision records

## Architecture and rules
Detailed architecture and database rules live in:
- [`supabase/README.md`](supabase/README.md)

## Contributing
See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, workflow, and migration rules.

## Security
Please review [SECURITY.md](SECURITY.md) for how to report vulnerabilities.

## Support
Use GitHub Issues for bug reports and feature requests.

## License
Licensed under AGPL-3.0-or-later. See [LICENSE](LICENSE).
