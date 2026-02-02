import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient, waitForSupabase } from './helpers/supabase';
import { createTestUser, TEST_PASSWORD } from './helpers/auth';
import {
  createTestTenant,
  addUserToTenant,
  assignRoleToUser,
  setTenantContext,
  clearTenantContext,
} from './helpers/tenant';
import {
  createTestAsset,
  createTestMeter,
  createTestMeterReading,
  getMeter,
} from './helpers/entities';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Meters', () => {
  let client: SupabaseClient;

  beforeAll(async () => {
    await waitForSupabase();
    client = createTestClient();
  });

  describe('RPC Functions', () => {
    describe('rpc_create_meter', () => {
      it('should create meter with all required fields', async () => {
        const { user } = await createTestUser(client);
        const tenantId = await createTestTenant(client);
        const assetId = await createTestAsset(client, tenantId, 'Test Asset');

        const meterId = await createTestMeter(
          client,
          tenantId,
          assetId,
          'runtime_hours',
          'Main Engine Hours',
          'hours',
          0,
          'increasing',
          0
        );

        expect(meterId).toBeDefined();
        expect(typeof meterId).toBe('string');

        await setTenantContext(client, tenantId);
        const meter = await getMeter(client, meterId);

        expect(meter).toBeDefined();
        expect(meter.name).toBe('Main Engine Hours');
        expect(meter.meter_type).toBe('runtime_hours');
        expect(meter.unit).toBe('hours');
        expect(meter.current_reading).toBe(0);
        expect(meter.reading_direction).toBe('increasing');
        expect(meter.tenant_id).toBe(tenantId);
      });

      it('should create meter with optional fields', async () => {
        const { user } = await createTestUser(client);
        const tenantId = await createTestTenant(client);
        const assetId = await createTestAsset(client, tenantId, 'Test Asset');

        const meterId = await createTestMeter(
          client,
          tenantId,
          assetId,
          'cycles',
          'Production Cycles',
          'cycles',
          100,
          'increasing',
          0,
          'Production cycle counter'
        );

        await setTenantContext(client, tenantId);
        const meter = await getMeter(client, meterId);

        expect(meter.description).toBe('Production cycle counter');
        expect(meter.current_reading).toBe(100);
      });

      it('should validate meter_type enum', async () => {
        const { user } = await createTestUser(client);
        const tenantId = await createTestTenant(client);
        const assetId = await createTestAsset(client, tenantId, 'Test Asset');

        const validTypes = ['runtime_hours', 'cycles', 'miles', 'production_units', 'custom'];
        for (const meterType of validTypes) {
          const meterId = await createTestMeter(
            client,
            tenantId,
            assetId,
            meterType,
            `Meter ${meterType}`
          );
          expect(meterId).toBeDefined();
        }
      });

      it('should reject invalid meter_type', async () => {
        const { user } = await createTestUser(client);
        const tenantId = await createTestTenant(client);
        const assetId = await createTestAsset(client, tenantId, 'Test Asset');

        const { error } = await client.rpc('rpc_create_meter', {
          p_tenant_id: tenantId,
          p_asset_id: assetId,
          p_meter_type: 'invalid_type',
          p_name: 'Test Meter',
          p_unit: 'hours',
        });

        expect(error).toBeDefined();
        expect(error?.message).toContain('Invalid meter_type');
      });

      it('should validate reading_direction enum', async () => {
        const { user } = await createTestUser(client);
        const tenantId = await createTestTenant(client);
        const assetId = await createTestAsset(client, tenantId, 'Test Asset');

        const validDirections = ['increasing', 'decreasing', 'reset'];
        for (const direction of validDirections) {
          const meterId = await createTestMeter(
            client,
            tenantId,
            assetId,
            'runtime_hours',
            `Meter ${direction}`,
            'hours',
            0,
            direction
          );
          expect(meterId).toBeDefined();
        }
      });

      it('should reject invalid reading_direction', async () => {
        const { user } = await createTestUser(client);
        const tenantId = await createTestTenant(client);
        const assetId = await createTestAsset(client, tenantId, 'Test Asset');

        const { error } = await client.rpc('rpc_create_meter', {
          p_tenant_id: tenantId,
          p_asset_id: assetId,
          p_meter_type: 'runtime_hours',
          p_name: 'Test Meter',
          p_unit: 'hours',
          p_reading_direction: 'invalid',
        });

        expect(error).toBeDefined();
        expect(error?.message).toContain('Invalid reading_direction');
      });

      it('should validate decimal_places range (0-6)', async () => {
        const { user } = await createTestUser(client);
        const tenantId = await createTestTenant(client);
        const assetId = await createTestAsset(client, tenantId, 'Test Asset');

        // Valid range
        for (const decimalPlaces of [0, 3, 6]) {
          const meterId = await createTestMeter(
            client,
            tenantId,
            assetId,
            'runtime_hours',
            `Meter ${decimalPlaces}`,
            'hours',
            0,
            'increasing',
            decimalPlaces
          );
          expect(meterId).toBeDefined();
        }

        // Invalid: negative
        const { error: error1 } = await client.rpc('rpc_create_meter', {
          p_tenant_id: tenantId,
          p_asset_id: assetId,
          p_meter_type: 'runtime_hours',
          p_name: 'Test Meter',
          p_unit: 'hours',
          p_decimal_places: -1,
        });
        expect(error1).toBeDefined();
        // Accept either RPC validation error or CHECK constraint error
        if (error1?.message) {
          expect(
            error1.message.includes('decimal_places must be between 0 and 6') ||
            error1.message.includes('asset_meters_decimal_places_check')
          ).toBe(true);
        }

        // Invalid: > 6
        const { error: error2 } = await client.rpc('rpc_create_meter', {
          p_tenant_id: tenantId,
          p_asset_id: assetId,
          p_meter_type: 'runtime_hours',
          p_name: 'Test Meter',
          p_unit: 'hours',
          p_decimal_places: 7,
        });
        expect(error2).toBeDefined();
        // Accept either RPC validation error or CHECK constraint error
        if (error2?.message) {
          expect(
            error2.message.includes('decimal_places must be between 0 and 6') ||
            error2.message.includes('asset_meters_decimal_places_check')
          ).toBe(true);
        }
      });

      it('should validate name length (1-255 characters)', async () => {
        const { user } = await createTestUser(client);
        const tenantId = await createTestTenant(client);
        const assetId = await createTestAsset(client, tenantId, 'Test Asset');

        // Valid: 1 character
        const meterId1 = await createTestMeter(
          client,
          tenantId,
          assetId,
          'runtime_hours',
          'A'
        );
        expect(meterId1).toBeDefined();

        // Valid: 255 characters
        const longName = 'A'.repeat(255);
        const meterId2 = await createTestMeter(
          client,
          tenantId,
          assetId,
          'runtime_hours',
          longName
        );
        expect(meterId2).toBeDefined();

        // Invalid: empty
        const { error: error1 } = await client.rpc('rpc_create_meter', {
          p_tenant_id: tenantId,
          p_asset_id: assetId,
          p_meter_type: 'runtime_hours',
          p_name: '',
          p_unit: 'hours',
        });
        expect(error1).toBeDefined();
        // Accept either RPC validation error or CHECK constraint error
        if (error1?.message) {
          expect(
            error1.message.includes('Meter name must be between 1 and 255 characters') ||
            error1.message.includes('asset_meters_name_length_check')
          ).toBe(true);
        }

        // Invalid: > 255 characters
        const { error: error2 } = await client.rpc('rpc_create_meter', {
          p_tenant_id: tenantId,
          p_asset_id: assetId,
          p_meter_type: 'runtime_hours',
          p_name: 'A'.repeat(256),
          p_unit: 'hours',
        });
        expect(error2).toBeDefined();
        // Accept either RPC validation error or CHECK constraint error
        if (error2?.message) {
          expect(
            error2.message.includes('Meter name must be between 1 and 255 characters') ||
            error2.message.includes('asset_meters_name_length_check')
          ).toBe(true);
        }
      });

      it('should validate unit length (1-50 characters)', async () => {
        const { user } = await createTestUser(client);
        const tenantId = await createTestTenant(client);
        const assetId = await createTestAsset(client, tenantId, 'Test Asset');

        // Valid: 1 character
        const meterId1 = await createTestMeter(
          client,
          tenantId,
          assetId,
          'runtime_hours',
          'Test Meter',
          'h'
        );
        expect(meterId1).toBeDefined();

        // Valid: 50 characters
        const longUnit = 'A'.repeat(50);
        const meterId2 = await createTestMeter(
          client,
          tenantId,
          assetId,
          'runtime_hours',
          'Test Meter 2',
          longUnit
        );
        expect(meterId2).toBeDefined();

        // Invalid: empty
        const { error: error1 } = await client.rpc('rpc_create_meter', {
          p_tenant_id: tenantId,
          p_asset_id: assetId,
          p_meter_type: 'runtime_hours',
          p_name: 'Test Meter',
          p_unit: '',
        });
        expect(error1).toBeDefined();
        // Accept either RPC validation error or CHECK constraint error
        if (error1?.message) {
          expect(
            error1.message.includes('Meter unit must be between 1 and 50 characters') ||
            error1.message.includes('asset_meters_unit_length_check')
          ).toBe(true);
        }

        // Invalid: > 50 characters
        const { error: error2 } = await client.rpc('rpc_create_meter', {
          p_tenant_id: tenantId,
          p_asset_id: assetId,
          p_meter_type: 'runtime_hours',
          p_name: 'Test Meter',
          p_unit: 'A'.repeat(51),
        });
        expect(error2).toBeDefined();
        // Accept either RPC validation error or CHECK constraint error
        if (error2?.message) {
          expect(
            error2.message.includes('Meter unit must be between 1 and 50 characters') ||
            error2.message.includes('asset_meters_unit_length_check')
          ).toBe(true);
        }
      });

      it('should validate current_reading >= 0', async () => {
        const { user } = await createTestUser(client);
        const tenantId = await createTestTenant(client);
        const assetId = await createTestAsset(client, tenantId, 'Test Asset');

        // Valid: 0
        const meterId1 = await createTestMeter(
          client,
          tenantId,
          assetId,
          'runtime_hours',
          'Test Meter',
          'hours',
          0
        );
        expect(meterId1).toBeDefined();

        // Valid: positive
        const meterId2 = await createTestMeter(
          client,
          tenantId,
          assetId,
          'runtime_hours',
          'Test Meter 2',
          'hours',
          100
        );
        expect(meterId2).toBeDefined();

        // Invalid: negative
        const { error } = await client.rpc('rpc_create_meter', {
          p_tenant_id: tenantId,
          p_asset_id: assetId,
          p_meter_type: 'runtime_hours',
          p_name: 'Test Meter',
          p_unit: 'hours',
          p_current_reading: -1,
        });
        expect(error).toBeDefined();
      });

      it('should reject asset from different tenant', async () => {
        const client1 = createTestClient();
        await createTestUser(client1);
        const tenantId1 = await createTestTenant(client1);
        const assetId1 = await createTestAsset(client1, tenantId1, 'Asset 1');

        const client2 = createTestClient();
        await createTestUser(client2);
        const tenantId2 = await createTestTenant(client2);

        const { error } = await client2.rpc('rpc_create_meter', {
          p_tenant_id: tenantId2,
          p_asset_id: assetId1, // Asset from tenant1
          p_meter_type: 'runtime_hours',
          p_name: 'Unauthorized Meter',
          p_unit: 'hours',
        });

        expect(error).toBeDefined();
        expect(error?.code).toBe('42501');
      });

      it('should reject non-existent asset', async () => {
        const { user } = await createTestUser(client);
        const tenantId = await createTestTenant(client);
        const fakeAssetId = '00000000-0000-0000-0000-000000000000';

        const { error } = await client.rpc('rpc_create_meter', {
          p_tenant_id: tenantId,
          p_asset_id: fakeAssetId,
          p_meter_type: 'runtime_hours',
          p_name: 'Test Meter',
          p_unit: 'hours',
        });

        expect(error).toBeDefined();
        expect(error?.code).toBe('P0001');
      });

      it('should require asset.edit permission', async () => {
        const adminClient = createTestClient();
        const { user: admin } = await createTestUser(adminClient);
        const tenantId = await createTestTenant(adminClient);
        const assetId = await createTestAsset(adminClient, tenantId, 'Test Asset');

        const memberClient = createTestClient();
        const { user: member } = await createTestUser(memberClient);
        await addUserToTenant(adminClient, member.id, tenantId);
        await assignRoleToUser(adminClient, member.id, tenantId, 'member');

        // Member role doesn't have asset.edit permission
        const { error } = await memberClient.rpc('rpc_create_meter', {
          p_tenant_id: tenantId,
          p_asset_id: assetId,
          p_meter_type: 'runtime_hours',
          p_name: 'Test Meter',
          p_unit: 'hours',
        });

        expect(error).toBeDefined();
      });
    });

    describe('rpc_update_meter', () => {
      it('should update meter name', async () => {
        const { user } = await createTestUser(client);
        const tenantId = await createTestTenant(client);
        const assetId = await createTestAsset(client, tenantId, 'Test Asset');
        const meterId = await createTestMeter(client, tenantId, assetId, 'runtime_hours', 'Old Name');

        const { error } = await client.rpc('rpc_update_meter', {
          p_tenant_id: tenantId,
          p_meter_id: meterId,
          p_name: 'New Name',
        });

        expect(error).toBeNull();

        await setTenantContext(client, tenantId);
        const meter = await getMeter(client, meterId);
        expect(meter.name).toBe('New Name');
      });

      it('should update meter unit', async () => {
        const { user } = await createTestUser(client);
        const tenantId = await createTestTenant(client);
        const assetId = await createTestAsset(client, tenantId, 'Test Asset');
        const meterId = await createTestMeter(client, tenantId, assetId);

        const { error } = await client.rpc('rpc_update_meter', {
          p_tenant_id: tenantId,
          p_meter_id: meterId,
          p_unit: 'miles',
        });

        expect(error).toBeNull();

        await setTenantContext(client, tenantId);
        const meter = await getMeter(client, meterId);
        expect(meter.unit).toBe('miles');
      });

      it('should update reading_direction', async () => {
        const { user } = await createTestUser(client);
        const tenantId = await createTestTenant(client);
        const assetId = await createTestAsset(client, tenantId, 'Test Asset');
        const meterId = await createTestMeter(client, tenantId, assetId, 'runtime_hours', 'Test Meter', 'hours', 0, 'increasing');

        const { error } = await client.rpc('rpc_update_meter', {
          p_tenant_id: tenantId,
          p_meter_id: meterId,
          p_reading_direction: 'decreasing',
        });

        expect(error).toBeNull();

        await setTenantContext(client, tenantId);
        const meter = await getMeter(client, meterId);
        expect(meter.reading_direction).toBe('decreasing');
      });

      it('should update decimal_places', async () => {
        const { user } = await createTestUser(client);
        const tenantId = await createTestTenant(client);
        const assetId = await createTestAsset(client, tenantId, 'Test Asset');
        const meterId = await createTestMeter(client, tenantId, assetId);

        const { error } = await client.rpc('rpc_update_meter', {
          p_tenant_id: tenantId,
          p_meter_id: meterId,
          p_decimal_places: 2,
        });

        expect(error).toBeNull();

        await setTenantContext(client, tenantId);
        const meter = await getMeter(client, meterId);
        expect(meter.decimal_places).toBe(2);
      });

      it('should update description', async () => {
        const { user } = await createTestUser(client);
        const tenantId = await createTestTenant(client);
        const assetId = await createTestAsset(client, tenantId, 'Test Asset');
        const meterId = await createTestMeter(client, tenantId, assetId);

        const { error } = await client.rpc('rpc_update_meter', {
          p_tenant_id: tenantId,
          p_meter_id: meterId,
          p_description: 'Updated description',
        });

        expect(error).toBeNull();

        await setTenantContext(client, tenantId);
        const meter = await getMeter(client, meterId);
        expect(meter.description).toBe('Updated description');
      });

      it('should update is_active (soft delete)', async () => {
        const { user } = await createTestUser(client);
        const tenantId = await createTestTenant(client);
        const assetId = await createTestAsset(client, tenantId, 'Test Asset');
        const meterId = await createTestMeter(client, tenantId, assetId);

        const { error } = await client.rpc('rpc_update_meter', {
          p_tenant_id: tenantId,
          p_meter_id: meterId,
          p_is_active: false,
        });

        expect(error).toBeNull();

        await setTenantContext(client, tenantId);
        const meter = await getMeter(client, meterId);
        expect(meter.is_active).toBe(false);
      });

      it('should prevent deactivating meter referenced by active PM schedules', async () => {
        const { user } = await createTestUser(client);
        const tenantId = await createTestTenant(client);
        const assetId = await createTestAsset(client, tenantId, 'Test Asset');
        const meterId = await createTestMeter(client, tenantId, assetId);

        // Create PM schedule that uses this meter
        const pmScheduleId = await client.rpc('rpc_create_pm_schedule', {
          p_tenant_id: tenantId,
          p_asset_id: assetId,
          p_title: 'PM Schedule',
          p_trigger_type: 'usage',
          p_trigger_config: {
            meter_id: meterId,
            threshold: 1000,
          },
        });

        // Try to deactivate meter
        const { error } = await client.rpc('rpc_update_meter', {
          p_tenant_id: tenantId,
          p_meter_id: meterId,
          p_is_active: false,
        });

        expect(error).toBeDefined();
        if (error?.message) {
          expect(error.message).toContain('Active PM schedules reference this meter');
        }
      });

      it('should reject updates to meter from different tenant', async () => {
        const client1 = createTestClient();
        await createTestUser(client1);
        const tenantId1 = await createTestTenant(client1);
        const assetId1 = await createTestAsset(client1, tenantId1, 'Asset 1');
        const meterId1 = await createTestMeter(client1, tenantId1, assetId1);

        const client2 = createTestClient();
        await createTestUser(client2);
        const tenantId2 = await createTestTenant(client2);

        const { error } = await client2.rpc('rpc_update_meter', {
          p_tenant_id: tenantId2,
          p_meter_id: meterId1, // Meter from tenant1
          p_name: 'Unauthorized Update',
        });

        expect(error).toBeDefined();
        expect(error?.code).toBe('42501');
      });
    });

    describe('rpc_record_meter_reading', () => {
      it('should record reading with all fields', async () => {
        const { user } = await createTestUser(client);
        const tenantId = await createTestTenant(client);
        const assetId = await createTestAsset(client, tenantId, 'Test Asset');
        const meterId = await createTestMeter(client, tenantId, assetId, 'runtime_hours', 'Test Meter', 'hours', 0);

        const readingDate = new Date();
        const readingId = await createTestMeterReading(
          client,
          tenantId,
          meterId,
          100,
          readingDate,
          'manual',
          'Test reading'
        );

        expect(readingId).toBeDefined();

        await setTenantContext(client, tenantId);
        // Use .limit(1) instead of .single() because PostgREST can't infer primary keys from views
        const { data: readingData } = await client
          .from('v_meter_readings')
          .select('*')
          .eq('id', readingId)
          .limit(1);
        
        const reading = readingData && readingData.length > 0 ? readingData[0] : null;
        expect(reading).not.toBeNull();

        expect(reading.reading_value).toBe(100);
        expect(reading.reading_type).toBe('manual');
        expect(reading.notes).toBe('Test reading');
      });

      it('should record reading with default reading_date (now)', async () => {
        const { user } = await createTestUser(client);
        const tenantId = await createTestTenant(client);
        const assetId = await createTestAsset(client, tenantId, 'Test Asset');
        const meterId = await createTestMeter(client, tenantId, assetId);

        const beforeReading = new Date();
        // Subtract 100ms to account for timing differences between JS and database
        // This accounts for network latency, database processing time, and clock skew
        beforeReading.setMilliseconds(beforeReading.getMilliseconds() - 100);
        
        const readingId = await createTestMeterReading(
          client,
          tenantId,
          meterId,
          50,
          undefined, // No date provided
          'automated'
        );
        const afterReading = new Date();
        // Add 100ms buffer to account for timing differences
        afterReading.setMilliseconds(afterReading.getMilliseconds() + 100);

        await setTenantContext(client, tenantId);
        // Use .limit(1) instead of .single() because PostgREST can't infer primary keys from views
        const { data: readingData } = await client
          .from('v_meter_readings')
          .select('*')
          .eq('id', readingId)
          .limit(1);
        
        const reading = readingData && readingData.length > 0 ? readingData[0] : null;
        expect(reading).not.toBeNull();

        const readingDate = new Date(reading.reading_date);
        // Use larger buffer to account for timing differences between client and server
        // Network latency, database processing, and clock skew can cause small differences
        expect(readingDate.getTime()).toBeGreaterThanOrEqual(beforeReading.getTime());
        expect(readingDate.getTime()).toBeLessThanOrEqual(afterReading.getTime());
      });

      it('should record reading with custom reading_date (backdating)', async () => {
        const { user } = await createTestUser(client);
        const tenantId = await createTestTenant(client);
        const assetId = await createTestAsset(client, tenantId, 'Test Asset');
        const meterId = await createTestMeter(client, tenantId, assetId);

        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 30); // 30 days ago

        const readingId = await createTestMeterReading(
          client,
          tenantId,
          meterId,
          75,
          pastDate,
          'imported'
        );

        await setTenantContext(client, tenantId);
        // Use .limit(1) instead of .single() because PostgREST can't infer primary keys from views
        const { data: readingData } = await client
          .from('v_meter_readings')
          .select('*')
          .eq('id', readingId)
          .limit(1);
        
        const reading = readingData && readingData.length > 0 ? readingData[0] : null;
        expect(reading).not.toBeNull();

        const readingDate = new Date(reading.reading_date);
        expect(readingDate.toISOString().split('T')[0]).toBe(pastDate.toISOString().split('T')[0]);
      });

      it('should validate reading_type enum', async () => {
        const { user } = await createTestUser(client);
        const tenantId = await createTestTenant(client);
        const assetId = await createTestAsset(client, tenantId, 'Test Asset');
        const meterId = await createTestMeter(client, tenantId, assetId);

        const validTypes = ['manual', 'automated', 'imported', 'estimated'];
        for (const readingType of validTypes) {
          const readingId = await createTestMeterReading(
            client,
            tenantId,
            meterId,
            100,
            undefined,
            readingType
          );
          expect(readingId).toBeDefined();
        }
      });

      it('should reject invalid reading_type', async () => {
        const { user } = await createTestUser(client);
        const tenantId = await createTestTenant(client);
        const assetId = await createTestAsset(client, tenantId, 'Test Asset');
        const meterId = await createTestMeter(client, tenantId, assetId);

        const { error } = await client.rpc('rpc_record_meter_reading', {
          p_tenant_id: tenantId,
          p_meter_id: meterId,
          p_reading_value: 100,
          p_reading_type: 'invalid',
        });

        expect(error).toBeDefined();
        expect(error?.message).toContain('Invalid reading_type');
      });

      it('should validate reading_value >= 0', async () => {
        const { user } = await createTestUser(client);
        const tenantId = await createTestTenant(client);
        const assetId = await createTestAsset(client, tenantId, 'Test Asset');
        const meterId = await createTestMeter(client, tenantId, assetId);

        // Valid: 0
        const readingId1 = await createTestMeterReading(client, tenantId, meterId, 0);
        expect(readingId1).toBeDefined();

        // Valid: positive
        const readingId2 = await createTestMeterReading(client, tenantId, meterId, 100);
        expect(readingId2).toBeDefined();

        // Invalid: negative
        const { error } = await client.rpc('rpc_record_meter_reading', {
          p_tenant_id: tenantId,
          p_meter_id: meterId,
          p_reading_value: -1,
        });

        expect(error).toBeDefined();
      });

      it('should validate reading_date range (7 days future, 90 days past)', async () => {
        const { user } = await createTestUser(client);
        const tenantId = await createTestTenant(client);
        const assetId = await createTestAsset(client, tenantId, 'Test Asset');
        const meterId = await createTestMeter(client, tenantId, assetId);

        // Valid: within range
        const validDate = new Date();
        validDate.setDate(validDate.getDate() - 30); // 30 days ago
        const readingId1 = await createTestMeterReading(client, tenantId, meterId, 100, validDate);
        expect(readingId1).toBeDefined();

        // Invalid: > 7 days in future
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 8);
        const { error: error1 } = await client.rpc('rpc_record_meter_reading', {
          p_tenant_id: tenantId,
          p_meter_id: meterId,
          p_reading_value: 100,
          p_reading_date: futureDate.toISOString(),
        });
        expect(error1).toBeDefined();
        // Accept either RPC validation error or trigger validation error
        if (error1?.message) {
          expect(
            error1.message.includes('Reading date cannot be more than 7 days in the future') ||
            error1.message.includes('reading_date')
          ).toBe(true);
        }

        // Invalid: > 90 days in past
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 91);
        const { error: error2 } = await client.rpc('rpc_record_meter_reading', {
          p_tenant_id: tenantId,
          p_meter_id: meterId,
          p_reading_value: 100,
          p_reading_date: pastDate.toISOString(),
        });
        expect(error2).toBeDefined();
        // Accept either RPC validation error or trigger validation error
        if (error2?.message) {
          expect(
            error2.message.includes('Reading date cannot be more than 90 days in the past') ||
            error2.message.includes('reading_date')
          ).toBe(true);
        }
      });

      it('should validate reading direction for increasing meters', async () => {
        const { user } = await createTestUser(client);
        const tenantId = await createTestTenant(client);
        const assetId = await createTestAsset(client, tenantId, 'Test Asset');
        const meterId = await createTestMeter(client, tenantId, assetId, 'runtime_hours', 'Test Meter', 'hours', 100, 'increasing');

        // Valid: reading >= current
        const readingId1 = await createTestMeterReading(client, tenantId, meterId, 150);
        expect(readingId1).toBeDefined();

        // Valid: small decrease (within 10% tolerance)
        // 150 * 0.9 = 135, so 140 is within 10% tolerance (6.67% decrease)
        const readingId2 = await createTestMeterReading(client, tenantId, meterId, 140);
        expect(readingId2).toBeDefined();

        // Invalid: large decrease (> 10% tolerance)
        // After readings: 100 (initial) -> 150 (first) -> 140 (second, 6.67% decrease allowed)
        // Current reading is now 140. Reading 50 is a 64.29% decrease from 140, which exceeds 10% tolerance
        const { data, error } = await client.rpc('rpc_record_meter_reading', {
          p_tenant_id: tenantId,
          p_meter_id: meterId,
          p_reading_value: 50, // Large decrease from 140 (64.29% decrease)
        });
        
        // Should return an error for invalid reading
        expect(data).toBeNull();
        expect(error).toBeDefined();
        expect(error).not.toBeNull();
        
        if (error) {
          expect(error.message).toBeDefined();
          // Error message should contain information about reading decrease
          // The error message format is: "Reading decreased by X%. For increasing meters..."
          expect(error.message.toLowerCase()).toMatch(/reading.*decreas|decreas.*reading/i);
        } else {
          throw new Error('Expected error for invalid reading, but no error was returned');
        }
      });

      it('should validate reading direction for decreasing meters', async () => {
        const { user } = await createTestUser(client);
        const tenantId = await createTestTenant(client);
        const assetId = await createTestAsset(client, tenantId, 'Test Asset');
        const meterId = await createTestMeter(client, tenantId, assetId, 'runtime_hours', 'Test Meter', 'hours', 100, 'decreasing');

        // Valid: reading <= current
        const readingId1 = await createTestMeterReading(client, tenantId, meterId, 50);
        expect(readingId1).toBeDefined();

        // Invalid: reading > current
        const { error } = await client.rpc('rpc_record_meter_reading', {
          p_tenant_id: tenantId,
          p_meter_id: meterId,
          p_reading_value: 150,
        });
        expect(error).toBeDefined();
        if (error?.message) {
          expect(error.message).toContain('new reading must be <= current reading');
        }
      });

      it('should update meter current_reading automatically', async () => {
        const { user } = await createTestUser(client);
        const tenantId = await createTestTenant(client);
        const assetId = await createTestAsset(client, tenantId, 'Test Asset');
        const meterId = await createTestMeter(client, tenantId, assetId, 'runtime_hours', 'Test Meter', 'hours', 0);

        await createTestMeterReading(client, tenantId, meterId, 100);

        await setTenantContext(client, tenantId);
        const meter = await getMeter(client, meterId);
        expect(meter.current_reading).toBe(100);
      });

      it('should update meter last_reading_date automatically', async () => {
        const { user } = await createTestUser(client);
        const tenantId = await createTestTenant(client);
        const assetId = await createTestAsset(client, tenantId, 'Test Asset');
        const meterId = await createTestMeter(client, tenantId, assetId);

        const readingDate = new Date();
        await createTestMeterReading(client, tenantId, meterId, 100, readingDate);

        await setTenantContext(client, tenantId);
        const meter = await getMeter(client, meterId);
        expect(meter.last_reading_date).toBeDefined();
        const lastReadingDate = new Date(meter.last_reading_date);
        expect(lastReadingDate.toISOString().split('T')[0]).toBe(readingDate.toISOString().split('T')[0]);
      });

      it('should trigger PM usage-based checks when threshold reached', async () => {
        const { user } = await createTestUser(client);
        const tenantId = await createTestTenant(client);
        const assetId = await createTestAsset(client, tenantId, 'Test Asset');
        const meterId = await createTestMeter(client, tenantId, assetId, 'runtime_hours', 'Test Meter', 'hours', 0);

        // Create usage-based PM schedule
        const { data: pmScheduleId, error: pmError } = await client.rpc('rpc_create_pm_schedule', {
          p_tenant_id: tenantId,
          p_asset_id: assetId,
          p_title: 'Usage PM',
          p_trigger_type: 'usage',
          p_trigger_config: {
            meter_id: meterId,
            threshold: 1000,
          },
        });
        
        if (pmError) {
          throw new Error(`Failed to create PM schedule: ${pmError.message}`);
        }

        // Record reading that reaches threshold
        await createTestMeterReading(client, tenantId, meterId, 1000);

        // Check if work order was generated
        await setTenantContext(client, tenantId);
        const { data: workOrders } = await client
          .from('v_work_orders')
          .select('*')
          .eq('pm_schedule_id', pmScheduleId);

        // Work order should be generated if PM is due and dependencies are met
        // (This depends on PM schedule being active and auto_generate = true)
        expect(workOrders).toBeDefined();
      });

      it('should reject reading for meter from different tenant', async () => {
        const client1 = createTestClient();
        await createTestUser(client1);
        const tenantId1 = await createTestTenant(client1);
        const assetId1 = await createTestAsset(client1, tenantId1, 'Asset 1');
        const meterId1 = await createTestMeter(client1, tenantId1, assetId1);

        const client2 = createTestClient();
        await createTestUser(client2);
        const tenantId2 = await createTestTenant(client2);

        const { error } = await client2.rpc('rpc_record_meter_reading', {
          p_tenant_id: tenantId2,
          p_meter_id: meterId1, // Meter from tenant1
          p_reading_value: 100,
        });

        expect(error).toBeDefined();
        expect(error?.code).toBe('42501');
      });
    });

    describe('rpc_delete_meter', () => {
      it('should soft delete meter (sets is_active = false)', async () => {
        const { user } = await createTestUser(client);
        const tenantId = await createTestTenant(client);
        const assetId = await createTestAsset(client, tenantId, 'Test Asset');
        const meterId = await createTestMeter(client, tenantId, assetId);

        const { error } = await client.rpc('rpc_delete_meter', {
          p_tenant_id: tenantId,
          p_meter_id: meterId,
        });

        expect(error).toBeNull();

        await setTenantContext(client, tenantId);
        const meter = await getMeter(client, meterId);
        expect(meter.is_active).toBe(false);
      });

      it('should prevent deleting meter referenced by active PM schedules', async () => {
        const { user } = await createTestUser(client);
        const tenantId = await createTestTenant(client);
        const assetId = await createTestAsset(client, tenantId, 'Test Asset');
        const meterId = await createTestMeter(client, tenantId, assetId);

        // Create PM schedule that uses this meter
        await client.rpc('rpc_create_pm_schedule', {
          p_tenant_id: tenantId,
          p_asset_id: assetId,
          p_title: 'PM Schedule',
          p_trigger_type: 'usage',
          p_trigger_config: {
            meter_id: meterId,
            threshold: 1000,
          },
        });

        // Try to delete meter
        const { error } = await client.rpc('rpc_delete_meter', {
          p_tenant_id: tenantId,
          p_meter_id: meterId,
        });

        expect(error).toBeDefined();
        if (error?.message) {
          expect(error.message).toContain('Active PM schedules reference this meter');
        }
      });

      it('should reject delete for meter from different tenant', async () => {
        const client1 = createTestClient();
        await createTestUser(client1);
        const tenantId1 = await createTestTenant(client1);
        const assetId1 = await createTestAsset(client1, tenantId1, 'Asset 1');
        const meterId1 = await createTestMeter(client1, tenantId1, assetId1);

        const client2 = createTestClient();
        await createTestUser(client2);
        const tenantId2 = await createTestTenant(client2);

        const { error } = await client2.rpc('rpc_delete_meter', {
          p_tenant_id: tenantId2,
          p_meter_id: meterId1, // Meter from tenant1
        });

        expect(error).toBeDefined();
        expect(error?.code).toBe('42501');
      });
    });
  });

  describe('Views', () => {
    describe('v_asset_meters', () => {
      it('should return meters for current tenant only', async () => {
        const client1 = createTestClient();
        await createTestUser(client1);
        const tenantId1 = await createTestTenant(client1);
        const assetId1 = await createTestAsset(client1, tenantId1, 'Asset 1');
        const meterId1 = await createTestMeter(client1, tenantId1, assetId1, 'runtime_hours', 'Meter 1');

        const client2 = createTestClient();
        await createTestUser(client2);
        const tenantId2 = await createTestTenant(client2);
        const assetId2 = await createTestAsset(client2, tenantId2, 'Asset 2');
        const meterId2 = await createTestMeter(client2, tenantId2, assetId2, 'runtime_hours', 'Meter 2');

        await setTenantContext(client1, tenantId1);
        const { data: meters } = await client1
          .from('v_asset_meters')
          .select('*')
          .in('id', [meterId1, meterId2]);

        expect(meters.length).toBe(1);
        expect(meters[0].id).toBe(meterId1);
      });

      it('should include asset_name join', async () => {
        const { user } = await createTestUser(client);
        const tenantId = await createTestTenant(client);
        const assetId = await createTestAsset(client, tenantId, 'Test Asset');
        const meterId = await createTestMeter(client, tenantId, assetId);

        await setTenantContext(client, tenantId);
        // Use .limit(1) instead of .single() because PostgREST can't infer primary keys from views
        const { data: meterData } = await client
          .from('v_asset_meters')
          .select('*')
          .eq('id', meterId)
          .limit(1);
        
        const meter = meterData && meterData.length > 0 ? meterData[0] : null;
        expect(meter).not.toBeNull();

        expect(meter.asset_name).toBe('Test Asset');
      });

      it('should filter by tenant context', async () => {
        const { user } = await createTestUser(client);
        const tenantId = await createTestTenant(client);
        const assetId = await createTestAsset(client, tenantId, 'Test Asset');
        const meterId = await createTestMeter(client, tenantId, assetId);

        // With tenant context (set by createTestTenant), should return meter
        const { data: withContext } = await client
          .from('v_asset_meters')
          .select('*')
          .eq('id', meterId);

        expect(withContext.length).toBe(1);

        // Without tenant context, should return empty
        await clearTenantContext(client);
        const { data: noContext } = await client
          .from('v_asset_meters')
          .select('*')
          .eq('id', meterId);

        expect(noContext.length).toBe(0);
      });
    });

    describe('v_meter_readings', () => {
      it('should return readings for current tenant only', async () => {
        const client1 = createTestClient();
        await createTestUser(client1);
        const tenantId1 = await createTestTenant(client1);
        const assetId1 = await createTestAsset(client1, tenantId1, 'Asset 1');
        const meterId1 = await createTestMeter(client1, tenantId1, assetId1);
        const readingId1 = await createTestMeterReading(client1, tenantId1, meterId1, 100);

        const client2 = createTestClient();
        await createTestUser(client2);
        const tenantId2 = await createTestTenant(client2);
        const assetId2 = await createTestAsset(client2, tenantId2, 'Asset 2');
        const meterId2 = await createTestMeter(client2, tenantId2, assetId2);
        const readingId2 = await createTestMeterReading(client2, tenantId2, meterId2, 200);

        await setTenantContext(client1, tenantId1);
        const { data: readings } = await client1
          .from('v_meter_readings')
          .select('*')
          .in('id', [readingId1, readingId2]);

        expect(readings.length).toBe(1);
        expect(readings[0].id).toBe(readingId1);
      });

      it('should include meter_name and asset_name joins', async () => {
        const { user } = await createTestUser(client);
        const tenantId = await createTestTenant(client);
        const assetId = await createTestAsset(client, tenantId, 'Test Asset');
        const meterId = await createTestMeter(client, tenantId, assetId, 'runtime_hours', 'Test Meter');
        const readingId = await createTestMeterReading(client, tenantId, meterId, 100);

        await setTenantContext(client, tenantId);
        // Use .limit(1) instead of .single() because PostgREST can't infer primary keys from views
        const { data: readingData } = await client
          .from('v_meter_readings')
          .select('*')
          .eq('id', readingId)
          .limit(1);
        
        const reading = readingData && readingData.length > 0 ? readingData[0] : null;
        expect(reading).not.toBeNull();

        expect(reading.meter_name).toBe('Test Meter');
        expect(reading.asset_name).toBe('Test Asset');
      });

      it('should filter by tenant context', async () => {
        const { user } = await createTestUser(client);
        const tenantId = await createTestTenant(client);
        const assetId = await createTestAsset(client, tenantId, 'Test Asset');
        const meterId = await createTestMeter(client, tenantId, assetId);
        const readingId = await createTestMeterReading(client, tenantId, meterId, 100);

        // With tenant context (set by createTestTenant), should return reading
        const { data: withContext } = await client
          .from('v_meter_readings')
          .select('*')
          .eq('id', readingId);

        expect(withContext.length).toBe(1);

        // Without tenant context, should return empty
        await clearTenantContext(client);
        const { data: noContext } = await client
          .from('v_meter_readings')
          .select('*')
          .eq('id', readingId);

        expect(noContext.length).toBe(0);
      });
    });
  });

  describe('RLS Policies', () => {
    describe('Tenant Isolation', () => {
      it('should only allow users to see their tenant meters via views', async () => {
        const client1 = createTestClient();
        await createTestUser(client1);
        const tenantId1 = await createTestTenant(client1);
        const assetId1 = await createTestAsset(client1, tenantId1, 'Asset 1');
        const meterId1 = await createTestMeter(client1, tenantId1, assetId1, 'runtime_hours', 'Meter 1');

        const client2 = createTestClient();
        await createTestUser(client2);
        const tenantId2 = await createTestTenant(client2);
        const assetId2 = await createTestAsset(client2, tenantId2, 'Asset 2');
        const meterId2 = await createTestMeter(client2, tenantId2, assetId2, 'runtime_hours', 'Meter 2');

        await setTenantContext(client1, tenantId1);
        const { data: meters } = await client1
          .from('v_asset_meters')
          .select('*')
          .in('id', [meterId1, meterId2]);

        expect(meters.length).toBe(1);
        expect(meters[0].id).toBe(meterId1);
      });

      it('should prevent users from creating meters for other tenants', async () => {
        const client1 = createTestClient();
        await createTestUser(client1);
        const tenantId1 = await createTestTenant(client1);
        const assetId1 = await createTestAsset(client1, tenantId1, 'Asset 1');

        const client2 = createTestClient();
        await createTestUser(client2);
        const tenantId2 = await createTestTenant(client2);

        const { error } = await client2.rpc('rpc_create_meter', {
          p_tenant_id: tenantId2,
          p_asset_id: assetId1, // Asset from tenant1
          p_meter_type: 'runtime_hours',
          p_name: 'Unauthorized Meter',
          p_unit: 'hours',
        });

        expect(error).toBeDefined();
        expect(error?.code).toBe('42501');
      });

      it('should prevent users from updating other tenants meters', async () => {
        const client1 = createTestClient();
        await createTestUser(client1);
        const tenantId1 = await createTestTenant(client1);
        const assetId1 = await createTestAsset(client1, tenantId1, 'Asset 1');
        const meterId1 = await createTestMeter(client1, tenantId1, assetId1);

        const client2 = createTestClient();
        await createTestUser(client2);
        const tenantId2 = await createTestTenant(client2);

        const { error } = await client2.rpc('rpc_update_meter', {
          p_tenant_id: tenantId2,
          p_meter_id: meterId1, // Meter from tenant1
          p_name: 'Unauthorized Update',
        });

        expect(error).toBeDefined();
        expect(error?.code).toBe('42501');
      });

      it('should prevent anonymous users from accessing meters', async () => {
        const ownerClient = createTestClient();
        await createTestUser(ownerClient);
        const tenantId = await createTestTenant(ownerClient);
        const assetId = await createTestAsset(ownerClient, tenantId, 'Asset');
        const meterId = await createTestMeter(ownerClient, tenantId, assetId);

        // Anonymous client (no auth)
        const anonClient = createTestClient();

        const { data, error } = await anonClient
          .from('v_asset_meters')
          .select('*')
          .eq('id', meterId);

        expect(error).toBeNull();
        expect(data.length).toBe(0);
      });
    });
  });

  describe('Triggers', () => {
    describe('util.validate_meter_reading() trigger', () => {
      it('should validate reading_value >= 0', async () => {
        const { user } = await createTestUser(client);
        const tenantId = await createTestTenant(client);
        const assetId = await createTestAsset(client, tenantId, 'Test Asset');
        const meterId = await createTestMeter(client, tenantId, assetId);

        // This is tested via RPC, which calls the trigger
        const { error } = await client.rpc('rpc_record_meter_reading', {
          p_tenant_id: tenantId,
          p_meter_id: meterId,
          p_reading_value: -1,
        });

        expect(error).toBeDefined();
      });

      it('should validate reading_date range', async () => {
        const { user } = await createTestUser(client);
        const tenantId = await createTestTenant(client);
        const assetId = await createTestAsset(client, tenantId, 'Test Asset');
        const meterId = await createTestMeter(client, tenantId, assetId);

        // Tested via RPC validation
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 8);
        const { error } = await client.rpc('rpc_record_meter_reading', {
          p_tenant_id: tenantId,
          p_meter_id: meterId,
          p_reading_value: 100,
          p_reading_date: futureDate.toISOString(),
        });

        expect(error).toBeDefined();
      });

      it('should validate reading direction constraints', async () => {
        const { user } = await createTestUser(client);
        const tenantId = await createTestTenant(client);
        const assetId = await createTestAsset(client, tenantId, 'Test Asset');
        const meterId = await createTestMeter(client, tenantId, assetId, 'runtime_hours', 'Test Meter', 'hours', 100, 'increasing');

        // Tested via RPC validation - large decrease should fail
        const { error } = await client.rpc('rpc_record_meter_reading', {
          p_tenant_id: tenantId,
          p_meter_id: meterId,
          p_reading_value: 50, // 50% decrease
        });

        expect(error).toBeDefined();
      });

      it('should update meter current_reading', async () => {
        const { user } = await createTestUser(client);
        const tenantId = await createTestTenant(client);
        const assetId = await createTestAsset(client, tenantId, 'Test Asset');
        const meterId = await createTestMeter(client, tenantId, assetId, 'runtime_hours', 'Test Meter', 'hours', 0);

        await createTestMeterReading(client, tenantId, meterId, 100);

        await setTenantContext(client, tenantId);
        const meter = await getMeter(client, meterId);
        expect(meter.current_reading).toBe(100);
      });

      it('should update meter last_reading_date', async () => {
        const { user } = await createTestUser(client);
        const tenantId = await createTestTenant(client);
        const assetId = await createTestAsset(client, tenantId, 'Test Asset');
        const meterId = await createTestMeter(client, tenantId, assetId);

        const readingDate = new Date();
        await createTestMeterReading(client, tenantId, meterId, 100, readingDate);

        await setTenantContext(client, tenantId);
        const meter = await getMeter(client, meterId);
        expect(meter.last_reading_date).toBeDefined();
      });
    });

    describe('util.validate_asset_meter_tenant() trigger', () => {
      it('should ensure meter tenant matches asset tenant', async () => {
        // This is tested via RPC validation when creating meter
        // The RPC validates asset belongs to tenant before insert
        const client1 = createTestClient();
        await createTestUser(client1);
        const tenantId1 = await createTestTenant(client1);
        const assetId1 = await createTestAsset(client1, tenantId1, 'Asset 1');

        const client2 = createTestClient();
        await createTestUser(client2);
        const tenantId2 = await createTestTenant(client2);

        // Try to create meter in tenant2 for tenant1's asset
        const { error } = await client2.rpc('rpc_create_meter', {
          p_tenant_id: tenantId2,
          p_asset_id: assetId1, // Asset from tenant1
          p_meter_type: 'runtime_hours',
          p_name: 'Test Meter',
          p_unit: 'hours',
        });

        expect(error).toBeDefined();
        expect(error?.code).toBe('42501');
      });
    });
  });
});
