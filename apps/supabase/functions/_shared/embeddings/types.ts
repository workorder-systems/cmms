// SPDX-License-Identifier: AGPL-3.0-or-later
/** Modular embedding providers for Edge Functions (swap via env). */

export type EmbedResult = {
  vectors: number[][];
  modelId: string;
  dimensions: number;
};

export interface EmbeddingProvider {
  readonly modelId: string;
  readonly dimensions: number;
  embedQuery(text: string): Promise<number[]>;
  embedDocuments(texts: string[]): Promise<number[][]>;
}
