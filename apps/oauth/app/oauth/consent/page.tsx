import { OauthFrame } from "@/app/components/oauth-frame";
import { IconCheck } from "@/app/components/icons";
import { scopeConsentLabel } from "@/app/components/scope-label";
import { getOAuthConsentLoadErrorMessage } from "@/lib/oauth-errors";
import { fetchAuthorizationDetails } from "@/lib/oauth-server-api";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

type TenantRow = { id: string; name: string };

export default async function OAuthConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ authorization_id?: string }>;
}) {
  const { authorization_id: authorizationId } = await searchParams;

  if (!authorizationId?.trim()) {
    return (
      <OauthFrame>
        <h1 className="oauth-title">Can&apos;t continue</h1>
        <p className="oauth-error" role="alert">
          This sign-in link is incomplete. Start again from the app you were using.
        </p>
      </OauthFrame>
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    const next = `/oauth/consent?authorization_id=${encodeURIComponent(authorizationId)}`;
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  const result = await fetchAuthorizationDetails(
    session.access_token,
    authorizationId,
  );

  if (!result.ok) {
    const isDev = process.env.NODE_ENV === "development";
    return (
      <OauthFrame>
        <h1 className="oauth-title">Something went wrong</h1>
        <p className="oauth-error" role="alert">
          {getOAuthConsentLoadErrorMessage(result.error)}
        </p>
        {isDev ? (
          <details className="oauth-advanced" style={{ marginTop: 16 }}>
            <summary>Developer details</summary>
            <pre
              className="mono-inline"
              style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
            >
              {result.error}
            </pre>
          </details>
        ) : null}
      </OauthFrame>
    );
  }

  const { data: tenantRows, error: tenantsError } = await supabase
    .from("v_tenants")
    .select("id, name")
    .order("name", { ascending: true });

  const tenants: TenantRow[] =
    !tenantsError && Array.isArray(tenantRows)
      ? (tenantRows as TenantRow[])
      : [];

  const { client, redirect_uri: redirectUri, scope } = result.data;
  const clientName = client?.name?.trim() || client?.id || "This app";
  const initial = clientName.charAt(0).toUpperCase();
  const scopes = scope?.trim().split(/\s+/).filter(Boolean) ?? [];

  if (tenants.length === 0) {
    return (
      <OauthFrame>
        <h1 className="oauth-title">No organizations</h1>
        <p className="oauth-muted">
          You need to belong to at least one organization in Work Order Systems before
          you can connect apps.
        </p>
        <form method="post" action="/api/oauth/decision">
          <input type="hidden" name="authorization_id" value={authorizationId} />
          <div className="oauth-action-row">
            <button
              type="submit"
              name="decision"
              value="deny"
              className="btn btn-primary"
            >
              Close
            </button>
          </div>
        </form>
      </OauthFrame>
    );
  }

  return (
    <OauthFrame>
      <div className="oauth-app-row">
        <div className="oauth-app-avatar" aria-hidden>
          {initial}
        </div>
        <div>
          <h1 className="oauth-title" style={{ marginBottom: 0 }}>
            <span style={{ fontWeight: 600 }}>{clientName}</span> wants to access
            your Work Order Systems account
          </h1>
        </div>
      </div>

      <p className="oauth-subtitle">
        {scopes.length > 0
          ? "This allows the app to:"
          : "You can review what this means before you continue."}
      </p>

      {scopes.length > 0 ? (
        <ul className="oauth-scope-list">
          {scopes.map((s) => (
            <li key={s}>
              <span className="oauth-scope-icon" aria-hidden>
                <IconCheck />
              </span>
              <span>{scopeConsentLabel(s)}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <hr className="oauth-divider" style={{ margin: "20px 0" }} />

      <form method="post" action="/api/oauth/decision">
        <input type="hidden" name="authorization_id" value={authorizationId} />

        <fieldset className="oauth-tenant-fieldset">
          <legend className="oauth-tenant-legend">
            Organizations this app can access
          </legend>
          <p className="oauth-muted" style={{ marginBottom: 12 }}>
            Data such as work orders is limited to the organizations you select. You
            can use another sign-in later to change this.
          </p>
          <ul className="oauth-tenant-list">
            {tenants.map((t, idx) => (
              <li key={t.id}>
                <label className="oauth-tenant-item">
                  <input
                    type="checkbox"
                    name="tenant_ids"
                    value={t.id}
                    defaultChecked={tenants.length === 1 || idx === 0}
                  />
                  <span>{t.name}</span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>

        {redirectUri ? (
          <details className="oauth-advanced">
            <summary>Technical details</summary>
            <p className="mono-inline">{redirectUri}</p>
          </details>
        ) : null}

        <div className="oauth-action-row">
          <button
            type="submit"
            name="decision"
            value="deny"
            className="btn btn-ghost"
          >
            Cancel
          </button>
          <button
            type="submit"
            name="decision"
            value="approve"
            className="btn btn-primary"
          >
            Allow
          </button>
        </div>
      </form>
    </OauthFrame>
  );
}
