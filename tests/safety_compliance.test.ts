/**
 * Tests for safety & compliance: inspections, incidents, and related public views/RPCs
 * (migration: 20260316120000_safety_compliance_inspections_incidents).
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient, waitForSupabase } from './helpers/supabase';
import { createTestUser } from './helpers/auth';
import { createTestTenant, setTenantContext } from './helpers/tenant';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Safety & Compliance', () => {
  let client: SupabaseClient;

  beforeAll(async () => {
    await waitForSupabase();
    client = createTestClient();
  });

  describe('Inspection templates', () => {
    it('should create inspection template via rpc_create_inspection_template', async () => {
      await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      const { data: templateId, error } = await client.rpc('rpc_create_inspection_template', {
        p_tenant_id: tenantId,
        p_name: 'Safety Walkthrough',
        p_description: 'Monthly safety walkthrough checklist',
        p_category: 'safety',
        p_trigger_config: null,
        p_checklist_items: [
          { description: 'Check fire exits', required: true },
          { description: 'Verify first aid kits', required: false },
        ],
      });

      expect(error).toBeNull();
      expect(templateId).toBeDefined();
      expect(typeof templateId).toBe('string');

      const { data: rows, error: viewError } = await client
        .from('v_inspection_templates')
        .select('id, name, description, category')
        .eq('id', templateId)
        .single();

      expect(viewError).toBeNull();
      expect(rows?.name).toBe('Safety Walkthrough');
      expect(rows?.category).toBe('safety');
    });

    it('should list inspection templates scoped to current tenant', async () => {
      await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      await client.rpc('rpc_create_inspection_template', {
        p_tenant_id: tenantId,
        p_name: 'Template A',
        p_description: null,
        p_category: null,
        p_trigger_config: null,
        p_checklist_items: null,
      });

      const { data: list, error } = await client
        .from('v_inspection_templates')
        .select('id, name')
        .eq('tenant_id', tenantId);

      expect(error).toBeNull();
      expect(Array.isArray(list)).toBe(true);
      expect(list!.some((r) => r.name === 'Template A')).toBe(true);
    });
  });

  describe('Incidents', () => {
    it('should create incident via rpc_create_incident', async () => {
      await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      const { data: incidentId, error } = await client.rpc('rpc_create_incident', {
        p_tenant_id: tenantId,
        p_title: 'Slip in hallway',
        p_type: 'incident',
        p_severity: 'medium',
        p_description: 'Wet floor',
        p_occurred_at: null,
        p_location_id: null,
        p_asset_id: null,
        p_work_order_id: null,
        p_metadata: null,
      });

      expect(error).toBeNull();
      expect(incidentId).toBeDefined();
      expect(typeof incidentId).toBe('string');

      const { data: row, error: viewError } = await client
        .from('v_incidents')
        .select('id, title, type, severity')
        .eq('id', incidentId)
        .single();

      expect(viewError).toBeNull();
      expect(row?.title).toBe('Slip in hallway');
      expect(row?.type).toBe('incident');
      expect(row?.severity).toBe('medium');
    });

    it('should reject invalid incident type', async () => {
      await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      const { error } = await client.rpc('rpc_create_incident', {
        p_tenant_id: tenantId,
        p_title: 'Test',
        p_type: 'invalid_type',
        p_severity: 'low',
        p_description: null,
        p_occurred_at: null,
        p_location_id: null,
        p_asset_id: null,
        p_work_order_id: null,
        p_metadata: null,
      });

      expect(error).toBeDefined();
      expect(String(error?.message ?? '')).toMatch(/type must be incident/);
    });
  });

  describe('Tenant isolation', () => {
    it('should not see other tenant inspection templates', async () => {
      const client1 = createTestClient();
      await createTestUser(client1);
      const tenantId1 = await createTestTenant(client1);
      await setTenantContext(client1, tenantId1);

      const { data: templateId } = await client1.rpc('rpc_create_inspection_template', {
        p_tenant_id: tenantId1,
        p_name: 'Tenant1 Template',
        p_description: null,
        p_category: null,
        p_trigger_config: null,
        p_checklist_items: null,
      });

      const client2 = createTestClient();
      await createTestUser(client2);
      const tenantId2 = await createTestTenant(client2);
      await setTenantContext(client2, tenantId2);

      const { data: rows, error } = await client2
        .from('v_inspection_templates')
        .select('id')
        .eq('id', templateId)
        .maybeSingle();

      expect(error).toBeNull();
      expect(rows).toBeNull();
    });
  });
});
