import { describe, expect, it, vi } from 'vitest';
import { sdkInvokeInputSchema } from '../schemas.js';
import { SDK_OPERATION_IDS, SDK_OPERATION_REGISTRY } from './registry.js';

describe('SDK_OPERATION_REGISTRY', () => {
  it('lists every operation id and matches registry keys', () => {
    const keys = Object.keys(SDK_OPERATION_REGISTRY).sort();
    expect(SDK_OPERATION_IDS).toEqual(keys);
    expect(keys.length).toBeGreaterThan(200);
  });

  it('defines schema and invoke for each operation', () => {
    for (const id of SDK_OPERATION_IDS) {
      const def = SDK_OPERATION_REGISTRY[id];
      expect(def, id).toBeDefined();
      expect(def!.description.length).toBeGreaterThan(0);
      expect(def!.inputSchema).toBeDefined();
      expect(typeof def!.invoke).toBe('function');
    }
  });

  it('returns undefined for unknown operation_id (sdk_invoke should error)', () => {
    expect(SDK_OPERATION_REGISTRY['not_a_real.operation']).toBeUndefined();
  });
});

describe('sdkInvokeInputSchema', () => {
  it('parses operation_id and default args', () => {
    expect(sdkInvokeInputSchema.parse({ operation_id: 'work_orders.list' })).toEqual({
      operation_id: 'work_orders.list',
      args: {},
    });
  });

  it('rejects empty operation_id', () => {
    expect(() => sdkInvokeInputSchema.parse({ operation_id: '' })).toThrow();
  });
});

describe('sdk invoke dispatch', () => {
  it('tenant_context.clear calls clearTenant', async () => {
    const clearTenant = vi.fn().mockResolvedValue(undefined);
    const client = { clearTenant } as unknown as import('@workorder-systems/sdk').DbClient;
    const def = SDK_OPERATION_REGISTRY['tenant_context.clear']!;
    await def.invoke(client, {});
    expect(clearTenant).toHaveBeenCalledTimes(1);
  });

  it('validates args for tenant_context.set', async () => {
    const setTenant = vi.fn().mockResolvedValue(undefined);
    const client = { setTenant } as unknown as import('@workorder-systems/sdk').DbClient;
    const def = SDK_OPERATION_REGISTRY['tenant_context.set']!;
    const id = '550e8400-e29b-41d4-a716-446655440000';
    await def.invoke(client, { tenant_id: id });
    expect(setTenant).toHaveBeenCalledWith(id);
    await expect(def.invoke(client, { tenant_id: 'not-a-uuid' })).rejects.toThrow();
  });

  it('dispatches semantic_search.search_entity_candidates', async () => {
    const searchEntityCandidates = vi.fn().mockResolvedValue([]);
    const client = {
      semanticSearch: { searchEntityCandidates },
    } as unknown as import('@workorder-systems/sdk').DbClient;
    const def = SDK_OPERATION_REGISTRY['semantic_search.search_entity_candidates']!;
    await def.invoke(client, { p_query: 'pump', p_limit: 3 });
    expect(searchEntityCandidates).toHaveBeenCalledWith({
      query: 'pump',
      entityTypes: null,
      limit: 3,
    });
  });

  it('dispatches semantic_search.next_assets_for_embedding', async () => {
    const nextAssetsForEmbedding = vi.fn().mockResolvedValue([]);
    const client = {
      semanticSearch: { nextAssetsForEmbedding },
    } as unknown as import('@workorder-systems/sdk').DbClient;
    const def = SDK_OPERATION_REGISTRY['semantic_search.next_assets_for_embedding']!;
    await def.invoke(client, { p_limit: 10 });
    expect(nextAssetsForEmbedding).toHaveBeenCalledWith(10);
  });
});
