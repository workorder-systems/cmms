import { SupabaseClient } from '@supabase/supabase-js';
import {
  makeAssetName,
  makeAssetNumber,
  makeDepartmentName,
  makeLocationName,
  makeWorkOrderTitle,
} from './faker';

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
  const { error } = await client.rpc('rpc_transition_work_order_status', {
    p_tenant_id: tenantId,
    p_work_order_id: workOrderId,
    p_to_status_key: toStatus,
  });

  if (error) {
    throw new Error(`Failed to transition work order: ${error.message}`);
  }
}
