import { describe, expect, it } from 'vitest';
import {
  GLOBAL_SDK_CATALOG_OPERATIONS,
  SDK_OPS_REQUIRING_EMBEDDING_EDGE,
  getWritePermissionGate,
  isSdkOperationVisibleInCatalog,
} from './catalog-filter.js';
import { SDK_OPERATION_REGISTRY } from './registry.js';

describe('GLOBAL_SDK_CATALOG_OPERATIONS', () => {
  it('includes tenant bootstrap operations', () => {
    expect(GLOBAL_SDK_CATALOG_OPERATIONS.has('tenants.list')).toBe(true);
    expect(GLOBAL_SDK_CATALOG_OPERATIONS.has('tenant_context.set')).toBe(true);
  });
});

describe('getWritePermissionGate', () => {
  it('gates plugin installs to tenant.admin', () => {
    expect(getWritePermissionGate('plugins.install')).toEqual(['tenant.admin']);
  });

  it('treats semantic_search embedding upserts as member-level (RLS)', () => {
    expect(getWritePermissionGate('semantic_search.upsert_work_order_embedding')).toBeNull();
  });

  it('gates entity alias registration to tenant.admin', () => {
    expect(getWritePermissionGate('semantic_search.register_entity_alias')).toEqual(['tenant.admin']);
  });
});

describe('isSdkOperationVisibleInCatalog', () => {
  const woList = SDK_OPERATION_REGISTRY['work_orders.list']!;
  const woCreate = SDK_OPERATION_REGISTRY['work_orders.create']!;
  const pluginsInstall = SDK_OPERATION_REGISTRY['plugins.install']!;

  it('lists SDK ops that require embedding edge for gating tests', () => {
    expect(SDK_OPS_REQUIRING_EMBEDDING_EDGE.has('semantic_search.similar_past_work_orders')).toBe(true);
  });

  it('shows global ops without tenant', () => {
    const ctx = { tenantId: undefined, permissionSet: new Set<string>(), embeddingEdgeConfigured: true };
    expect(isSdkOperationVisibleInCatalog('tenants.list', SDK_OPERATION_REGISTRY['tenants.list']!, ctx)).toBe(
      true
    );
    expect(isSdkOperationVisibleInCatalog('work_orders.list', woList, ctx)).toBe(false);
  });

  it('shows reads when tenant is present', () => {
    const ctx = {
      tenantId: '550e8400-e29b-41d4-a716-446655440000',
      permissionSet: new Set<string>(),
      embeddingEdgeConfigured: true,
    };
    expect(isSdkOperationVisibleInCatalog('work_orders.list', woList, ctx)).toBe(true);
  });

  it('hides gated writes without permission', () => {
    const ctx = {
      tenantId: '550e8400-e29b-41d4-a716-446655440000',
      permissionSet: new Set(['workorder.view']),
      embeddingEdgeConfigured: true,
    };
    expect(isSdkOperationVisibleInCatalog('work_orders.create', woCreate, ctx)).toBe(false);
    expect(isSdkOperationVisibleInCatalog('plugins.install', pluginsInstall, ctx)).toBe(false);
  });

  it('shows gated writes when user has a matching permission', () => {
    const ctx = {
      tenantId: '550e8400-e29b-41d4-a716-446655440000',
      permissionSet: new Set(['workorder.create']),
      embeddingEdgeConfigured: true,
    };
    expect(isSdkOperationVisibleInCatalog('work_orders.create', woCreate, ctx)).toBe(true);
  });

  it('tenant.admin sees everything', () => {
    const ctx = {
      tenantId: '550e8400-e29b-41d4-a716-446655440000',
      permissionSet: new Set(['tenant.admin']),
      embeddingEdgeConfigured: true,
    };
    expect(isSdkOperationVisibleInCatalog('plugins.install', pluginsInstall, ctx)).toBe(true);
    expect(isSdkOperationVisibleInCatalog('work_orders.create', woCreate, ctx)).toBe(true);
  });

  it('hides vector similarity semantic_search ops when embedding edge is not configured', () => {
    const similarWo = SDK_OPERATION_REGISTRY['semantic_search.similar_past_work_orders']!;
    const ctx = {
      tenantId: '550e8400-e29b-41d4-a716-446655440000',
      permissionSet: new Set(['workorder.view']),
      embeddingEdgeConfigured: false,
    };
    expect(isSdkOperationVisibleInCatalog('semantic_search.similar_past_work_orders', similarWo, ctx)).toBe(
      false
    );
    const searchEntities = SDK_OPERATION_REGISTRY['semantic_search.search_entity_candidates']!;
    expect(
      isSdkOperationVisibleInCatalog('semantic_search.search_entity_candidates', searchEntities, ctx)
    ).toBe(true);
  });

  it('tenant.admin still sees similarity ops when embedding edge is not configured', () => {
    const similarWo = SDK_OPERATION_REGISTRY['semantic_search.similar_past_work_orders']!;
    const ctx = {
      tenantId: '550e8400-e29b-41d4-a716-446655440000',
      permissionSet: new Set(['tenant.admin']),
      embeddingEdgeConfigured: false,
    };
    expect(isSdkOperationVisibleInCatalog('semantic_search.similar_past_work_orders', similarWo, ctx)).toBe(
      true
    );
  });
});
