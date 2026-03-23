import { OauthFrame } from "@/app/components/oauth-frame";
import { getOAuthConsentLoadErrorMessage } from "@/lib/oauth-errors";
import { fetchAuthorizationDetails } from "@/lib/oauth-server-api";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { OAuthConsentClient } from "./oauth-consent-client";

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
        <h1 className="oauth-title">This link is incomplete</h1>
        <p className="oauth-muted">
          The authorization link is missing details. Open the app or service you
          were using and start the connection again.
        </p>
        <div className="oauth-links-row oauth-space-top-md">
          <Link href="/">Back to account access</Link>
        </div>
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
        <h1 className="oauth-title">We couldn&apos;t open this request</h1>
        <p className="oauth-error" role="alert">
          {getOAuthConsentLoadErrorMessage(result.error)}
        </p>
        <p className="oauth-muted">
          Start a new connection from the app you were using. If this keeps
          happening, try signing out and signing in again.
        </p>
        <div className="oauth-links-row oauth-space-top-sm">
          <Link href="/login">Sign in</Link>
          <Link href="/">Home</Link>
        </div>
        {isDev ? (
          <details className="oauth-advanced oauth-space-top-sm">
            <summary>Developer details</summary>
            <pre className="mono-inline oauth-pre-wrap">
              {result.error}
            </pre>
          </details>
        ) : null}
      </OauthFrame>
    );
  }

  if (result.kind === "redirect") {
    redirect(result.redirectUrl);
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
  const scopes = scope?.trim().split(/\s+/).filter(Boolean) ?? [];

  if (tenants.length === 0) {
    return (
      <OauthFrame>
        <h1 className="oauth-title">No organizations yet</h1>
        <p className="oauth-muted">
          You need to be a member of at least one organization in Work Order
          Systems before you can connect external apps.
        </p>
        <form method="post" action="/api/oauth/decision">
          <input type="hidden" name="authorization_id" value={authorizationId} />
          <div className="oauth-action-row oauth-action-row--single">
            <button
              type="submit"
              name="decision"
              value="deny"
              className="btn btn-primary btn-lg"
            >
              Close and return
            </button>
          </div>
        </form>
      </OauthFrame>
    );
  }

  return (
    <OauthFrame>
      <OAuthConsentClient
        authorizationId={authorizationId}
        clientName={clientName}
        redirectUri={redirectUri ?? null}
        scopes={scopes}
        tenants={tenants}
      />
    </OauthFrame>
  );
}
