import { SupabaseClient } from '@supabase/supabase-js';
import {
  makeAssetName,
  makeAssetNumber,
  makeDepartmentName,
  makeLocationName,
  makeWorkOrderTitle,
} from './faker';
import { setTenantContext } from './tenant';

/**
 * Create a test location via public RPC.
 * If name is not provided, a realistic site/building name is generated.
 */
export async function createTestLocation(
  client: SupabaseClient,
  tenantId: string,
  name?: string,
  parentId?: string
): Promise<string> {
  const finalName = name ?? makeLocationName();

  const { data, error } = await client.rpc('rpc_create_location', {
    p_tenant_id: tenantId,
    p_name: finalName,
    p_parent_location_id: parentId || null,
  });

  if (error) {
    throw new Error(`Failed to create location: ${error.message}`);
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
    throw new Error(`Failed to create department: ${error.message}`);
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
    throw new Error(`Failed to create asset: ${error.message}`);
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
  dueDate?: Date
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
  });

  if (error) {
    throw new Error(`Failed to create work order: ${error.message}`);
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
 */
export async function getWorkOrder(
  client: SupabaseClient,
  workOrderId: string
): Promise<any> {
  const { data, error } = await client
    .from('v_work_orders')
    .select('*')
    .eq('id', workOrderId)
    .single();

  if (error) {
    throw new Error(`Failed to get work order: ${error.message}`);
  }

  return data;
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
  const { data: wo, error: queryError } = await client
    .from('v_work_orders')
    .select('status')
    .eq('id', workOrderId)
    .single();

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
    throw new Error(`Failed to transition work order: ${error.message || JSON.stringify(error)}`);
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
    throw new Error(`Failed to create time entry: ${error.message}`);
  }

  return data as string;
}

/**
 * Get time entry by ID (via public view).
 */
export async function getTimeEntry(
  client: SupabaseClient,
  timeEntryId: string
): Promise<any> {
  const { data, error } = await client
    .from('v_work_order_time_entries')
    .select('*')
    .eq('id', timeEntryId)
    .single();

  if (error) {
    throw new Error(`Failed to get time entry: ${error.message}`);
  }

  return data;
}

/**
 * Create a test attachment for a work order.
 */
export async function createTestAttachment(
  client: SupabaseClient,
  tenantId: string,
  workOrderId: string,
  fileRef: string,
  label?: string,
  kind?: string
): Promise<string> {
  const { data, error } = await client.rpc('rpc_add_work_order_attachment', {
    p_tenant_id: tenantId,
    p_work_order_id: workOrderId,
    p_file_ref: fileRef,
    p_label: label || null,
    p_kind: kind || null,
  });

  if (error) {
    throw new Error(`Failed to create attachment: ${error.message}`);
  }

  return data as string;
}

/**
 * Get attachment by ID (via public view).
 */
export async function getAttachment(
  client: SupabaseClient,
  attachmentId: string
): Promise<any> {
  const { data, error } = await client
    .from('v_work_order_attachments')
    .select('*')
    .eq('id', attachmentId)
    .single();

  if (error) {
    throw new Error(`Failed to get attachment: ${error.message}`);
  }

  return data;
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
    throw new Error(`Failed to get maintenance types: ${error.message}`);
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
    throw new Error(`Failed to create maintenance type: ${error.message}`);
  }

  return data as string;
}
