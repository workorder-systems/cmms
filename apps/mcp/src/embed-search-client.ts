export type EmbedSearchTransportContext = {
  embedSearchUrl: string;
  anonKey: string;
  getAccessToken: () => Promise<string>;
};

export async function callEmbedSearch(
  ctx: EmbedSearchTransportContext,
  payload: Record<string, unknown>
): Promise<{ ok: true; data: unknown } | { ok: false; message: string }> {
  const token = await ctx.getAccessToken();
  const res = await fetch(ctx.embedSearchUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: ctx.anonKey,
    },
    body: JSON.stringify(payload),
  });
  const body = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    const msg = typeof body.message === 'string' ? body.message : `embed-search failed: ${res.status}`;
    return { ok: false, message: msg };
  }
  return { ok: true, data: body };
}
