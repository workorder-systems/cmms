// SPDX-License-Identifier: AGPL-3.0-or-later
/** Shared canonical source text + content hashing for all embedding domains (Edge index + search metadata). */

export type WorkOrderSourceRow = {
  title: string;
  description: string | null;
  cause: string | null;
  resolution: string | null;
  asset_name: string | null;
  location_name: string | null;
};

export type AssetSourceRow = {
  name: string;
  description: string | null;
  asset_number: string | null;
  location_name?: string | null;
};

export type PartSourceRow = {
  part_number: string;
  name: string | null;
  description: string | null;
};

export async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Stable profile string stored on rows; override with EMBEDDING_PROFILE env. */
export function resolveEmbeddingProfileEnv(modelId: string, dimensions: number): string {
  const explicit = Deno.env.get('EMBEDDING_PROFILE')?.trim();
  if (explicit) {
    return explicit;
  }
  return `${modelId.replace(/[^a-z0-9]+/gi, '_')}_${dimensions}`;
}

export function canonicalWorkOrderText(row: WorkOrderSourceRow): string {
  const parts = [
    row.title,
    row.description ?? '',
    row.cause ?? '',
    row.resolution ?? '',
    row.asset_name ?? '',
    row.location_name ?? '',
  ];
  return parts.filter(Boolean).join('\n');
}

export function canonicalAssetText(row: AssetSourceRow): string {
  const parts = [row.name, row.description ?? '', row.asset_number ?? '', row.location_name ?? ''];
  return parts.filter(Boolean).join('\n');
}

export function canonicalPartText(row: PartSourceRow): string {
  const parts = [row.part_number, row.name ?? '', row.description ?? ''];
  return parts.filter(Boolean).join('\n');
}

export const MAX_SOURCE_TEXT_CHARS = 8000;
