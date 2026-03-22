# Contributing

Thanks for helping build **WorkOrder Systems OSS**: the **Linux of maintenance software**—a CMMS core teams can **own**, developers can **extend**, and vendors can **integrate with**, without open-core bait-and-switch. The project is **alpha**; we welcome issues, pull requests, and documentation improvements.

**New to the repo?** Follow **[GETTING_STARTED.md](GETTING_STARTED.md)** first (Docker, Supabase CLI, `.env.local`, common failures). **What you are contributing to** versus commercial product code: [OSS core and commercial boundary](docs/PROJECT.md#oss-core-and-commercial-boundary).

## Quick start
Prereqs (details in [GETTING_STARTED.md](GETTING_STARTED.md)):
- Node.js 20+ recommended
- Docker (for local Supabase)
- Supabase CLI
- pnpm (see root `package.json` `packageManager`)

```bash
pnpm install
pnpm start
pnpm test
```

## Development workflow
- Use feature branches and keep commits focused.
- Open PRs against `main`.
- Include tests when behavior changes.
- Update docs when the API contract changes.

## Database changes
When adding or changing schema:
1. Add migrations under `apps/supabase/migrations/` using the Supabase CLI format.
2. Use lowercase SQL and include clear header comments.
3. Enable RLS on new tables and add tenant policies.
4. Add audit triggers for core entities where needed.
5. Expose new writes via RPC and reads via public views.

See `apps/supabase/README.md` for architecture rules and patterns.

## Tests
- `npm test` (or `pnpm test`) runs the Vitest suite.
- Use `pnpm supabase:stop` to stop local services if needed.

**If many tests fail with auth errors** (e.g. "Database error finding user", "Database error querying schema"), the local DB may be out of sync with migrations. Run a full reset then test:

```bash
pnpm run supabase:reset
pnpm test
```

Or use the combined script:

```bash
pnpm run test:reset
```

This applies all migrations from scratch and then runs the test suite. Use this when you have pulled new migrations or see unexplained auth/setup failures.

## Open source and license

This project is **open source** under the **GNU Affero General Public License v3.0 or later** ([LICENSE](LICENSE) in this repository). By contributing, you agree your contributions are licensed under the same terms.

The root [README.md](README.md) has an **Open source and license** section with a plain-language summary of AGPL (not legal advice) and how that relates to **network services**. Security disclosures belong in [SECURITY.md](SECURITY.md), not public issues.
