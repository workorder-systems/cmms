import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.js';
import { normalizeError } from '../errors.js';
import { callRpc } from '../unwrap.js';

/** Part with aggregated stock (v_parts_with_stock). */
export interface PartWithStockRow {
  id: string;
  tenant_id: string;
  part_number: string;
  name: string | null;
  description: string | null;
  unit: string;
  preferred_supplier_id: string | null;
  external_id: string | null;
  reorder_point: number | null;
  min_quantity: number | null;
  max_quantity: number | null;
  lead_time_days: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  total_on_hand: number;
  total_reserved: number;
  available: number;
}

/** Stock by part and location (v_stock_by_location). */
export interface StockByLocationRow {
  tenant_id: string;
  part_id: string;
  inventory_location_id: string;
  quantity: number;
  updated_at: string;
  part_number: string;
  part_name: string | null;
  unit: string;
  location_name: string;
  location_code: string | null;
  location_type: string;
}

/** Part catalog row (v_parts). */
export interface PartRow {
  id: string;
  tenant_id: string;
  part_number: string;
  name: string | null;
  description: string | null;
  unit: string;
  preferred_supplier_id: string | null;
  external_id: string | null;
  reorder_point: number | null;
  min_quantity: number | null;
  max_quantity: number | null;
  lead_time_days: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  barcode?: string | null;
}

/** Lightweight part selector row for search/disambiguation UIs and agents. */
export interface PartSummaryRow {
  id: string;
  name: string | null;
  part_number: string;
  barcode: string | null;
  preferred_supplier_id: string | null;
  updated_at: string;
}

/** Supplier row (v_suppliers). */
export interface SupplierRow {
  id: string;
  tenant_id: string;
  name: string;
  code: string | null;
  external_id: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address_line: string | null;
  created_at: string;
  updated_at: string;
}

/** Supplier contract (v_supplier_contracts). */
export type SupplierContractRow = Database['public']['Views']['v_supplier_contracts'] extends { Row: infer R }
  ? R
  : Record<string, unknown>;

/** Contract rate line (v_supplier_contract_rates). */
export type SupplierContractRateRow = Database['public']['Views']['v_supplier_contract_rates'] extends {
  Row: infer R;
}
  ? R
  : Record<string, unknown>;

/** Aggregated vendor costs by supplier (v_vendor_spend_by_supplier). */
export type VendorSpendBySupplierRow = Database['public']['Views']['v_vendor_spend_by_supplier'] extends {
  Row: infer R;
}
  ? R
  : Record<string, unknown>;

/** Work order counts by primary supplier (v_work_order_counts_by_primary_supplier). */
export type WorkOrderCountsByPrimarySupplierRow =
  Database['public']['Views']['v_work_order_counts_by_primary_supplier'] extends { Row: infer R }
    ? R
    : Record<string, unknown>;

/** Inventory location row (v_inventory_locations). */
export interface InventoryLocationRow {
  id: string;
  tenant_id: string;
  parent_id: string | null;
  location_id: string | null;
  name: string;
  code: string | null;
  type: string;
  created_at: string;
  updated_at: string;
}

/** Stock level row (v_stock_levels). */
export interface StockLevelRow {
  tenant_id: string;
  part_id: string;
  inventory_location_id: string;
  quantity: number;
  updated_at: string;
}

/** Part reservation row (v_part_reservations). */
export interface PartReservationRow {
  id: string;
  tenant_id: string;
  work_order_id: string;
  part_id: string;
  inventory_location_id: string | null;
  quantity: number;
  status: string;
  created_at: string;
  updated_at: string;
}

/** Part usage row (v_part_usage). */
export interface PartUsageRow {
  id: string;
  tenant_id: string;
  work_order_id: string;
  part_id: string;
  inventory_location_id: string | null;
  quantity_used: number;
  used_at: string;
  used_by: string | null;
  created_at: string;
}

/** Open purchase requisition row (v_open_requisitions). */
export interface OpenRequisitionRow {
  id: string;
  tenant_id: string;
  status: string;
  requested_by: string | null;
  requested_at: string;
  due_date: string | null;
  notes: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Open purchase order row (v_open_purchase_orders). */
export interface OpenPurchaseOrderRow {
  id: string;
  tenant_id: string;
  supplier_id: string;
  status: string;
  order_number: string;
  order_date: string;
  expected_delivery_date: string | null;
  external_id: string | null;
  notes: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  external_invoice_id: string | null;
  created_at: string;
  updated_at: string;
  supplier_name: string;
  supplier_code: string | null;
}

/** PO receipt status row (v_purchase_order_receipt_status). */
export interface PurchaseOrderReceiptStatusRow {
  purchase_order_id: string;
  tenant_id: string;
  order_number: string;
  po_status: string;
  purchase_order_line_id: string;
  part_id: string;
  quantity_ordered: number;
  quantity_received: number;
  quantity_balance: number;
  part_number: string;
  part_name: string | null;
}

/** Params for reserve parts RPC. */
export interface ReservePartsParams {
  tenantId: string;
  workOrderId: string;
  partId: string;
  quantity: number;
  inventoryLocationId?: string | null;
}

/** Params for issue parts to work order RPC. */
export interface IssuePartsToWorkOrderParams {
  tenantId: string;
  workOrderId: string;
  partId: string;
  quantity: number;
  inventoryLocationId?: string | null;
}

/** Line for receive purchase order RPC. */
export interface ReceivePurchaseOrderLine {
  purchase_order_line_id: string;
  quantity_received: number;
  to_inventory_location_id?: string | null;
}

/** Params for receive purchase order RPC. */
export interface ReceivePurchaseOrderParams {
  tenantId: string;
  poId: string;
  lines: ReceivePurchaseOrderLine[];
}

/** Line for create purchase order RPC. */
export interface CreatePurchaseOrderLine {
  part_id: string;
  quantity_ordered: number;
  unit_price?: number | null;
}

/** Params for create purchase order RPC. */
export interface CreatePurchaseOrderParams {
  tenantId: string;
  supplierId: string;
  orderNumber: string;
  orderDate?: string | null;
  expectedDeliveryDate?: string | null;
  externalId?: string | null;
  notes?: string | null;
  lines?: CreatePurchaseOrderLine[];
}

/** Params for create purchase requisition RPC (draft). */
export interface CreatePurchaseRequisitionParams {
  tenantId: string;
  dueDate?: string | null;
  notes?: string | null;
}

/** Params for add purchase requisition line RPC. */
export interface AddPurchaseRequisitionLineParams {
  tenantId: string;
  purchaseRequisitionId: string;
  partId: string;
  quantity: number;
  estimatedUnitCost?: number | null;
  notes?: string | null;
}

/** Params for update purchase requisition line RPC. */
export interface UpdatePurchaseRequisitionLineParams {
  tenantId: string;
  lineId: string;
  quantity?: number | null;
  estimatedUnitCost?: number | null;
  notes?: string | null;
}

/** Params for create part RPC. */
export interface CreatePartParams {
  tenantId: string;
  partNumber: string;
  name?: string | null;
  description?: string | null;
  unit?: string;
  preferredSupplierId?: string | null;
  externalId?: string | null;
  /** Optional scannable id (unique per tenant when set). */
  barcode?: string | null;
  reorderPoint?: number | null;
  minQuantity?: number | null;
  maxQuantity?: number | null;
  leadTimeDays?: number | null;
}

/** Params for update part RPC. */
export interface UpdatePartParams {
  tenantId: string;
  partId: string;
  partNumber?: string | null;
  name?: string | null;
  description?: string | null;
  unit?: string | null;
  preferredSupplierId?: string | null;
  externalId?: string | null;
  /** Set to empty string to clear barcode; omit or null to leave unchanged. */
  barcode?: string | null;
  reorderPoint?: number | null;
  minQuantity?: number | null;
  maxQuantity?: number | null;
  leadTimeDays?: number | null;
  isActive?: boolean | null;
}

/** Params for create supplier RPC. */
export interface CreateSupplierParams {
  tenantId: string;
  name: string;
  code?: string | null;
  externalId?: string | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  addressLine?: string | null;
}

/** Params for update supplier RPC. */
export interface UpdateSupplierParams {
  tenantId: string;
  supplierId: string;
  name?: string | null;
  code?: string | null;
  externalId?: string | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  addressLine?: string | null;
}

/** Create a supplier contract. Requires `supplier.edit`. Returns contract id. */
export interface CreateSupplierContractParams {
  tenantId: string;
  supplierId: string;
  /** ISO date `yyyy-mm-dd`. */
  effectiveStart: string;
  effectiveEnd?: string | null;
  contractNumber?: string | null;
  terms?: string | null;
  isActive?: boolean | null;
}

/** Update a supplier contract. Requires `supplier.edit`. */
export interface UpdateSupplierContractParams {
  tenantId: string;
  contractId: string;
  effectiveStart?: string | null;
  effectiveEnd?: string | null;
  contractNumber?: string | null;
  terms?: string | null;
  isActive?: boolean | null;
}

/** Add a rate line to a contract. Requires `supplier.edit`. Returns rate row id. */
export interface AddSupplierContractRateParams {
  tenantId: string;
  contractId: string;
  rateType: string;
  amountCents: number;
  uom?: string | null;
}

const rpc = (supabase: SupabaseClient<Database>) =>
  (supabase as unknown as { rpc: (n: string, p?: object) => Promise<{ data: unknown; error: unknown }> }).rpc.bind(
    supabase
  );

/**
 * Parts and inventory resource: parts catalog, suppliers, stock locations,
 * stock levels, reservations, usage, and purchasing (requisitions, POs, receipts).
 * Set tenant context (client.setTenant) before tenant-scoped operations.
 */
export function createPartsInventoryResource(supabase: SupabaseClient<Database>) {
  return {
    /** Parts with aggregated on-hand, reserved, and available (v_parts_with_stock). */
    async listPartsWithStock(): Promise<PartWithStockRow[]> {
      const { data, error } = await supabase.from('v_parts_with_stock').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as PartWithStockRow[];
    },

    /** Get a single part with stock by id. */
    async getPartWithStockById(id: string): Promise<PartWithStockRow | null> {
      const { data, error } = await supabase.from('v_parts_with_stock').select('*').eq('id', id).maybeSingle();
      if (error) throw normalizeError(error);
      return data as PartWithStockRow | null;
    },

    /** Stock by part and inventory location (v_stock_by_location). */
    async listStockByLocation(): Promise<StockByLocationRow[]> {
      const { data, error } = await supabase.from('v_stock_by_location').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as StockByLocationRow[];
    },

    /** List parts catalog (v_parts). */
    async listParts(): Promise<PartRow[]> {
      const { data, error } = await supabase.from('v_parts').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as PartRow[];
    },

    /** Token-efficient parts summary for selection and disambiguation. */
    async listSummary(limit = 50): Promise<PartSummaryRow[]> {
      const rows = await this.listParts();
      return rows.slice(0, limit).map((row) => ({
        id: row.id,
        name: row.name,
        part_number: row.part_number,
        barcode: row.barcode ?? null,
        preferred_supplier_id: row.preferred_supplier_id,
        updated_at: row.updated_at,
      }));
    },

    /** Get part by id. */
    async getPartById(id: string): Promise<PartRow | null> {
      const { data, error } = await supabase.from('v_parts').select('*').eq('id', id).maybeSingle();
      if (error) throw normalizeError(error);
      return data as PartRow | null;
    },

    /** List suppliers (v_suppliers). */
    async listSuppliers(): Promise<SupplierRow[]> {
      const { data, error } = await supabase.from('v_suppliers').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as SupplierRow[];
    },

    /** Get supplier by id. */
    async getSupplierById(id: string): Promise<SupplierRow | null> {
      const { data, error } = await supabase.from('v_suppliers').select('*').eq('id', id).maybeSingle();
      if (error) throw normalizeError(error);
      return data as SupplierRow | null;
    },

    /** List inventory locations (v_inventory_locations). */
    async listInventoryLocations(): Promise<InventoryLocationRow[]> {
      const { data, error } = await supabase.from('v_inventory_locations').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as InventoryLocationRow[];
    },

    /** List stock levels (v_stock_levels). */
    async listStockLevels(): Promise<StockLevelRow[]> {
      const { data, error } = await supabase.from('v_stock_levels').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as StockLevelRow[];
    },

    /** List part reservations (v_part_reservations). */
    async listPartReservations(): Promise<PartReservationRow[]> {
      const { data, error } = await supabase.from('v_part_reservations').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as PartReservationRow[];
    },

    /** List part reservations for a work order. */
    async listPartReservationsByWorkOrderId(workOrderId: string): Promise<PartReservationRow[]> {
      const { data, error } = await supabase
        .from('v_part_reservations')
        .select('*')
        .eq('work_order_id', workOrderId);
      if (error) throw normalizeError(error);
      return (data ?? []) as PartReservationRow[];
    },

    /** List part usage (v_part_usage). */
    async listPartUsage(): Promise<PartUsageRow[]> {
      const { data, error } = await supabase.from('v_part_usage').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as PartUsageRow[];
    },

    /** List part usage for a work order. */
    async listPartUsageByWorkOrderId(workOrderId: string): Promise<PartUsageRow[]> {
      const { data, error } = await supabase.from('v_part_usage').select('*').eq('work_order_id', workOrderId);
      if (error) throw normalizeError(error);
      return (data ?? []) as PartUsageRow[];
    },

    /** Open purchase requisitions (v_open_requisitions). */
    async listOpenRequisitions(): Promise<OpenRequisitionRow[]> {
      const { data, error } = await supabase.from('v_open_requisitions').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as OpenRequisitionRow[];
    },

    /** Create a draft purchase requisition. Requires purchase_requisition.create. Returns requisition id. */
    async createPurchaseRequisition(params: CreatePurchaseRequisitionParams): Promise<string> {
      return callRpc<string>(rpc(supabase), 'rpc_create_purchase_requisition', {
        p_tenant_id: params.tenantId,
        p_due_date: params.dueDate ?? null,
        p_notes: params.notes ?? null,
      });
    },

    /** Add a line to a draft requisition. Requires purchase_requisition.edit. Returns line id. */
    async addPurchaseRequisitionLine(params: AddPurchaseRequisitionLineParams): Promise<string> {
      return callRpc<string>(rpc(supabase), 'rpc_add_purchase_requisition_line', {
        p_tenant_id: params.tenantId,
        p_purchase_requisition_id: params.purchaseRequisitionId,
        p_part_id: params.partId,
        p_quantity: params.quantity,
        p_estimated_unit_cost: params.estimatedUnitCost ?? null,
        p_notes: params.notes ?? null,
      });
    },

    /** Update a requisition line (draft only). Requires purchase_requisition.edit. */
    async updatePurchaseRequisitionLine(params: UpdatePurchaseRequisitionLineParams): Promise<void> {
      return callRpc<void>(rpc(supabase), 'rpc_update_purchase_requisition_line', {
        p_tenant_id: params.tenantId,
        p_line_id: params.lineId,
        p_quantity: params.quantity ?? null,
        p_estimated_unit_cost: params.estimatedUnitCost ?? null,
        p_notes: params.notes ?? null,
      });
    },

    /** Remove a line from a draft requisition. Requires purchase_requisition.edit. */
    async removePurchaseRequisitionLine(tenantId: string, lineId: string): Promise<void> {
      return callRpc<void>(rpc(supabase), 'rpc_remove_purchase_requisition_line', {
        p_tenant_id: tenantId,
        p_line_id: lineId,
      });
    },

    /** Delete a draft requisition (and lines). Requires purchase_requisition.edit. */
    async deletePurchaseRequisition(tenantId: string, purchaseRequisitionId: string): Promise<void> {
      return callRpc<void>(rpc(supabase), 'rpc_delete_purchase_requisition', {
        p_tenant_id: tenantId,
        p_purchase_requisition_id: purchaseRequisitionId,
      });
    },

    /** Open purchase orders (v_open_purchase_orders). */
    async listOpenPurchaseOrders(): Promise<OpenPurchaseOrderRow[]> {
      const { data, error } = await supabase.from('v_open_purchase_orders').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as OpenPurchaseOrderRow[];
    },

    /** PO receipt status (v_purchase_order_receipt_status). */
    async listPurchaseOrderReceiptStatus(): Promise<PurchaseOrderReceiptStatusRow[]> {
      const { data, error } = await supabase.from('v_purchase_order_receipt_status').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as PurchaseOrderReceiptStatusRow[];
    },

    /** Receipt status for a single PO. */
    async listPurchaseOrderReceiptStatusByPoId(poId: string): Promise<PurchaseOrderReceiptStatusRow[]> {
      const { data, error } = await supabase
        .from('v_purchase_order_receipt_status')
        .select('*')
        .eq('purchase_order_id', poId);
      if (error) throw normalizeError(error);
      return (data ?? []) as PurchaseOrderReceiptStatusRow[];
    },

    /** Reserve parts for a work order. Returns reservation id. */
    async reserveParts(params: ReservePartsParams): Promise<string> {
      return callRpc<string>(rpc(supabase), 'rpc_reserve_parts', {
        p_tenant_id: params.tenantId,
        p_work_order_id: params.workOrderId,
        p_part_id: params.partId,
        p_quantity: params.quantity,
        p_inventory_location_id: params.inventoryLocationId ?? null,
      });
    },

    /** Issue parts to a work order (decrements stock, records usage). Returns part_usage id. */
    async issuePartsToWorkOrder(params: IssuePartsToWorkOrderParams): Promise<string> {
      return callRpc<string>(rpc(supabase), 'rpc_issue_parts_to_work_order', {
        p_tenant_id: params.tenantId,
        p_work_order_id: params.workOrderId,
        p_part_id: params.partId,
        p_quantity: params.quantity,
        p_inventory_location_id: params.inventoryLocationId ?? null,
      });
    },

    /** Receive a purchase order (create receipt, update PO lines and stock). Returns receipt id. */
    async receivePurchaseOrder(params: ReceivePurchaseOrderParams): Promise<string> {
      const lines = params.lines.map((l) => ({
        purchase_order_line_id: l.purchase_order_line_id,
        quantity_received: l.quantity_received,
        to_inventory_location_id: l.to_inventory_location_id ?? null,
      }));
      return callRpc<string>(rpc(supabase), 'rpc_receive_purchase_order', {
        p_tenant_id: params.tenantId,
        p_po_id: params.poId,
        p_lines: lines,
      });
    },

    /** Create a purchase order. Returns PO id. */
    async createPurchaseOrder(params: CreatePurchaseOrderParams): Promise<string> {
      const lines = (params.lines ?? []).map((l) => ({
        part_id: l.part_id,
        quantity_ordered: l.quantity_ordered,
        unit_price: l.unit_price ?? null,
      }));
      return callRpc<string>(rpc(supabase), 'rpc_create_purchase_order', {
        p_tenant_id: params.tenantId,
        p_supplier_id: params.supplierId,
        p_order_number: params.orderNumber,
        p_order_date: params.orderDate ?? null,
        p_expected_delivery_date: params.expectedDeliveryDate ?? null,
        p_external_id: params.externalId ?? null,
        p_notes: params.notes ?? null,
        p_lines: lines,
      });
    },

    /** Create a part. Returns part id. */
    async createPart(params: CreatePartParams): Promise<string> {
      return callRpc<string>(rpc(supabase), 'rpc_create_part', {
        p_tenant_id: params.tenantId,
        p_part_number: params.partNumber,
        p_name: params.name ?? null,
        p_description: params.description ?? null,
        p_unit: params.unit ?? 'each',
        p_preferred_supplier_id: params.preferredSupplierId ?? null,
        p_external_id: params.externalId ?? null,
        p_reorder_point: params.reorderPoint ?? null,
        p_min_quantity: params.minQuantity ?? null,
        p_max_quantity: params.maxQuantity ?? null,
        p_lead_time_days: params.leadTimeDays ?? null,
        p_barcode: params.barcode ?? null,
      });
    },

    /** Update a part. */
    async updatePart(params: UpdatePartParams): Promise<void> {
      await callRpc(rpc(supabase), 'rpc_update_part', {
        p_tenant_id: params.tenantId,
        p_part_id: params.partId,
        p_part_number: params.partNumber ?? null,
        p_name: params.name ?? null,
        p_description: params.description ?? null,
        p_unit: params.unit ?? null,
        p_preferred_supplier_id: params.preferredSupplierId ?? null,
        p_external_id: params.externalId ?? null,
        p_reorder_point: params.reorderPoint ?? null,
        p_min_quantity: params.minQuantity ?? null,
        p_max_quantity: params.maxQuantity ?? null,
        p_lead_time_days: params.leadTimeDays ?? null,
        p_is_active: params.isActive ?? null,
        p_barcode: params.barcode !== undefined ? params.barcode : null,
      });
    },

    /**
     * Resolve a scanned code to a part id (barcode, then part_number, then external_id). Requires `part.view`.
     * Returns null if not found.
     */
    async resolvePartByScanCode(tenantId: string, code: string): Promise<string | null> {
      const id = await callRpc<string | null>(rpc(supabase), 'rpc_resolve_part_by_scan_code', {
        p_tenant_id: tenantId,
        p_code: code,
      });
      return id;
    },

    /** Create a supplier. Returns supplier id. */
    async createSupplier(params: CreateSupplierParams): Promise<string> {
      return callRpc<string>(rpc(supabase), 'rpc_create_supplier', {
        p_tenant_id: params.tenantId,
        p_name: params.name,
        p_code: params.code ?? null,
        p_external_id: params.externalId ?? null,
        p_contact_name: params.contactName ?? null,
        p_email: params.email ?? null,
        p_phone: params.phone ?? null,
        p_address_line: params.addressLine ?? null,
      });
    },

    /** Update a supplier. */
    async updateSupplier(params: UpdateSupplierParams): Promise<void> {
      return callRpc<void>(rpc(supabase), 'rpc_update_supplier', {
        p_tenant_id: params.tenantId,
        p_supplier_id: params.supplierId,
        p_name: params.name ?? null,
        p_code: params.code ?? null,
        p_external_id: params.externalId ?? null,
        p_contact_name: params.contactName ?? null,
        p_email: params.email ?? null,
        p_phone: params.phone ?? null,
        p_address_line: params.addressLine ?? null,
      });
    },

    /** List supplier contracts (`v_supplier_contracts`). */
    async listSupplierContracts(): Promise<SupplierContractRow[]> {
      const { data, error } = await supabase.from('v_supplier_contracts').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as SupplierContractRow[];
    },

    /** Contract rates for the tenant (`v_supplier_contract_rates`), optionally filtered by contract. */
    async listSupplierContractRates(contractId?: string): Promise<SupplierContractRateRow[]> {
      let q = supabase.from('v_supplier_contract_rates').select('*');
      if (contractId) q = q.eq('contract_id', contractId);
      const { data, error } = await q;
      if (error) throw normalizeError(error);
      return (data ?? []) as SupplierContractRateRow[];
    },

    /** Vendor spend roll-up from work order vendor cost lines (`v_vendor_spend_by_supplier`). */
    async listVendorSpendBySupplier(): Promise<VendorSpendBySupplierRow[]> {
      const { data, error } = await supabase.from('v_vendor_spend_by_supplier').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as VendorSpendBySupplierRow[];
    },

    /** Work order counts by primary supplier assignment (`v_work_order_counts_by_primary_supplier`). */
    async listWorkOrderCountsByPrimarySupplier(): Promise<WorkOrderCountsByPrimarySupplierRow[]> {
      const { data, error } = await supabase.from('v_work_order_counts_by_primary_supplier').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as WorkOrderCountsByPrimarySupplierRow[];
    },

    /** Create a supplier contract. Returns contract id. */
    async createSupplierContract(params: CreateSupplierContractParams): Promise<string> {
      return callRpc<string>(rpc(supabase), 'rpc_create_supplier_contract', {
        p_tenant_id: params.tenantId,
        p_supplier_id: params.supplierId,
        p_effective_start: params.effectiveStart,
        p_effective_end: params.effectiveEnd ?? null,
        p_contract_number: params.contractNumber ?? null,
        p_terms: params.terms ?? null,
        p_is_active: params.isActive ?? null,
      });
    },

    /** Update a supplier contract. */
    async updateSupplierContract(params: UpdateSupplierContractParams): Promise<void> {
      return callRpc<void>(rpc(supabase), 'rpc_update_supplier_contract', {
        p_tenant_id: params.tenantId,
        p_contract_id: params.contractId,
        p_effective_start: params.effectiveStart ?? null,
        p_effective_end: params.effectiveEnd ?? null,
        p_contract_number: params.contractNumber ?? null,
        p_terms: params.terms ?? null,
        p_is_active: params.isActive ?? null,
      });
    },

    /** Add a rate line to a contract. Returns rate id. */
    async addSupplierContractRate(params: AddSupplierContractRateParams): Promise<number> {
      return callRpc<number>(rpc(supabase), 'rpc_add_supplier_contract_rate', {
        p_tenant_id: params.tenantId,
        p_contract_id: params.contractId,
        p_rate_type: params.rateType,
        p_amount_cents: params.amountCents,
        p_uom: params.uom ?? null,
      });
    },
  };
}

export type PartsInventoryResource = ReturnType<typeof createPartsInventoryResource>;
