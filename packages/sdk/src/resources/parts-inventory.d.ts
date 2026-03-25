import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.js';
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
export type SupplierContractRow = Database['public']['Views']['v_supplier_contracts'] extends {
    Row: infer R;
} ? R : Record<string, unknown>;
/** Contract rate line (v_supplier_contract_rates). */
export type SupplierContractRateRow = Database['public']['Views']['v_supplier_contract_rates'] extends {
    Row: infer R;
} ? R : Record<string, unknown>;
/** Aggregated vendor costs by supplier (v_vendor_spend_by_supplier). */
export type VendorSpendBySupplierRow = Database['public']['Views']['v_vendor_spend_by_supplier'] extends {
    Row: infer R;
} ? R : Record<string, unknown>;
/** Work order counts by primary supplier (v_work_order_counts_by_primary_supplier). */
export type WorkOrderCountsByPrimarySupplierRow = Database['public']['Views']['v_work_order_counts_by_primary_supplier'] extends {
    Row: infer R;
} ? R : Record<string, unknown>;
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
/**
 * Parts and inventory resource: parts catalog, suppliers, stock locations,
 * stock levels, reservations, usage, and purchasing (requisitions, POs, receipts).
 * Set tenant context (client.setTenant) before tenant-scoped operations.
 */
export declare function createPartsInventoryResource(supabase: SupabaseClient<Database>): {
    /** Parts with aggregated on-hand, reserved, and available (v_parts_with_stock). */
    listPartsWithStock(): Promise<PartWithStockRow[]>;
    /** Get a single part with stock by id. */
    getPartWithStockById(id: string): Promise<PartWithStockRow | null>;
    /** Stock by part and inventory location (v_stock_by_location). */
    listStockByLocation(): Promise<StockByLocationRow[]>;
    /** List parts catalog (v_parts). */
    listParts(): Promise<PartRow[]>;
    /** Get part by id. */
    getPartById(id: string): Promise<PartRow | null>;
    /** List suppliers (v_suppliers). */
    listSuppliers(): Promise<SupplierRow[]>;
    /** Get supplier by id. */
    getSupplierById(id: string): Promise<SupplierRow | null>;
    /** List inventory locations (v_inventory_locations). */
    listInventoryLocations(): Promise<InventoryLocationRow[]>;
    /** List stock levels (v_stock_levels). */
    listStockLevels(): Promise<StockLevelRow[]>;
    /** List part reservations (v_part_reservations). */
    listPartReservations(): Promise<PartReservationRow[]>;
    /** List part reservations for a work order. */
    listPartReservationsByWorkOrderId(workOrderId: string): Promise<PartReservationRow[]>;
    /** List part usage (v_part_usage). */
    listPartUsage(): Promise<PartUsageRow[]>;
    /** List part usage for a work order. */
    listPartUsageByWorkOrderId(workOrderId: string): Promise<PartUsageRow[]>;
    /** Open purchase requisitions (v_open_requisitions). */
    listOpenRequisitions(): Promise<OpenRequisitionRow[]>;
    /** Create a draft purchase requisition. Requires purchase_requisition.create. Returns requisition id. */
    createPurchaseRequisition(params: CreatePurchaseRequisitionParams): Promise<string>;
    /** Add a line to a draft requisition. Requires purchase_requisition.edit. Returns line id. */
    addPurchaseRequisitionLine(params: AddPurchaseRequisitionLineParams): Promise<string>;
    /** Update a requisition line (draft only). Requires purchase_requisition.edit. */
    updatePurchaseRequisitionLine(params: UpdatePurchaseRequisitionLineParams): Promise<void>;
    /** Remove a line from a draft requisition. Requires purchase_requisition.edit. */
    removePurchaseRequisitionLine(tenantId: string, lineId: string): Promise<void>;
    /** Delete a draft requisition (and lines). Requires purchase_requisition.edit. */
    deletePurchaseRequisition(tenantId: string, purchaseRequisitionId: string): Promise<void>;
    /** Open purchase orders (v_open_purchase_orders). */
    listOpenPurchaseOrders(): Promise<OpenPurchaseOrderRow[]>;
    /** PO receipt status (v_purchase_order_receipt_status). */
    listPurchaseOrderReceiptStatus(): Promise<PurchaseOrderReceiptStatusRow[]>;
    /** Receipt status for a single PO. */
    listPurchaseOrderReceiptStatusByPoId(poId: string): Promise<PurchaseOrderReceiptStatusRow[]>;
    /** Reserve parts for a work order. Returns reservation id. */
    reserveParts(params: ReservePartsParams): Promise<string>;
    /** Issue parts to a work order (decrements stock, records usage). Returns part_usage id. */
    issuePartsToWorkOrder(params: IssuePartsToWorkOrderParams): Promise<string>;
    /** Receive a purchase order (create receipt, update PO lines and stock). Returns receipt id. */
    receivePurchaseOrder(params: ReceivePurchaseOrderParams): Promise<string>;
    /** Create a purchase order. Returns PO id. */
    createPurchaseOrder(params: CreatePurchaseOrderParams): Promise<string>;
    /** Create a part. Returns part id. */
    createPart(params: CreatePartParams): Promise<string>;
    /** Update a part. */
    updatePart(params: UpdatePartParams): Promise<void>;
    /**
     * Resolve a scanned code to a part id (barcode, then part_number, then external_id). Requires `part.view`.
     * Returns null if not found.
     */
    resolvePartByScanCode(tenantId: string, code: string): Promise<string | null>;
    /** Create a supplier. Returns supplier id. */
    createSupplier(params: CreateSupplierParams): Promise<string>;
    /** Update a supplier. */
    updateSupplier(params: UpdateSupplierParams): Promise<void>;
    /** List supplier contracts (`v_supplier_contracts`). */
    listSupplierContracts(): Promise<SupplierContractRow[]>;
    /** Contract rates for the tenant (`v_supplier_contract_rates`), optionally filtered by contract. */
    listSupplierContractRates(contractId?: string): Promise<SupplierContractRateRow[]>;
    /** Vendor spend roll-up from work order vendor cost lines (`v_vendor_spend_by_supplier`). */
    listVendorSpendBySupplier(): Promise<VendorSpendBySupplierRow[]>;
    /** Work order counts by primary supplier assignment (`v_work_order_counts_by_primary_supplier`). */
    listWorkOrderCountsByPrimarySupplier(): Promise<WorkOrderCountsByPrimarySupplierRow[]>;
    /** Create a supplier contract. Returns contract id. */
    createSupplierContract(params: CreateSupplierContractParams): Promise<string>;
    /** Update a supplier contract. */
    updateSupplierContract(params: UpdateSupplierContractParams): Promise<void>;
    /** Add a rate line to a contract. Returns rate id. */
    addSupplierContractRate(params: AddSupplierContractRateParams): Promise<number>;
};
export type PartsInventoryResource = ReturnType<typeof createPartsInventoryResource>;
//# sourceMappingURL=parts-inventory.d.ts.map