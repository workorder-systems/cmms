import { SupabaseClient } from '@supabase/supabase-js';
import {
  makeAssetName,
  makeAssetNumber,
  makeDepartmentName,
  makeLocationName,
  makeWorkOrderTitle,
} from './faker';

/**
 * Create a test location.
 * If name is not provided, a realistic site/building name is generated.
 */
export async function createTestLocation(
  client: SupabaseClient,
  tenantId: string,
  name?: string,
  parentId?: string
): Promise<string> {
  const finalName = name ?? makeLocationName();

  // Use service role client to access app schema directly
  // Note: client should be service role client for direct table access
  const { data, error } = await client
    .schema('app')
    .from('locations')
    .insert({
      tenant_id: tenantId,
      name: finalName,
      parent_location_id: parentId || null,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create location: ${error.message}`);
  }

  return data.id;
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
 * Create a test department via direct insert (bypasses RLS using service role client).
 *
 * Use this for test setup when you don't want to exercise the RPC permission checks.
 */
export async function createTestDepartmentDirect(
  serviceClient: SupabaseClient,
  tenantId: string,
  name?: string,
  code?: string
): Promise<string> {
  const finalName = name ?? makeDepartmentName();

  const { data, error } = await serviceClient
    .schema('app')
    .from('departments')
    .insert({
      tenant_id: tenantId,
      name: finalName,
      code: code || null,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create department (direct): ${error.message}`);
  }

  return data.id;
}

/**
 * Create a test asset.
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

  // Use service role client to access app schema directly
  // Note: client should be service role client for direct table access
  const { data, error } = await client
    .schema('app')
    .from('assets')
    .insert({
      tenant_id: tenantId,
      name: finalName,
      location_id: locationId || null,
      department_id: departmentId || null,
      asset_number: finalAssetNumber,
      status,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create asset: ${error.message}`);
  }

  return data.id;
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
 * Create a test work order via direct insert (bypasses RLS using service role client).
 *
 * Use this for test setup when you don't want to exercise the RPC permission + rate-limiting guards.
 */
export async function createTestWorkOrderDirect(
  serviceClient: SupabaseClient,
  tenantId: string,
  title?: string,
  description?: string,
  priority: string = 'medium',
  status: string = 'draft',
  assignedTo?: string,
  locationId?: string,
  assetId?: string,
  dueDate?: Date
): Promise<string> {
  const finalTitle = title ?? makeWorkOrderTitle();

  const { data, error } = await serviceClient
    .schema('app')
    .from('work_orders')
    .insert({
      tenant_id: tenantId,
      title: finalTitle,
      description: description || null,
      priority,
      status,
      assigned_to: assignedTo || null,
      location_id: locationId || null,
      asset_id: assetId || null,
      due_date: dueDate?.toISOString() || null,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create work order (direct): ${error.message}`);
  }

  return data.id;
}

/**
 * Get work order by ID
 */
export async function getWorkOrder(
  client: SupabaseClient,
  workOrderId: string
): Promise<any> {
  // Use service role client to access app schema directly
  // Note: client should be service role client for direct table access
  const { data, error } = await client
    .schema('app')
    .from('work_orders')
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
