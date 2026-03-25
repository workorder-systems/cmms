// SPDX-License-Identifier: AGPL-3.0-or-later
/** Format embedding for PostgREST `vector(1536)` RPC parameters. */
export function toPgVectorLiteral(embedding: readonly number[]): string {
  return `[${embedding.join(',')}]`;
}
