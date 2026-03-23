import type { OAuthClientProvider } from '@modelcontextprotocol/sdk/client/auth.js';
import type {
  OAuthClientInformationMixed,
  OAuthClientMetadata,
  OAuthTokens,
} from '@modelcontextprotocol/sdk/shared/auth.js';

/**
 * Minimal in-memory OAuth client provider (SDK examples pattern).
 * Supabase `/auth/v1/*` requests also need `apikey` — use {@link createAnonFetch}.
 */
export class InMemoryOAuthClientProvider implements OAuthClientProvider {
  private _clientInformation: OAuthClientInformationMixed | undefined;
  private _tokens: OAuthTokens | undefined;
  private _codeVerifier: string | undefined;

  constructor(
    private readonly _redirectUrl: string,
    private readonly _clientMetadata: OAuthClientMetadata,
    private readonly _onRedirect: (url: URL) => void
  ) {}

  get redirectUrl(): string {
    return this._redirectUrl;
  }

  get clientMetadata(): OAuthClientMetadata {
    return this._clientMetadata;
  }

  clientInformation(): OAuthClientInformationMixed | undefined {
    return this._clientInformation;
  }

  saveClientInformation(clientInformation: OAuthClientInformationMixed): void {
    this._clientInformation = clientInformation;
  }

  tokens(): OAuthTokens | undefined {
    return this._tokens;
  }

  saveTokens(tokens: OAuthTokens): void {
    this._tokens = tokens;
  }

  redirectToAuthorization(authorizationUrl: URL): void {
    this._onRedirect(authorizationUrl);
  }

  saveCodeVerifier(codeVerifier: string): void {
    this._codeVerifier = codeVerifier;
  }

  codeVerifier(): string {
    if (!this._codeVerifier) {
      throw new Error('No code verifier saved');
    }
    return this._codeVerifier;
  }
}

/** Adds Supabase `apikey` header for `/auth/v1/*` requests (register + token). */
export function createAnonFetch(anonKey: string): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : (input as Request).url;
    if (!url.includes('/auth/v1/')) {
      return fetch(input, init);
    }
    const headers = new Headers();
    if (init?.headers) {
      new Headers(init.headers).forEach((v, k) => {
        headers.set(k, v);
      });
    } else if (typeof input === 'object' && !(input instanceof URL) && typeof input !== 'string') {
      (input as Request).headers.forEach((v, k) => {
        headers.set(k, v);
      });
    }
    headers.set('apikey', anonKey);
    const mergedInit: RequestInit = { ...init, headers };
    if (input instanceof Request) {
      return fetch(new Request(input, mergedInit));
    }
    return fetch(input as string | URL, mergedInit);
  };
}
