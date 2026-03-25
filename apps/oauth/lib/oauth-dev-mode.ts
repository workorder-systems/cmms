/**
 * Partner OAuth playground: `/demo`, `/demo/callback`, and `/api/demo/*`.
 *
 * Production deployments (e.g. Railway) should leave the demo **disabled** so
 * end users only see sign-in and consent — not dynamic client registration or
 * token debugging.
 *
 * | `OAUTH_ENABLE_DEV_DEMO` / `WORKORDER_SYSTEMS_OAUTH_ENABLE_DEV_DEMO` | Behavior |
 * | --- | --- |
 * | `true` / `1` | Demo routes enabled (any `NODE_ENV`) |
 * | `false` / `0` | Demo routes disabled |
 * | unset | Enabled only when `NODE_ENV === "development"` (`next dev`) |
 */
export function isOAuthDevDemoEnabled(): boolean {
  const explicit = readOAuthDevDemoExplicit();
  if (explicit === true) return true;
  if (explicit === false) return false;
  return process.env.NODE_ENV === "development";
}

function readOAuthDevDemoExplicit(): boolean | undefined {
  const raw =
    process.env.OAUTH_ENABLE_DEV_DEMO?.trim() ??
    process.env.WORKORDER_SYSTEMS_OAUTH_ENABLE_DEV_DEMO?.trim();
  if (!raw) return undefined;
  const v = raw.toLowerCase();
  if (v === "true" || v === "1") return true;
  if (v === "false" || v === "0") return false;
  return undefined;
}
