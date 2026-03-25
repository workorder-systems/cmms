import { describe, expect, it } from 'vitest';
import {
  resolveActiveTenantInputSchema,
  semanticSearchTextInputSchema,
  setActiveTenantInputSchema,
  sdkOperationSchemaInputSchema,
  workOrdersCreateInputSchema,
  workOrdersGetInputSchema,
  workOrdersListSummaryInputSchema,
} from './schemas.js';

describe('resolveActiveTenantInputSchema', () => {
  it('accepts empty args', () => {
    expect(resolveActiveTenantInputSchema.parse({})).toEqual({});
  });
});

describe('setActiveTenantInputSchema', () => {
  it('accepts a valid uuid tenant_id', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000';
    expect(setActiveTenantInputSchema.parse({ tenant_id: id })).toEqual({ tenant_id: id });
  });

  it('rejects invalid uuid', () => {
    expect(() => setActiveTenantInputSchema.parse({ tenant_id: 'not-a-uuid' })).toThrow();
  });
});

describe('workOrdersGetInputSchema', () => {
  it('requires work_order_id', () => {
    const id = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
    expect(workOrdersGetInputSchema.parse({ work_order_id: id })).toEqual({ work_order_id: id });
  });
});

describe('workOrdersListSummaryInputSchema', () => {
  it('accepts optional limit', () => {
    expect(workOrdersListSummaryInputSchema.parse({ limit: 10 })).toEqual({ limit: 10 });
  });

  it('rejects invalid limit', () => {
    expect(() => workOrdersListSummaryInputSchema.parse({ limit: 0 })).toThrow();
  });
});

describe('semanticSearchTextInputSchema', () => {
  const wo = '550e8400-e29b-41d4-a716-446655440000';

  it('accepts exclude_work_order_id for work_orders domain', () => {
    expect(
      semanticSearchTextInputSchema.parse({
        domain: 'work_orders',
        query_text: 'pump leak',
        exclude_work_order_id: wo,
      })
    ).toMatchObject({ domain: 'work_orders', exclude_work_order_id: wo });
  });

  it('rejects exclude_work_order_id for non-work_orders domains', () => {
    expect(() =>
      semanticSearchTextInputSchema.parse({
        domain: 'assets',
        query_text: 'motor',
        exclude_work_order_id: wo,
      })
    ).toThrow();
  });
});

describe('workOrdersCreateInputSchema', () => {
  it('requires tenant_id and title', () => {
    const parsed = workOrdersCreateInputSchema.parse({
      tenant_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      title: 'Fix HVAC',
    });
    expect(parsed.title).toBe('Fix HVAC');
  });

  it('allows optional fields', () => {
    const parsed = workOrdersCreateInputSchema.parse({
      tenant_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      title: 'x',
      priority: 'high',
      description: null,
    });
    expect(parsed.priority).toBe('high');
  });
});

describe('sdkOperationSchemaInputSchema', () => {
  it('requires operation_id', () => {
    expect(sdkOperationSchemaInputSchema.parse({ operation_id: 'work_orders.list' })).toEqual({
      operation_id: 'work_orders.list',
    });
  });
});
