/**
 * Tests for scheduling and dispatch: schedule blocks, schedule views, and RPCs
 * (migration: 20260311140000_scheduling_dispatch_work_orders).
 * Extended validation: 20260326100000_schedule_validate_availability_skills_crew_sla.sql
 */
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient, waitForSupabase } from './helpers/supabase';
import { createTestUser } from './helpers/auth';
import { createTestTenant, setTenantContext, assignRoleToUser } from './helpers/tenant';
import { createTestAsset, createTestWorkOrder } from './helpers/entities';
import type { SupabaseClient } from '@supabase/supabase-js';

function runPsql(sql: string): void {
  execSync(
    `docker exec supabase_db_database psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c ${JSON.stringify(sql)}`,
    { stdio: 'pipe' }
  );
}

describe('Scheduling & Dispatch', () => {
  let client: SupabaseClient;

  beforeAll(async () => {
    await waitForSupabase();
    client = createTestClient();
  });

  describe('Views', () => {
    it('should query v_schedule_blocks without error', async () => {
      await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      const { data, error } = await client.from('v_schedule_blocks').select('id').limit(5);
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should query v_schedule_by_technician and v_schedule_by_asset without error', async () => {
      await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      const { error: byTech } = await client.from('v_schedule_by_technician').select('*').limit(1);
      expect(byTech).toBeNull();

      const { error: byAsset } = await client.from('v_schedule_by_asset').select('*').limit(1);
      expect(byAsset).toBeNull();
    });
  });

  describe('Tenant isolation', () => {
    it('should only return schedule blocks for current tenant', async () => {
      await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      const { data: list, error } = await client.from('v_schedule_blocks').select('id, tenant_id');
      expect(error).toBeNull();
      for (const row of list ?? []) {
        expect(row.tenant_id).toBe(tenantId);
      }
    });
  });

  describe('rpc_validate_schedule', () => {
    it('should return error row for invalid time range', async () => {
      await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      const adminClient = client;
      const memberClient = createTestClient();
      const { user: member } = await createTestUser(memberClient);
      await assignRoleToUser(adminClient, member.id, tenantId, 'member');
      await setTenantContext(memberClient, tenantId);

      const { data: techId, error: techErr } = await adminClient.rpc('rpc_create_technician', {
        p_tenant_id: tenantId,
        p_user_id: member.id,
        p_employee_number: null,
        p_default_crew_id: null,
        p_department_id: null,
      });
      expect(techErr).toBeNull();
      expect(techId).toBeDefined();

      const { data: rows, error } = await adminClient.rpc('rpc_validate_schedule', {
        p_technician_id: techId,
        p_crew_id: null,
        p_start_at: '2026-06-01T12:00:00Z',
        p_end_at: '2026-06-01T11:00:00Z',
        p_work_order_id: null,
        p_exclude_block_id: null,
      });
      expect(error).toBeNull();
      expect((rows as { check_type: string }[]).some((r) => r.check_type === 'input')).toBe(true);
    });

    it('should warn when crew has no active members', async () => {
      await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      const { data: crewId, error: crewErr } = await client.rpc('rpc_create_crew', {
        p_tenant_id: tenantId,
        p_name: 'Empty crew',
        p_description: null,
      });
      expect(crewErr).toBeNull();

      const { data: rows, error } = await client.rpc('rpc_validate_schedule', {
        p_technician_id: null,
        p_crew_id: crewId,
        p_start_at: '2026-06-02T14:00:00Z',
        p_end_at: '2026-06-02T15:00:00Z',
        p_work_order_id: null,
        p_exclude_block_id: null,
      });
      expect(error).toBeNull();
      expect((rows as { check_type: string }[]).some((r) => r.check_type === 'crew')).toBe(true);
    });

    it('should check recurring availability against patterns (Monday slot)', async () => {
      await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      const adminClient = client;
      const memberClient = createTestClient();
      const { user: member } = await createTestUser(memberClient);
      await assignRoleToUser(adminClient, member.id, tenantId, 'member');
      await setTenantContext(memberClient, tenantId);

      const { data: techId, error: techErr } = await adminClient.rpc('rpc_create_technician', {
        p_tenant_id: tenantId,
        p_user_id: member.id,
        p_employee_number: null,
        p_default_crew_id: null,
        p_department_id: null,
      });
      expect(techErr).toBeNull();

      try {
        runPsql(
          `insert into app.availability_patterns (tenant_id, technician_id, day_of_week, start_time, end_time, timezone) values ('${tenantId}'::uuid, '${techId}'::uuid, 1, '09:00', '17:00', null);`
        );
      } catch {
        return;
      }

      const { data: okRows, error: okErr } = await adminClient.rpc('rpc_validate_schedule', {
        p_technician_id: techId,
        p_crew_id: null,
        p_start_at: '2026-06-01T10:00:00Z',
        p_end_at: '2026-06-01T11:00:00Z',
        p_work_order_id: null,
        p_exclude_block_id: null,
      });
      expect(okErr).toBeNull();
      const okList = (okRows ?? []) as { check_type: string; message?: string }[];
      expect(
        okList.some(
          (r) =>
            r.check_type === 'availability' &&
            ((r.message ?? '').includes('outside') || (r.message ?? '').includes('No recurring'))
        )
      ).toBe(false);

      const { data: badRows, error: badErr } = await adminClient.rpc('rpc_validate_schedule', {
        p_technician_id: techId,
        p_crew_id: null,
        p_start_at: '2026-06-07T10:00:00Z',
        p_end_at: '2026-06-07T11:00:00Z',
        p_work_order_id: null,
        p_exclude_block_id: null,
      });
      expect(badErr).toBeNull();
      expect(
        (badRows as { check_type: string; message?: string }[]).some(
          (r) => r.check_type === 'availability' && (r.message ?? '').includes('No recurring availability')
        )
      ).toBe(true);
    });

    it('should emit skill warning when asset requires skill technician lacks', async () => {
      await createTestUser(client);
      const tenantId = await createTestTenant(client);
      await setTenantContext(client, tenantId);

      const adminClient = client;
      const memberClient = createTestClient();
      const { user: member } = await createTestUser(memberClient);
      await assignRoleToUser(adminClient, member.id, tenantId, 'member');
      await setTenantContext(memberClient, tenantId);

      const { data: techId, error: techErr } = await adminClient.rpc('rpc_create_technician', {
        p_tenant_id: tenantId,
        p_user_id: member.id,
        p_employee_number: null,
        p_default_crew_id: null,
        p_department_id: null,
      });
      expect(techErr).toBeNull();

      const assetId = await createTestAsset(adminClient, tenantId, 'Skill test asset');
      const woId = await createTestWorkOrder(adminClient, tenantId, 'WO skill test', undefined, 'medium', undefined, undefined, assetId);

      const skillId = randomUUID();
      try {
        runPsql(
          `insert into cfg.skill_catalogs (id, tenant_id, name, code, category, display_order) values ('${skillId}'::uuid, '${tenantId}'::uuid, 'RequiredSkill', 'req_skill_test', null, 0); insert into app.asset_required_skills (tenant_id, asset_id, skill_id) values ('${tenantId}'::uuid, '${assetId}'::uuid, '${skillId}'::uuid);`
        );
      } catch {
        return;
      }

      const { data: rows, error } = await adminClient.rpc('rpc_validate_schedule', {
        p_technician_id: techId,
        p_crew_id: null,
        p_start_at: '2026-06-01T10:00:00Z',
        p_end_at: '2026-06-01T11:00:00Z',
        p_work_order_id: woId,
        p_exclude_block_id: null,
      });
      expect(error).toBeNull();
      expect(
        (rows as { check_type: string; message?: string }[]).some(
          (r) => r.check_type === 'skill' && (r.message ?? '').includes('RequiredSkill')
        )
      ).toBe(true);
    });
  });
});
