// SPDX-License-Identifier: AGPL-3.0-or-later
import type { EmbeddingProvider } from './types.ts';

type OpenAiEmbeddingResponse = {
  data: { embedding: number[]; index: number }[];
  model: string;
};

/** OpenAI `/v1/embeddings` (text-embedding-3-small default, 1536 dims). */
export class OpenAiEmbeddingProvider implements EmbeddingProvider {
  readonly modelId: string;
  readonly dimensions: number;
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(options: {
    apiKey: string;
    model?: string;
    dimensions?: number;
    baseUrl?: string;
  }) {
    this.apiKey = options.apiKey;
    this.modelId = options.model ?? 'text-embedding-3-small';
    this.dimensions = options.dimensions ?? 1536;
    this.baseUrl = (options.baseUrl ?? 'https://api.openai.com/v1').replace(/\/$/, '');
  }

  async embedQuery(text: string): Promise<number[]> {
    const [v] = await this.embedDocuments([text]);
    return v;
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    const body: Record<string, unknown> = {
      model: this.modelId,
      input: texts,
    };
    if (this.modelId.startsWith('text-embedding-3')) {
      body.dimensions = this.dimensions;
    }

    const res = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI embeddings ${res.status}: ${errText.slice(0, 500)}`);
    }

    const json = (await res.json()) as OpenAiEmbeddingResponse;
    const sorted = [...json.data].sort((a, b) => a.index - b.index);
    return sorted.map((d) => {
      if (d.embedding.length !== this.dimensions) {
        throw new Error(
          `Embedding dimension mismatch: got ${d.embedding.length}, expected ${this.dimensions}`
        );
      }
      return d.embedding;
    });
  }
}
