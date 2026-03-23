import { describe, expect, it } from 'vitest';
import {
  setActiveTenantInputSchema,
  workOrdersCreateInputSchema,
  workOrdersGetInputSchema,
} from './schemas.js';

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
