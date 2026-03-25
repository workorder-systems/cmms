// SPDX-License-Identifier: AGPL-3.0-or-later
import type { EmbeddingProvider } from './types.ts';

/** Deterministic tiny vectors for local/CI (no external API). */
export class StubEmbeddingProvider implements EmbeddingProvider {
  readonly modelId: string;
  readonly dimensions: number;

  constructor(dimensions: number, modelId = 'stub:deterministic') {
    this.dimensions = dimensions;
    this.modelId = modelId;
  }

  async embedQuery(text: string): Promise<number[]> {
    return this.oneVector(text, 0);
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    return texts.map((t, i) => this.oneVector(t, i));
  }

  private oneVector(text: string, salt: number): number[] {
    const out = new Array<number>(this.dimensions);
    let h = salt * 31;
    for (let i = 0; i < text.length; i++) {
      h = (h * 33 + text.charCodeAt(i)) >>> 0;
    }
    for (let i = 0; i < this.dimensions; i++) {
      h = (h * 1103515245 + 12345) >>> 0;
      out[i] = (h % 1000) / 1000 - 0.5;
    }
    const norm = Math.sqrt(out.reduce((s, x) => s + x * x, 0)) || 1;
    return out.map((x) => x / norm);
  }
}
