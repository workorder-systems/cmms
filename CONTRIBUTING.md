# Contributing

Thanks for contributing to Work Order Systems - Database. We welcome issues,
pull requests, and documentation improvements.

## Quick start
Prereqs:
- Node.js 20+ recommended
- Supabase CLI

```bash
npm install
npm run supabase:start
npm test
```

## Development workflow
- Use feature branches and keep commits focused.
- Open PRs against `main`.
- Include tests when behavior changes.
- Update docs when the API contract changes.

## Database changes
When adding or changing schema:
1. Add migrations under `supabase/migrations/` using the Supabase CLI format.
2. Use lowercase SQL and include clear header comments.
3. Enable RLS on new tables and add tenant policies.
4. Add audit triggers for core entities where needed.
5. Expose new writes via RPC and reads via public views.

See `supabase/README.md` for architecture rules and patterns.

## Tests
- `npm test` runs the Vitest suite.
- Use `npm run supabase:stop` to stop local services if needed.

## License
By contributing, you agree your contributions are licensed under
AGPL-3.0-or-later.
