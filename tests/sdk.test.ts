/**
 * SDK tests: validate that the SDK wraps the public API correctly.
 * DB contract is tested in other suites.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { createDbClient, SdkError } from '../packages/sdk/dist/index.js';
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
      expect(sdk.fieldOps).toBeDefined();
      expect(sdk.integrations).toBeDefined();
      expect(sdk.notifications).toBeDefined();
      expect(typeof sdk.setTenant).toBe('function');
      expect(typeof sdk.refreshTenantSession).toBe('function');
      expect(typeof sdk.setTenantAndRefresh).toBe('function');
      expect(sdk.agent).toBeDefined();
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

    it('setTenantAndRefresh returns access token when authenticated', async () => {
      const { tenantId } = await withAuthenticatedTenant(sdk);
      const accessToken = await sdk.setTenantAndRefresh(tenantId);
      expect(typeof accessToken === 'string' || accessToken === null).toBe(true);
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

    it('listSummary and getSummary return lightweight selector rows', async () => {
      const { tenantId } = await withAuthenticatedTenant(sdk);
      const woId = await sdk.workOrders.create({
        tenantId,
        title: 'SDK Summary WO',
        priority: 'medium',
      });

      const rows = await sdk.workOrders.listSummary({ limit: 10 });
      expect(Array.isArray(rows)).toBe(true);
      const row = rows.find((item) => item.id === woId);
      expect(row).toBeDefined();
      expect(row?.title).toBe('SDK Summary WO');

      const summary = await sdk.workOrders.getSummary(woId);
      expect(summary).not.toBeNull();
      expect(summary?.id).toBe(woId);
      expect(summary?.title).toBe('SDK Summary WO');
    });

    it('create supports retry-safe clientRequestId', async () => {
      const { tenantId } = await withAuthenticatedTenant(sdk);
      const clientRequestId = `sdk-client-request-${Date.now()}`;

      const firstId = await sdk.workOrders.create({
        tenantId,
        title: 'SDK idempotent WO',
        priority: 'medium',
        clientRequestId,
      });
      const secondId = await sdk.workOrders.create({
        tenantId,
        title: 'SDK idempotent WO retry',
        priority: 'medium',
        clientRequestId,
      });

      expect(secondId).toBe(firstId);
    });

    it('createRequest and listMyRequests (portal)', async () => {
      const { tenantId } = await withAuthenticatedTenant(sdk);
      const id = await sdk.workOrders.createRequest({
        tenantId,
        title: 'SDK portal request',
        priority: 'medium',
      });
      const mine = await sdk.workOrders.listMyRequests();
      expect(mine.some((r) => r.id === id)).toBe(true);
    });

    it('upsertSlaRule (maintenance-specific), getSlaStatus, and acknowledge', async () => {
      const { tenantId } = await withAuthenticatedTenant(sdk);
      await sdk.workOrders.upsertSlaRule({
        tenantId,
        priorityKey: 'medium',
        maintenanceTypeKey: 'corrective',
        responseInterval: '15 minutes',
        resolutionInterval: '2 hours',
      });
      const woId = await sdk.workOrders.create({
        tenantId,
        title: 'SDK SLA WO',
        priority: 'medium',
        maintenanceType: 'corrective',
      });
      const sla = await sdk.workOrders.getSlaStatus(woId);
      expect(sla).not.toBeNull();
      expect(sla?.sla_response_due_at).toBeTruthy();
      await sdk.workOrders.acknowledge({ tenantId, workOrderId: woId });
      const after = await sdk.workOrders.getSlaStatus(woId);
      expect(after?.acknowledged_at).toBeTruthy();
    });

    it('listSlaStatus returns an array', async () => {
      await withAuthenticatedTenant(sdk);
      const rows = await sdk.workOrders.listSlaStatus();
      expect(Array.isArray(rows)).toBe(true);
    });

    it('listSlaOpenQueue, comms, maintenance request convert', async () => {
      const { tenantId } = await withAuthenticatedTenant(sdk);
      const open = await sdk.workOrders.listSlaOpenQueue();
      expect(Array.isArray(open)).toBe(true);

      const woId = await sdk.workOrders.create({
        tenantId,
        title: 'SDK comms WO',
        priority: 'medium',
      });
      const commsId = await sdk.workOrders.addCommsEvent({
        tenantId,
        workOrderId: woId,
        body: 'SDK comms',
      });
      expect(typeof commsId).toBe('string');
      const thread = await sdk.workOrders.listComms(woId);
      expect(thread.some((r) => r.body === 'SDK comms')).toBe(true);

      const reqId = await sdk.workOrders.createMaintenanceRequest({
        tenantId,
        title: 'SDK MR',
        status: 'submitted',
      });
      const convertedWo = await sdk.workOrders.convertMaintenanceRequestToWorkOrder(tenantId, reqId);
      expect(typeof convertedWo).toBe('string');
      const reqs = await sdk.workOrders.listMaintenanceRequests();
      expect(reqs.some((r) => r.id === reqId && r.status === 'converted')).toBe(true);
    });
  });

  describe('notifications resource', () => {
    it('list and listForTenant return arrays when authenticated', async () => {
      const { tenantId } = await withAuthenticatedTenant(sdk);
      const fromView = await sdk.notifications.list({ limit: 10 });
      expect(Array.isArray(fromView)).toBe(true);
      const fromRpc = await sdk.notifications.listForTenant(tenantId, 10);
      expect(Array.isArray(fromRpc)).toBe(true);
    });

    it('upsertPreference completes without error', async () => {
      const { tenantId } = await withAuthenticatedTenant(sdk);
      await expect(
        sdk.notifications.upsertPreference({
          tenantId,
          eventKey: 'work_order.assigned',
          channelInApp: true,
        })
      ).resolves.toBeUndefined();
    });
  });

  describe('integrations resource', () => {
    it('upsertExternalId and listExternalIds', async () => {
      const { tenantId } = await withAuthenticatedTenant(sdk);
      const woId = await sdk.workOrders.create({
        tenantId,
        title: 'SDK integration WO',
        priority: 'low',
      });
      const id = await sdk.integrations.upsertExternalId({
        tenantId,
        entityType: 'work_order',
        entityId: woId,
        systemKey: 'sdk_test',
        externalId: 'X-1',
      });
      expect(typeof id).toBe('string');
      const rows = await sdk.integrations.listExternalIds();
      expect(rows.some((r) => r.external_id === 'X-1')).toBe(true);
    });
  });

  describe('partsInventory contracts', () => {
    it('resolvePartByScanCode returns part id', async () => {
      const { tenantId } = await withAuthenticatedTenant(sdk);
      const partId = await sdk.partsInventory.createPart({
        tenantId,
        partNumber: 'SDK-PN-1',
        barcode: 'SDK-P-BAR',
      });
      const resolved = await sdk.partsInventory.resolvePartByScanCode(tenantId, 'SDK-P-BAR');
      expect(resolved).toBe(partId);
    });

    it('createSupplierContract and listSupplierContracts', async () => {
      const { tenantId } = await withAuthenticatedTenant(sdk);
      const supplierId = await sdk.partsInventory.createSupplier({
        tenantId,
        name: 'SDK Supplier Ctr',
      });
      const cid = await sdk.partsInventory.createSupplierContract({
        tenantId,
        supplierId,
        effectiveStart: '2025-06-01',
        contractNumber: 'SDK-C1',
      });
      expect(typeof cid).toBe('string');
      const list = await sdk.partsInventory.listSupplierContracts();
      expect(list.some((c) => c.id === cid)).toBe(true);
    });

    it('listSummary returns lightweight part selector rows', async () => {
      const { tenantId } = await withAuthenticatedTenant(sdk);
      const partId = await sdk.partsInventory.createPart({
        tenantId,
        partNumber: 'SDK-SUMMARY-1',
        name: 'SDK Summary Part',
        barcode: 'SDK-SUMMARY-BARCODE',
      });

      const rows = await sdk.partsInventory.listSummary(10);
      const row = rows.find((item) => item.id === partId);
      expect(row).toBeDefined();
      expect(row?.part_number).toBe('SDK-SUMMARY-1');
      expect(row?.barcode).toBe('SDK-SUMMARY-BARCODE');
    });
  });

  describe('semanticSearch resource', () => {
    it('searchEntityCandidatesV2 returns disambiguation fields', async () => {
      const { tenantId } = await withAuthenticatedTenant(sdk);
      await sdk.partsInventory.createSupplier({
        tenantId,
        name: 'SDK Search Supplier',
      });

      const partId = await sdk.partsInventory.createPart({
        tenantId,
        partNumber: 'SDK-SEARCH-1',
        name: 'SDK Search Part',
        barcode: 'SDK-SEARCH-BARCODE',
      });

      const rows = await sdk.semanticSearch.searchEntityCandidatesV2({
        query: 'SDK Search',
        entityTypes: ['part'],
        limit: 5,
      });

      expect(Array.isArray(rows)).toBe(true);
      const part = rows.find((row) => row.entity_id === partId);
      expect(part).toBeDefined();
      expect(part?.entity_type).toBe('part');
      expect(part?.part_number).toBe('SDK-SEARCH-1');
      expect(part?.barcode).toBe('SDK-SEARCH-BARCODE');
      expect(typeof part?.disambiguation_hint).toBe('string');
    });
  });

  describe('assets resource', () => {
    it('recordDowntime returns event UUID', async () => {
      const { tenantId } = await withAuthenticatedTenant(sdk);
      const assetId = await sdk.assets.create({
        tenantId,
        name: 'SDK downtime asset',
      });
      const eventId = await sdk.assets.recordDowntime({
        tenantId,
        assetId,
        reasonKey: 'breakdown',
      });
      expect(typeof eventId).toBe('string');
      expect(eventId.length).toBeGreaterThan(10);
    });

    it('resolveByScanCode returns asset id for barcode', async () => {
      const { tenantId } = await withAuthenticatedTenant(sdk);
      const assetId = await sdk.assets.create({
        tenantId,
        name: 'SDK scan asset',
        barcode: 'SDK-BAR-1',
      });
      const resolved = await sdk.assets.resolveByScanCode(tenantId, 'SDK-BAR-1');
      expect(resolved).toBe(assetId);
      const missing = await sdk.assets.resolveByScanCode(tenantId, 'nope');
      expect(missing).toBeNull();
    });

    it('listSummary returns lightweight asset selector rows', async () => {
      const { tenantId } = await withAuthenticatedTenant(sdk);
      const assetId = await sdk.assets.create({
        tenantId,
        name: 'SDK Summary Asset',
        assetNumber: 'SDK-ASSET-1',
        barcode: 'SDK-ASSET-BARCODE',
      });

      const rows = await sdk.assets.listSummary(10);
      const row = rows.find((item) => item.id === assetId);
      expect(row).toBeDefined();
      expect(row?.asset_number).toBe('SDK-ASSET-1');
      expect(row?.barcode).toBe('SDK-ASSET-BARCODE');
    });

    it('upsertWarranty and listWarranties', async () => {
      const { tenantId } = await withAuthenticatedTenant(sdk);
      const assetId = await sdk.assets.create({
        tenantId,
        name: 'SDK warranty asset',
      });
      const wid = await sdk.assets.upsertWarranty({
        tenantId,
        assetId,
        expiresOn: '2030-06-01',
        warrantyType: 'standard',
        coverageSummary: 'SDK test',
      });
      expect(typeof wid).toBe('string');
      const rows = await sdk.assets.listWarranties(assetId);
      expect(rows.some((r) => r.id === wid)).toBe(true);
    });
  });

  describe('fieldOps resource', () => {
    it('listTools returns an array', async () => {
      await withAuthenticatedTenant(sdk);
      const tools = await sdk.fieldOps.listTools();
      expect(Array.isArray(tools)).toBe(true);
    });

    it('createTool and updateTool', async () => {
      const { tenantId } = await withAuthenticatedTenant(sdk);
      const toolId = await sdk.fieldOps.createTool({
        tenantId,
        name: 'SDK test torque wrench',
        assetTag: 'SDK-TW-1',
        status: 'available',
      });
      expect(typeof toolId).toBe('string');
      await sdk.fieldOps.updateTool({
        tenantId,
        toolId,
        name: 'SDK test torque wrench (updated)',
      });
      const tools = await sdk.fieldOps.listTools();
      const row = tools.find((t) => t.id === toolId);
      expect(row?.name).toBe('SDK test torque wrench (updated)');
    });
  });

  describe('pm resource', () => {
    it('listSchedulesSummary returns lightweight PM rows', async () => {
      const { tenantId } = await withAuthenticatedTenant(sdk);
      const assetId = await sdk.assets.create({
        tenantId,
        name: 'SDK PM Asset',
      });
      const pmId = await sdk.pm.createSchedule({
        tenantId,
        assetId,
        title: 'SDK PM Summary',
        triggerType: 'time',
        triggerConfig: { interval_days: 30 },
      });

      const rows = await sdk.pm.listSchedulesSummary({ limit: 10 });
      const row = rows.find((item) => item.id === pmId);
      expect(row).toBeDefined();
      expect(row?.title).toBe('SDK PM Summary');
      expect(row?.asset_id).toBe(assetId);
    });
  });

  describe('agent helper layer', () => {
    it('resolveTenant and ensureTenant guide tenant bootstrap', async () => {
      const { tenantId } = await withAuthenticatedTenant(sdk);
      const resolved = await sdk.agent.resolveTenant();
      expect(resolved.resolved).toBe(true);
      expect(resolved.tenant_id).toBe(tenantId);

      const ensured = await sdk.agent.ensureTenant({
        tenantId,
        refreshSession: true,
      });
      expect(ensured.tenant_id).toBe(tenantId);
      expect(Array.isArray(ensured.next_actions)).toBe(true);
    });

    it('searchEntities delegates to richer search helpers', async () => {
      const { tenantId } = await withAuthenticatedTenant(sdk);
      const assetId = await sdk.assets.create({
        tenantId,
        name: 'SDK Agent Search Asset',
        assetNumber: 'SDK-AGENT-ASSET',
      });

      await sdk.setTenantAndRefresh(tenantId);
      const rows = await sdk.agent.searchEntities({
        query: 'SDK Agent Search Asset',
        entityTypes: ['asset'],
        limit: 5,
      });
      const asset = rows.find((row) => row.entity_id === assetId);
      expect(asset).toBeDefined();
      expect(asset?.entity_type).toBe('asset');
    });

    it('createWorkOrderSafe wraps retry-safe creation', async () => {
      const { tenantId } = await withAuthenticatedTenant(sdk);
      const clientRequestId = `sdk-agent-create-${Date.now()}`;

      const first = await sdk.agent.createWorkOrderSafe({
        tenantId,
        title: 'SDK Agent WO',
        clientRequestId,
      });
      const second = await sdk.agent.createWorkOrderSafe({
        tenantId,
        title: 'SDK Agent WO Retry',
        clientRequestId,
      });

      expect(second.work_order_id).toBe(first.work_order_id);
      expect(second.client_request_id).toBe(clientRequestId);
    });

    it('recommendWorkflowBundle returns curated guidance', () => {
      const single = sdk.agent.recommendWorkflowBundle('work_order_intake');
      expect(Array.isArray(single)).toBe(false);
      if (!Array.isArray(single)) {
        expect(single.bundle_id).toBe('work_order_intake');
      }

      const all = sdk.agent.recommendWorkflowBundle();
      expect(Array.isArray(all)).toBe(true);
      expect(all.length).toBeGreaterThan(1);
    });

    it('summary helper shortcuts delegate to resource summaries', async () => {
      const { tenantId } = await withAuthenticatedTenant(sdk);
      const workOrderId = await sdk.workOrders.create({
        tenantId,
        title: 'SDK Agent Summary WO',
      });

      const workOrders = await sdk.agent.listWorkOrdersSummary(10);
      expect(workOrders.some((row) => row.id === workOrderId)).toBe(true);
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
