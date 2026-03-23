import { DEMO_OAUTH_REGISTERED_NAME } from "@/lib/demo-oauth-server";

export type ClientRegistrationPayload = {
  client_id?: string;
  client_secret?: string;
  msg?: string;
  message?: string;
  error_description?: string;
};

export function parseClientRegistrationJson(
  text: string,
):
  | { data: ClientRegistrationPayload; parseError: true }
  | { data: ClientRegistrationPayload; parseError: false } {
  try {
    return {
      data: JSON.parse(text) as ClientRegistrationPayload,
      parseError: false,
    };
  } catch {
    return { data: {}, parseError: true };
  }
}

/** OAuth 2.0 dynamic client registration (`registration_endpoint` in AS metadata). */
export async function registerDemoOAuthClientDynamic(params: {
  supabaseUrl: string;
  anonKey: string;
  redirectUris: string[];
}): Promise<Response> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (params.anonKey) {
    headers.apikey = params.anonKey;
  }
  return fetch(`${params.supabaseUrl}/auth/v1/oauth/clients/register`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      client_name: DEMO_OAUTH_REGISTERED_NAME,
      redirect_uris: params.redirectUris,
      client_type: "confidential",
      token_endpoint_auth_method: "client_secret_post",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
    }),
  });
}
