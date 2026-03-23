import {
  getOAuthConsentLoadErrorMessage,
  isOAuthAuthorizationNoLongerPendingError,
} from "@/lib/oauth-errors";
import { buildOAuthRedirectClientErrorUrl } from "@/lib/oauth-redirect-url";
import { fetchAuthorizationDetails, postOAuthConsent } from "@/lib/oauth-server-api";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function parseTenantIdsFromForm(formData: FormData): string[] {
  const raw = formData.getAll("tenant_ids");
  const out: string[] = [];
  for (const v of raw) {
    if (typeof v === "string" && v.trim()) {
      out.push(v.trim());
    }
  }
  return out;
}

function parseTenantIdsFromJson(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((v): v is string => typeof v === "string" && v.trim() !== "")
      .map((s) => s.trim());
  }
  if (typeof value === "string" && value.trim()) {
    return value.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

type ParsedDecision =
  | { ok: true; authorizationId: string; decision: "approve" | "deny"; tenantIds: string[] }
  | { ok: false; error: string };

async function parseDecisionRequest(request: Request): Promise<ParsedDecision> {
  const url = new URL(request.url);
  const fromQuery = (field: string) => url.searchParams.get(field)?.trim() ?? "";

  const contentType = (request.headers.get("content-type") ?? "").toLowerCase();

  let authorizationId = "";
  let decisionRaw: string | null = null;
  let tenantIds: string[] = [];

  if (contentType.includes("application/json")) {
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return { ok: false, error: "Invalid JSON body" };
    }
    const aid = body.authorization_id ?? body.authorizationId;
    authorizationId =
      typeof aid === "string" ? aid.trim() : fromQuery("authorization_id");
    const d = body.decision;
    decisionRaw = typeof d === "string" ? d.trim() : fromQuery("decision") || null;
    const fromTenantIds = parseTenantIdsFromJson(body.tenant_ids);
    tenantIds =
      fromTenantIds.length > 0
        ? fromTenantIds
        : parseTenantIdsFromJson(body.tenantIds);
  } else {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return {
        ok: false,
        error:
          "Could not read form submission. Use the consent page buttons, or POST JSON with authorization_id and decision.",
      };
    }
    const aid = formData.get("authorization_id");
    authorizationId =
      (typeof aid === "string" ? aid.trim() : "") || fromQuery("authorization_id");
    for (const v of formData.getAll("decision")) {
      if (typeof v === "string") {
        const t = v.trim();
        if (t === "approve" || t === "deny") {
          decisionRaw = t;
          break;
        }
      }
    }
    if (!decisionRaw) {
      const q = fromQuery("decision");
      decisionRaw = q === "approve" || q === "deny" ? q : null;
    }
    tenantIds = parseTenantIdsFromForm(formData);
  }

  if (!authorizationId) {
    return { ok: false, error: "Missing authorization_id" };
  }

  if (decisionRaw !== "approve" && decisionRaw !== "deny") {
    return {
      ok: false,
      error:
        "decision must be approve or deny. Open the consent screen and use Allow access or Not now (do not bookmark this URL).",
    };
  }

  return {
    ok: true,
    authorizationId,
    decision: decisionRaw,
    tenantIds,
  };
}

export async function POST(request: Request) {
  const parsed = await parseDecisionRequest(request);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { authorizationId, decision, tenantIds } = parsed;

  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const authDetails = await fetchAuthorizationDetails(
    session.access_token,
    authorizationId.trim(),
  );

  if (!authDetails.ok) {
    return NextResponse.json(
      {
        error: getOAuthConsentLoadErrorMessage(authDetails.error),
        ...(process.env.NODE_ENV === "development" && {
          details: authDetails.error,
        }),
      },
      { status: 400 },
    );
  }

  if (authDetails.kind === "redirect") {
    return NextResponse.redirect(authDetails.redirectUrl);
  }

  const oauthClientId = authDetails.data.client?.id?.trim();
  if (!oauthClientId) {
    return NextResponse.json(
      { error: "Missing OAuth client on authorization" },
      { status: 400 },
    );
  }

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
    authorizationId.trim(),
    decision,
  );

  if (!result.ok) {
    /*
     * Duplicate "Allow" (or a race): first POST already completed consent and returned a code
     * to mcp-remote/Cursor; the second POST gets validation_failed. Send the browser to the
     * client's redirect_uri with ?error= so the stdio bridge sees a normal OAuth callback.
     */
    const clientRedirect = authDetails.data.redirect_uri?.trim();
    if (clientRedirect && isOAuthAuthorizationNoLongerPendingError(result.error)) {
      const fallback = buildOAuthRedirectClientErrorUrl(
        clientRedirect,
        "server_error",
        "authorization_step_already_completed",
      );
      return NextResponse.redirect(fallback);
    }

    return NextResponse.json(
      {
        error: getOAuthConsentLoadErrorMessage(result.error),
        ...(process.env.NODE_ENV === "development" && { details: result.error }),
      },
      { status: 400 },
    );
  }

  return NextResponse.redirect(result.redirect_url);
}
