import type { SdkOperationDef } from './types.js';

/**
 * SDK invoke operations that are primarily for vector similarity against stored embeddings.
 * When MCP embed-search is not configured (no WORKORDER_SYSTEMS_EMBED_SEARCH_URL), these are
 * hidden from sdk_catalog so agents use entity_search / lists instead. tenant.admin bypass
 * runs before this filter so admins still see these operations.
 */
export const SDK_OPS_REQUIRING_EMBEDDING_EDGE = new Set<string>([
  'semantic_search.similar_past_work_orders',
  'semantic_search.similar_past_by_work_order',
  'semantic_search.similar_assets',
  'semantic_search.similar_parts',
]);

/** Listed even when no tenant id is present in the session (authenticated user). */
export const GLOBAL_SDK_CATALOG_OPERATIONS = new Set<string>([
  'tenants.list',
  'tenant_context.set',
  'tenant_context.clear',
]);

const TENANT_ADMIN = 'tenant.admin';

function isWrite(def: SdkOperationDef): boolean {
  return def.annotations.readOnlyHint !== true;
}

/**
 * For write operations: permission keys (any-of) required to include the op in sdk_catalog.
 * `null` means any tenant member (RLS / RPC membership only, or unknown gate — invoke may still deny).
 */
export function getWritePermissionGate(operationId: string): readonly string[] | null {
  if (WRITE_GATE_EXACT[operationId]) {
    return WRITE_GATE_EXACT[operationId];
  }

  const dot = operationId.indexOf('.');
  if (dot < 0) {
    return [TENANT_ADMIN];
  }
  const ns = operationId.slice(0, dot);
  const rest = operationId.slice(dot + 1);

  if (ns === 'tenant_context') {
    return null;
  }

  if (ns === 'tenants') {
    if (rest === 'create') {
      return [TENANT_ADMIN];
    }
    if (rest === 'invite_user') {
      return ['tenant.member.invite'];
    }
    if (rest === 'assign_role') {
      return ['tenant.role.manage'];
    }
    if (rest === 'remove_member') {
      return ['tenant.member.remove'];
    }
    return null;
  }

  if (ns === 'authorization') {
    if (rest === 'assign_permission_to_role' || rest === 'revoke_permission_from_role') {
      return ['tenant.role.manage'];
    }
    if (rest === 'grant_scope' || rest === 'revoke_scope') {
      return ['tenant.role.manage'];
    }
    return null;
  }

  if (ns === 'plugins') {
    if (
      rest === 'install' ||
      rest === 'uninstall' ||
      rest === 'update_installation' ||
      rest === 'process_deliveries' ||
      rest.includes('webhook')
    ) {
      return [TENANT_ADMIN];
    }
    return null;
  }

  if (ns === 'tenant_api_keys') {
    if (rest === 'create' || rest === 'revoke') {
      return [TENANT_ADMIN];
    }
    return null;
  }

  if (ns === 'catalogs' && rest.startsWith('create')) {
    return ['tenant.role.manage'];
  }

  if (ns === 'work_orders') {
    if (rest === 'create' || rest === 'bulk_import' || rest === 'convert_maintenance_request_to_work_order') {
      return ['workorder.create'];
    }
    if (rest.includes('create_request') || rest === 'create_maintenance_request') {
      return ['workorder.create'];
    }
    if (rest === 'complete') {
      return ['workorder.complete.any', 'workorder.complete.assigned'];
    }
    if (rest === 'transition_status') {
      return ['workorder.edit', 'workorder.assign', 'workorder.cancel', 'workorder.complete.any', 'workorder.complete.assigned'];
    }
    if (
      rest === 'log_time' ||
      rest.includes('attachment') ||
      rest.includes('sla') ||
      rest.includes('comms') ||
      rest === 'acknowledge'
    ) {
      return ['workorder.edit'];
    }
    return ['workorder.edit'];
  }

  if (ns === 'assets') {
    if (rest === 'create' || rest === 'bulk_import') {
      return ['asset.create'];
    }
    if (rest === 'delete') {
      return ['asset.delete'];
    }
    if (rest === 'update' || rest.includes('warranty') || rest === 'record_downtime') {
      return ['asset.edit'];
    }
    return null;
  }

  if (ns === 'locations') {
    if (rest === 'create' || rest === 'bulk_import') {
      return ['location.create'];
    }
    if (rest === 'delete') {
      return ['location.delete'];
    }
    if (rest === 'update') {
      return ['location.edit'];
    }
    return null;
  }

  if (ns === 'spaces') {
    if (rest === 'create') {
      return ['location.create'];
    }
    if (rest === 'delete') {
      return ['location.delete'];
    }
    if (rest === 'update') {
      return ['location.edit'];
    }
    return null;
  }

  if (ns === 'departments') {
    if (rest === 'create' || rest === 'bulk_import') {
      return ['department.create'];
    }
    if (rest === 'delete') {
      return ['department.delete'];
    }
    if (rest === 'update') {
      return ['department.edit'];
    }
    return null;
  }

  if (ns === 'meters') {
    if (rest === 'create') {
      return ['asset.create'];
    }
    if (rest === 'delete') {
      return ['asset.delete'];
    }
    if (rest === 'update' || rest === 'record_reading') {
      return ['asset.edit'];
    }
    return null;
  }

  if (ns === 'map_zones') {
    if (rest === 'create') {
      return ['location.create'];
    }
    if (rest === 'delete') {
      return ['location.delete'];
    }
    if (rest === 'update') {
      return ['location.edit'];
    }
    return null;
  }

  if (ns === 'projects') {
    if (rest === 'create') {
      return ['project.manage'];
    }
    if (rest === 'delete') {
      return ['project.manage'];
    }
    if (rest === 'update') {
      return ['project.manage'];
    }
    return null;
  }

  if (ns === 'labor') {
    if (
      rest === 'create_crew' ||
      rest === 'update_crew' ||
      rest === 'delete_crew' ||
      rest === 'add_crew_member' ||
      rest === 'remove_crew_member'
    ) {
      return ['labor.crew.manage'];
    }
    if (rest === 'create_technician' || rest === 'update_technician') {
      return ['labor.technician.manage'];
    }
    return null;
  }

  if (ns === 'field_ops') {
    if (rest === 'create_tool' || rest === 'update_tool') {
      return ['tool.manage'];
    }
    if (rest === 'checkout_tool') {
      return ['tool.checkout'];
    }
    if (rest === 'return_tool') {
      return ['tool.return'];
    }
    if (rest === 'acknowledge_shift_handover') {
      return ['shift_handover.acknowledge'];
    }
    if (
      rest === 'create_shift_handover' ||
      rest === 'submit_shift_handover' ||
      rest === 'add_shift_handover_item'
    ) {
      return ['shift_handover.create'];
    }
    return null;
  }

  if (ns === 'parts_inventory') {
    if (rest === 'create_purchase_requisition') {
      return ['purchase_requisition.create'];
    }
    if (
      rest === 'add_purchase_requisition_line' ||
      rest === 'update_purchase_requisition_line' ||
      rest === 'remove_purchase_requisition_line' ||
      rest === 'delete_purchase_requisition'
    ) {
      return ['purchase_requisition.edit'];
    }
    if (rest === 'reserve_parts') {
      return ['inventory.reservation.create'];
    }
    if (rest === 'issue_parts_to_work_order') {
      return ['inventory.usage.record'];
    }
    if (rest === 'receive_purchase_order') {
      return ['purchase_order.receive'];
    }
    if (rest === 'create_purchase_order') {
      return ['purchase_order.create'];
    }
    if (rest === 'create_part') {
      return ['part.create'];
    }
    if (rest === 'update_part') {
      return ['part.edit'];
    }
    if (rest === 'create_supplier') {
      return ['supplier.create'];
    }
    if (rest === 'update_supplier') {
      return ['supplier.edit'];
    }
    if (
      rest === 'create_supplier_contract' ||
      rest === 'update_supplier_contract' ||
      rest === 'add_supplier_contract_rate'
    ) {
      return ['supplier.edit'];
    }
    return null;
  }

  return null;
}

/** Exact gates that do not follow namespace rules. */
const WRITE_GATE_EXACT: Record<string, readonly string[] | null> = {
  'semantic_search.register_entity_alias': [TENANT_ADMIN],
};

export type CatalogFilterContext = {
  tenantId: string | undefined;
  permissionSet: ReadonlySet<string>;
  /** When false, vector-similarity semantic_search ops are omitted from the catalog. */
  embeddingEdgeConfigured: boolean;
};

export function isSdkOperationVisibleInCatalog(
  operationId: string,
  def: SdkOperationDef,
  ctx: CatalogFilterContext
): boolean {
  if (GLOBAL_SDK_CATALOG_OPERATIONS.has(operationId)) {
    return true;
  }

  if (ctx.permissionSet.has(TENANT_ADMIN)) {
    return true;
  }

  if (!ctx.embeddingEdgeConfigured && SDK_OPS_REQUIRING_EMBEDDING_EDGE.has(operationId)) {
    return false;
  }

  if (!ctx.tenantId) {
    return false;
  }

  if (!isWrite(def)) {
    return true;
  }

  const gate = getWritePermissionGate(operationId);
  if (gate === null) {
    return true;
  }
  return gate.some((k) => ctx.permissionSet.has(k));
}
