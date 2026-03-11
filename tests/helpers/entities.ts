import { SupabaseClient } from '@supabase/supabase-js';
import {
  makeAssetName,
  makeAssetNumber,
  makeDepartmentName,
  makeLocationName,
  makeWorkOrderTitle,
} from './faker';
import { setTenantContext } from './tenant';
import { formatPostgrestError } from './errors.js';

/** Location type for hierarchy (region, site, building, floor, room, zone). */
export type TestLocationType = 'region' | 'site' | 'building' | 'floor' | 'room' | 'zone';

/**
 * Create a test location via public RPC.
 * If name is not provided, a realistic site/building name is generated.
 * locationType defaults to 'site'; use for hierarchy tests (e.g. site -> building -> floor -> room).
 */
export async function createTestLocation(
  client: SupabaseClient,
  tenantId: string,
  name?: string,
  parentId?: string,
  locationType: TestLocationType = 'site'
): Promise<string> {
  const finalName = name ?? makeLocationName();

  const { data, error } = await client.rpc('rpc_create_location', {
    p_tenant_id: tenantId,
    p_name: finalName,
    p_description: null,
    p_parent_location_id: parentId || null,
    p_location_type: locationType,
    p_code: null,
    p_address_line: null,
    p_external_id: null,
  });

  if (error) {
    throw new Error(formatPostgrestError('Failed to create location', error));
  }

  return data as string;
}

/**
 * Create a test department.
 * If name is not provided, a realistic maintenance department name is generated.
 */
export async function createTestDepartment(
  client: SupabaseClient,
  tenantId: string,
  name?: string,
  code?: string
): Promise<string> {
  const finalName = name ?? makeDepartmentName();

  const { data, error } = await client.rpc('rpc_create_department', {
    p_tenant_id: tenantId,
    p_name: finalName,
    p_code: code || null,
  });

  if (error) {
    throw new Error(formatPostgrestError('Failed to create department', error));
  }

  return data as string;
}

/**
 * Create a test department (alias for RPC-based creation).
 */
export async function createTestDepartmentDirect(
  client: SupabaseClient,
  tenantId: string,
  name?: string,
  code?: string
): Promise<string> {
  return createTestDepartment(client, tenantId, name, code);
}

/**
 * Create a test asset via public RPC.
 * If fields like name/assetNumber are not provided, realistic CMMS-style values are generated.
 */
export async function createTestAsset(
  client: SupabaseClient,
  tenantId: string,
  name?: string,
  locationId?: string,
  departmentId?: string,
  assetNumber?: string,
  status: string = 'active'
): Promise<string> {
  const finalName = name ?? makeAssetName();
  const finalAssetNumber = assetNumber ?? null;

  const { data, error } = await client.rpc('rpc_create_asset', {
    p_tenant_id: tenantId,
    p_name: finalName,
    p_description: null,
    p_asset_number: finalAssetNumber,
    p_location_id: locationId || null,
    p_department_id: departmentId || null,
    p_status: status,
  });

  if (error) {
    throw new Error(formatPostgrestError('Failed to create asset', error));
  }

  return data as string;
}

/**
 * Create a test work order.
 * If title is not provided, a realistic maintenance description is generated.
 */
export async function createTestWorkOrder(
  client: SupabaseClient,
  tenantId: string,
  title?: string,
  description?: string,
  priority: string = 'medium',
  assignedTo?: string,
  locationId?: string,
  assetId?: string,
  dueDate?: Date,
  pmScheduleId?: string
): Promise<string> {
  const finalTitle = title ?? makeWorkOrderTitle();

  const { data, error } = await client.rpc('rpc_create_work_order', {
    p_tenant_id: tenantId,
    p_title: finalTitle,
    p_description: description || null,
    p_priority: priority,
    p_assigned_to: assignedTo || null,
    p_location_id: locationId || null,
    p_asset_id: assetId || null,
    p_due_date: dueDate?.toISOString() || null,
    p_pm_schedule_id: pmScheduleId || null,
  });

  if (error) {
    throw new Error(formatPostgrestError('Failed to create work order', error));
  }

  return data as string;
}

/**
 * Create a test work order (alias for RPC-based creation).
 */
export async function createTestWorkOrderDirect(
  client: SupabaseClient,
  tenantId: string,
  title?: string,
  description?: string,
  priority: string = 'medium',
  assignedTo?: string,
  locationId?: string,
  assetId?: string,
  dueDate?: Date
): Promise<string> {
  return createTestWorkOrder(
    client,
    tenantId,
    title,
    description,
    priority,
    assignedTo,
    locationId,
    assetId,
    dueDate
  );
}

/**
 * Get work order by ID (via public view).
 * Requires tenant context to be set before calling.
 */
export async function getWorkOrder(
  client: SupabaseClient,
  workOrderId: string | null,
  tenantId?: string
): Promise<any> {
  if (!workOrderId) {
    throw new Error('Work order ID is required');
  }

  // Set tenant context if provided
  if (tenantId) {
    await setTenantContext(client, tenantId);
  }

  // Use .limit(1) instead of .maybeSingle() because PostgREST can't infer primary keys from views
  const { data, error } = await client
    .from('v_work_orders')
    .select('*')
    .eq('id', workOrderId)
    .limit(1);

  if (error) {
    throw new Error(formatPostgrestError('Failed to get work order', error));
  }

  if (!data || data.length === 0) {
    throw new Error(`Work order ${workOrderId} not found`);
  }

  return data[0];
}

/**
 * Transition work order status
 */
export async function transitionWorkOrderStatus(
  client: SupabaseClient,
  tenantId: string,
  workOrderId: string,
  toStatus: string
): Promise<void> {
  // Check current status first to avoid unnecessary transitions
  // Set tenant context to query the view (idempotent if already set)
  await setTenantContext(client, tenantId);
  // Use .limit(1) instead of .single() because PostgREST can't infer primary keys from views
  const { data: woData, error: queryError } = await client
    .from('v_work_orders')
    .select('status')
    .eq('id', workOrderId)
    .limit(1);
  
  const wo = woData && woData.length > 0 ? woData[0] : null;

  // Skip if already in target status (only if query succeeded)
  if (!queryError && wo?.status === toStatus) {
    return;
  }

  const { error } = await client.rpc('rpc_transition_work_order_status', {
    p_tenant_id: tenantId,
    p_work_order_id: workOrderId,
    p_to_status_key: toStatus,
  });

  if (error) {
    throw new Error(formatPostgrestError('Failed to transition work order', error));
  }
}

/**
 * Create a test time entry for a work order.
 */
export async function createTestTimeEntry(
  client: SupabaseClient,
  tenantId: string,
  workOrderId: string,
  minutes: number,
  entryDate?: Date,
  userId?: string,
  description?: string
): Promise<string> {
  const { data, error } = await client.rpc('rpc_log_work_order_time', {
    p_tenant_id: tenantId,
    p_work_order_id: workOrderId,
    p_minutes: minutes,
    p_entry_date: entryDate ? entryDate.toISOString().split('T')[0] : null,
    p_user_id: userId || null,
    p_description: description || null,
  });

  if (error) {
    throw new Error(formatPostgrestError('Failed to create time entry', error));
  }

  return data as string;
}

/**
 * Get time entry by ID (via public view).
 * Requires tenant context to be set before calling.
 */
export async function getTimeEntry(
  client: SupabaseClient,
  timeEntryId: string,
  tenantId?: string
): Promise<any> {
  // Set tenant context if provided
  if (tenantId) {
    await setTenantContext(client, tenantId);
  }

  // Use .limit(1) instead of .single() because PostgREST can't infer primary keys from views
  const { data, error } = await client
    .from('v_work_order_time_entries')
    .select('*')
    .eq('id', timeEntryId)
    .limit(1);

  if (error) {
    throw new Error(formatPostgrestError('Failed to get time entry', error));
  }

  if (!data || data.length === 0) {
    throw new Error(`Time entry ${timeEntryId} not found`);
  }

  return data[0];
}

/**
 * Create a test attachment for a work order.
 * Uploads a small file to the attachments bucket with path tenant_id/work_order_id/uuid_filename
 * and metadata; the storage trigger creates app.files and app.work_order_attachments.
 * Returns the new attachment id by querying v_work_order_attachments (public API only).
 */
export async function createTestAttachment(
  client: SupabaseClient,
  tenantId: string,
  workOrderId: string,
  fileRef: string,
  label?: string,
  kind?: string
): Promise<string> {
  const filename = fileRef.split('/').pop() || 'file';
  const storagePath = `${tenantId}/${workOrderId}/${crypto.randomUUID()}_${filename}`;
  const body = Buffer.from('test');

  const { error: uploadError } = await client.storage
    .from('attachments')
    .upload(storagePath, body, {
      contentType: 'application/octet-stream',
      upsert: false,
      metadata: {
        work_order_id: workOrderId,
        tenant_id: tenantId,
        ...(label != null && { label }),
        ...(kind != null && { kind }),
      },
    });

  if (uploadError) {
    throw new Error(formatPostgrestError('Failed to upload attachment', uploadError));
  }

  await setTenantContext(client, tenantId);
  const { data: rows, error: selectError } = await client
    .from('v_work_order_attachments')
    .select('id')
    .eq('work_order_id', workOrderId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (selectError || !rows?.length) {
    throw new Error(
      formatPostgrestError('Failed to get created attachment id from v_work_order_attachments', selectError)
    );
  }

  return rows[0].id as string;
}

/**
 * Get attachment by ID (via public view).
 * Requires tenant context to be set before calling.
 */
export async function getAttachment(
  client: SupabaseClient,
  attachmentId: string,
  tenantId?: string
): Promise<any> {
  // Set tenant context if provided
  if (tenantId) {
    await setTenantContext(client, tenantId);
  }

  // Use .limit(1) instead of .single() because PostgREST can't infer primary keys from views
  const { data, error } = await client
    .from('v_work_order_attachments')
    .select('*')
    .eq('id', attachmentId)
    .limit(1);

  if (error) {
    throw new Error(formatPostgrestError('Failed to get attachment', error));
  }

  if (!data || data.length === 0) {
    throw new Error(`Attachment ${attachmentId} not found`);
  }

  return data[0];
}

/**
 * Get maintenance types for a tenant (via public view).
 */
export async function getMaintenanceTypes(
  client: SupabaseClient,
  tenantId: string
): Promise<any[]> {
  await setTenantContext(client, tenantId);
  
  const { data, error } = await client
    .from('v_maintenance_type_catalogs')
    .select('*')
    .order('category', { ascending: true })
    .order('display_order', { ascending: true });

  if (error) {
    throw new Error(formatPostgrestError('Failed to get maintenance types', error));
  }

  return data || [];
}

/**
 * Create a custom maintenance type (requires tenant.admin permission).
 */
export async function createTestMaintenanceType(
  client: SupabaseClient,
  tenantId: string,
  category: string,
  key: string,
  name: string,
  description?: string,
  displayOrder?: number
): Promise<string> {
  const { data, error } = await client.rpc('rpc_create_maintenance_type', {
    p_tenant_id: tenantId,
    p_category: category,
    p_key: key,
    p_name: name,
    p_description: description || null,
    p_display_order: displayOrder || null,
    p_color: null,
    p_icon: null,
  });

  if (error) {
    throw new Error(formatPostgrestError('Failed to create maintenance type', error));
  }

  return data as string;
}

/**
 * Create a test meter via RPC.
 */
export async function createTestMeter(
  client: SupabaseClient,
  tenantId: string,
  assetId: string,
  meterType: string = 'runtime_hours',
  name?: string,
  unit?: string,
  currentReading: number = 0,
  readingDirection: string = 'increasing',
  decimalPlaces: number = 0,
  description?: string
): Promise<string> {
  const finalName = name ?? `Meter ${Date.now()}`;
  const finalUnit = unit ?? 'hours';

  const { data, error } = await client.rpc('rpc_create_meter', {
    p_tenant_id: tenantId,
    p_asset_id: assetId,
    p_meter_type: meterType,
    p_name: finalName,
    p_unit: finalUnit,
    p_current_reading: currentReading,
    p_reading_direction: readingDirection,
    p_decimal_places: decimalPlaces,
    p_description: description || null,
  });

  if (error) {
    throw new Error(formatPostgrestError('Failed to create meter', error));
  }

  return data as string;
}

/**
 * Record a meter reading via RPC.
 */
export async function createTestMeterReading(
  client: SupabaseClient,
  tenantId: string,
  meterId: string,
  readingValue: number,
  readingDate?: Date,
  readingType: string = 'manual',
  notes?: string
): Promise<string> {
  const { data, error } = await client.rpc('rpc_record_meter_reading', {
    p_tenant_id: tenantId,
    p_meter_id: meterId,
    p_reading_value: readingValue,
    p_reading_date: readingDate?.toISOString() || null,
    p_reading_type: readingType,
    p_notes: notes || null,
  });

  if (error) {
    throw new Error(formatPostgrestError('Failed to record meter reading', error));
  }

  return data as string;
}

/**
 * Get meter by ID (via public view).
 * Requires tenant context to be set before calling.
 */
export async function getMeter(
  client: SupabaseClient,
  meterId: string,
  tenantId?: string
): Promise<any> {
  // Set tenant context if provided
  if (tenantId) {
    await setTenantContext(client, tenantId);
  }

  // Use .limit(1) instead of .single() because PostgREST can't infer primary keys from views
  const { data, error } = await client
    .from('v_asset_meters')
    .select('*')
    .eq('id', meterId)
    .limit(1);

  if (error) {
    throw new Error(formatPostgrestError('Failed to get meter', error));
  }

  if (!data || data.length === 0) {
    throw new Error(`Meter ${meterId} not found`);
  }

  return data[0];
}

/**
 * Create a test PM template via RPC.
 */
export async function createTestPmTemplate(
  client: SupabaseClient,
  tenantId: string,
  name: string,
  triggerType: string,
  triggerConfig: any,
  description?: string,
  woTitle?: string,
  woDescription?: string,
  woPriority?: string,
  woEstimatedHours?: number,
  checklistItems?: Array<{ description: string; required?: boolean }>
): Promise<string> {
  const { data, error } = await client.rpc('rpc_create_pm_template', {
    p_tenant_id: tenantId,
    p_name: name,
    p_trigger_type: triggerType,
    p_trigger_config: triggerConfig,
    p_description: description || null,
    p_wo_title: woTitle || null,
    p_wo_description: woDescription || null,
    p_wo_priority: woPriority || null,
    p_wo_estimated_hours: woEstimatedHours || null,
    p_checklist_items: checklistItems || null,
  });

  if (error) {
    throw new Error(formatPostgrestError('Failed to create PM template', error));
  }

  return data as string;
}

/**
 * Create a test PM schedule via RPC.
 */
export async function createTestPmSchedule(
  client: SupabaseClient,
  tenantId: string,
  assetId: string,
  title: string,
  triggerType: string,
  triggerConfig: any,
  description?: string,
  templateId?: string,
  woTitle?: string,
  woDescription?: string,
  woPriority?: string,
  woEstimatedHours?: number,
  autoGenerate: boolean = true
): Promise<string> {
  const { data, error } = await client.rpc('rpc_create_pm_schedule', {
    p_tenant_id: tenantId,
    p_asset_id: assetId,
    p_title: title,
    p_trigger_type: triggerType,
    p_trigger_config: triggerConfig,
    p_description: description || null,
    p_template_id: templateId || null,
    p_auto_generate: autoGenerate,
    p_estimated_hours: null, // Explicitly pass for backward compatibility
    p_wo_title: woTitle || null,
    p_wo_description: woDescription || null,
    p_wo_priority: woPriority || null,
    p_wo_estimated_hours: woEstimatedHours || null,
  });

  if (error) {
    throw new Error(formatPostgrestError('Failed to create PM schedule', error));
  }

  return data as string;
}

/**
 * Create a test PM dependency via RPC.
 */
export async function createTestPmDependency(
  client: SupabaseClient,
  tenantId: string,
  pmScheduleId: string,
  dependsOnPmId: string,
  dependencyType: string = 'after'
): Promise<string> {
  const { data, error } = await client.rpc('rpc_create_pm_dependency', {
    p_tenant_id: tenantId,
    p_pm_schedule_id: pmScheduleId,
    p_depends_on_pm_id: dependsOnPmId,
    p_dependency_type: dependencyType,
  });

  if (error) {
    throw new Error(formatPostgrestError('Failed to create PM dependency', error));
  }

  return data as string;
}

/**
 * Get PM template by ID (via public view).
 * Requires tenant context to be set before calling.
 */
export async function getPmTemplate(
  client: SupabaseClient,
  templateId: string,
  tenantId?: string
): Promise<any> {
  // Set tenant context if provided
  if (tenantId) {
    await setTenantContext(client, tenantId);
  }

  // Use .limit(1) instead of .single() because PostgREST can't infer primary keys from views
  const { data, error } = await client
    .from('v_pm_templates')
    .select('*')
    .eq('id', templateId)
    .limit(1);

  if (error) {
    throw new Error(formatPostgrestError('Failed to get PM template', error));
  }

  if (!data || data.length === 0) {
    throw new Error(`PM template ${templateId} not found`);
  }

  return data[0];
}

/**
 * Get PM schedule by ID (via public view).
 * Requires tenant context to be set before calling.
 */
export async function getPmSchedule(
  client: SupabaseClient,
  pmScheduleId: string,
  tenantId?: string
): Promise<any> {
  // Set tenant context if provided
  if (tenantId) {
    await setTenantContext(client, tenantId);
  }

  // Use .limit(1) instead of .maybeSingle() because PostgREST can't infer primary keys from views
  const { data, error } = await client
    .from('v_pm_schedules')
    .select('*')
    .eq('id', pmScheduleId)
    .limit(1);

  if (error) {
    throw new Error(formatPostgrestError('Failed to get PM schedule', error));
  }

  if (!data || data.length === 0) {
    throw new Error(`PM schedule ${pmScheduleId} not found`);
  }

  return data[0];
}
