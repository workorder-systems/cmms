# Contributing

Thanks for contributing to Work Order Systems - Database. We welcome issues,
pull requests, and documentation improvements.

## Quick start
Prereqs:
- Node.js 20+ recommended
- Supabase CLI

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

## License
By contributing, you agree your contributions are licensed under
AGPL-3.0-or-later.
