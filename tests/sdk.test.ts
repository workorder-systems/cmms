/**
 * SDK tests: validate that the SDK wraps the public API correctly.
 * DB contract is tested in other suites.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { createDbClient, SdkError } from '@db/sdk';
import { waitForSupabase } from './helpers/supabase';
import { createTestSdkClient, withAuthenticatedTenant } from './helpers/sdk';
import { shortSlug } from './helpers/faker';
import { createTestUser } from './helpers/auth';
import { setTenantContext } from './helpers/tenant';
import { makeTenant } from './helpers/faker';

describe('SDK', () => {
  let sdk: ReturnType<typeof createDbClient>;

  beforeAll(async () => {
    await waitForSupabase();
    sdk = createTestSdkClient();
  });

  describe('createDbClient', () => {
    it('exposes supabase client and resources', () => {
      expect(sdk.supabase).toBeDefined();
      expect(sdk.tenants).toBeDefined();
      expect(sdk.workOrders).toBeDefined();
      expect(typeof sdk.setTenant).toBe('function');
      expect(typeof sdk.clearTenant).toBe('function');
    });
  });

  // Tenant context: setTenant/clearTenant call RPCs and require auth.
  describe('tenant context', () => {
    it('setTenant and clearTenant call RPCs without throwing when authenticated', async () => {
      const { tenantId } = await withAuthenticatedTenant(sdk);

      await expect(sdk.setTenant(tenantId)).resolves.toBeUndefined();
      await expect(sdk.clearTenant()).resolves.toBeUndefined();
    });

    it('setTenant throws SdkError when not authenticated', async () => {
      const anonSdk = createTestSdkClient();
      try {
        await anonSdk.setTenant('00000000-0000-0000-0000-000000000000');
        expect.fail('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(SdkError);
        const err = e as SdkError;
        expect(err.code).toBeDefined();
        expect(err.message).toBeDefined();
        expect(err.message.length).toBeGreaterThan(0);
      }
    });

    it('clearTenant throws SdkError when not authenticated', async () => {
      const anonSdk = createTestSdkClient();
      try {
        await anonSdk.clearTenant();
        expect.fail('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(SdkError);
        const err = e as SdkError;
        expect(err.code).toBeDefined();
        expect(err.message).toBeDefined();
      }
    });
  });

  describe('tenants resource', () => {
    it('create returns tenant UUID', async () => {
      await createTestUser(sdk.supabase);
      const { name } = makeTenant();
      const tenantId = await sdk.tenants.create({ name, slug: shortSlug() });
      expect(tenantId).toBeDefined();
      expect(typeof tenantId).toBe('string');
    });

    it('list returns tenants for current user after setTenant and refresh', async () => {
      const { tenantId, name } = await withAuthenticatedTenant(sdk);

      const list = await sdk.tenants.list();
      expect(Array.isArray(list)).toBe(true);
      const found = list.find((t: { id: string }) => t.id === tenantId);
      expect(found).toBeDefined();
      expect((found as { name: string }).name).toBe(name);
    });

    it('getById returns tenant or null', async () => {
      const { tenantId, name } = await withAuthenticatedTenant(sdk);

      const tenant = await sdk.tenants.getById(tenantId);
      expect(tenant).not.toBeNull();
      expect((tenant as { id: string }).id).toBe(tenantId);
      expect((tenant as { name: string }).name).toBe(name);

      const missing = await sdk.tenants.getById('00000000-0000-0000-0000-000000000000');
      expect(missing).toBeNull();
    });
  });

  describe('workOrders resource', () => {
    it('list returns array (tenant-scoped)', async () => {
      await withAuthenticatedTenant(sdk);

      const list = await sdk.workOrders.list();
      expect(Array.isArray(list)).toBe(true);
    });

    it('create returns work order UUID', async () => {
      const { tenantId } = await withAuthenticatedTenant(sdk);

      const id = await sdk.workOrders.create({
        tenantId,
        title: 'SDK Test WO',
        priority: 'medium',
      });
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
    });

    it('getById returns work order or null', async () => {
      const { tenantId } = await withAuthenticatedTenant(sdk);

      const woId = await sdk.workOrders.create({
        tenantId,
        title: 'SDK Get WO',
        priority: 'low',
      });
      const wo = await sdk.workOrders.getById(woId);
      expect(wo).not.toBeNull();
      expect((wo as { id: string }).id).toBe(woId);
      expect((wo as { title: string }).title).toBe('SDK Get WO');
    });
  });

  // Postgres/API errors are normalized to SdkError with code, message, details, hint preserved.
  describe('error handling and edge cases', () => {
    const fakeUuid = '00000000-0000-0000-0000-000000000000';

    it('transitionStatus with non-existent work order throws SdkError P0001 (not found)', async () => {
      const { tenantId } = await withAuthenticatedTenant(sdk);
      try {
        await sdk.workOrders.transitionStatus({
          tenantId,
          workOrderId: fakeUuid,
          toStatusKey: 'assigned',
        });
        expect.fail('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(SdkError);
        const err = e as SdkError;
        expect(err.code).toBe('P0001');
        expect(err.message).toMatch(/not found/i);
      }
    });

    it('transitionStatus invalid transition (draft→completed) throws SdkError 23503', async () => {
      const { tenantId } = await withAuthenticatedTenant(sdk);
      const woId = await sdk.workOrders.create({
        tenantId,
        title: 'SDK WO for transition',
        priority: 'low',
      });
      try {
        await sdk.workOrders.transitionStatus({
          tenantId,
          workOrderId: woId,
          toStatusKey: 'completed',
        });
        expect.fail('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(SdkError);
        const err = e as SdkError;
        expect(err.code).toBe('23503');
        expect(err.message).toMatch(/Invalid status transition|constraint/i);
      }
    });

    it('logTime with minutes 0 throws SdkError (check constraint)', async () => {
      const { tenantId } = await withAuthenticatedTenant(sdk);
      const woId = await sdk.workOrders.create({
        tenantId,
        title: 'SDK WO for time',
        priority: 'low',
      });
      try {
        await sdk.workOrders.logTime({
          tenantId,
          workOrderId: woId,
          minutes: 0,
        });
        expect.fail('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(SdkError);
        const err = e as SdkError;
        expect(err.message).toMatch(/work_order_time_entries_minutes_check|minutes|constraint/i);
      }
    });

    it('tenants.create duplicate slug throws SdkError 23505 (unique violation)', async () => {
      await createTestUser(sdk.supabase);
      const slug = shortSlug();
      await sdk.tenants.create({ name: 'First Tenant', slug });
      try {
        await sdk.tenants.create({ name: 'Second Tenant', slug });
        expect.fail('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(SdkError);
        const err = e as SdkError;
        expect(err.code).toBe('23505');
        expect(err.message).toMatch(/tenants_slug_unique|unique|duplicate/i);
      }
    });

    it('tenants.create invalid slug format throws SdkError (check constraint)', async () => {
      await createTestUser(sdk.supabase);
      try {
        await sdk.tenants.create({ name: 'Bad Slug', slug: 'INVALID SLUG!' });
        expect.fail('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(SdkError);
        const err = e as SdkError;
        expect(err.message).toMatch(/tenants_slug_format_check|slug|constraint/i);
      }
    });

    it('workOrders.create with non-existent tenantId throws SdkError', async () => {
      await createTestUser(sdk.supabase);
      try {
        await sdk.workOrders.create({
          tenantId: fakeUuid,
          title: 'Orphan WO',
          priority: 'medium',
        });
        expect.fail('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(SdkError);
        const err = e as SdkError;
        expect(err.message).toMatch(/not a member|foreign key|violates foreign key constraint/i);
      }
    });

    it('SdkError preserves code and message for debugging', async () => {
      const anonSdk = createTestSdkClient();
      try {
        await anonSdk.setTenant(fakeUuid);
        expect.fail('should have thrown');
      } catch (e) {
        const err = e as SdkError;
        expect(err.name).toBe('SdkError');
        expect(err.code).toBeDefined();
        expect(err.message).toBeDefined();
        expect(typeof err.code).toBe('string');
        expect(typeof err.message).toBe('string');
      }
    });
  });
});
