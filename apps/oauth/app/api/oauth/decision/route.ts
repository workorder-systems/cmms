import { fetchAuthorizationDetails, postOAuthConsent } from "@/lib/oauth-server-api";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function parseTenantIds(formData: FormData): string[] {
  const raw = formData.getAll("tenant_ids");
  const out: string[] = [];
  for (const v of raw) {
    if (typeof v === "string" && v.trim()) {
      out.push(v.trim());
    }
  }
  return out;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const authorizationId = formData.get("authorization_id");
  const decision = formData.get("decision");

  if (typeof authorizationId !== "string" || !authorizationId.trim()) {
    return NextResponse.json(
      { error: "Missing authorization_id" },
      { status: 400 },
    );
  }

  if (decision !== "approve" && decision !== "deny") {
    return NextResponse.json(
      { error: "decision must be approve or deny" },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const authDetails = await fetchAuthorizationDetails(
    session.access_token,
    authorizationId,
  );

  if (!authDetails.ok) {
    return NextResponse.json(
      { error: authDetails.error },
      { status: 400 },
    );
  }

  const oauthClientId = authDetails.data.client?.id?.trim();
  if (!oauthClientId) {
    return NextResponse.json(
      { error: "Missing OAuth client on authorization" },
      { status: 400 },
    );
  }

  const tenantIds = parseTenantIds(formData);

  if (decision === "approve" && tenantIds.length === 0) {
    return NextResponse.json(
      { error: "Select at least one organization to continue." },
      { status: 400 },
    );
  }

  const { error: rpcError } = await supabase.rpc(
    "rpc_replace_oauth_client_tenant_grants",
    {
      p_oauth_client_id: oauthClientId,
      p_tenant_ids:
        decision === "approve"
          ? tenantIds
          : /* deny: revoke grants for this client */ [],
    },
  );

  if (rpcError) {
    return NextResponse.json(
      { error: rpcError.message ?? "Could not save organization access" },
      { status: 400 },
    );
  }

  const result = await postOAuthConsent(
    session.access_token,
    authorizationId,
    decision,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.redirect(result.redirect_url);
}
