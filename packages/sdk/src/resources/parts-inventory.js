import { normalizeError } from '../errors.js';
import { callRpc } from '../unwrap.js';
const rpc = (supabase) => supabase.rpc.bind(supabase);
/**
 * Parts and inventory resource: parts catalog, suppliers, stock locations,
 * stock levels, reservations, usage, and purchasing (requisitions, POs, receipts).
 * Set tenant context (client.setTenant) before tenant-scoped operations.
 */
export function createPartsInventoryResource(supabase) {
    return {
        /** Parts with aggregated on-hand, reserved, and available (v_parts_with_stock). */
        async listPartsWithStock() {
            const { data, error } = await supabase.from('v_parts_with_stock').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** Get a single part with stock by id. */
        async getPartWithStockById(id) {
            const { data, error } = await supabase.from('v_parts_with_stock').select('*').eq('id', id).maybeSingle();
            if (error)
                throw normalizeError(error);
            return data;
        },
        /** Stock by part and inventory location (v_stock_by_location). */
        async listStockByLocation() {
            const { data, error } = await supabase.from('v_stock_by_location').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** List parts catalog (v_parts). */
        async listParts() {
            const { data, error } = await supabase.from('v_parts').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        async listSummary(limit = 50) {
            const rows = await this.listParts();
            return rows.slice(0, Math.max(1, limit)).map((row) => ({
                id: row.id,
                name: row.name,
                part_number: row.part_number,
                barcode: row.barcode ?? null,
                preferred_supplier_id: row.preferred_supplier_id,
                updated_at: row.updated_at,
            }));
        },
        /** Get part by id. */
        async getPartById(id) {
            const { data, error } = await supabase.from('v_parts').select('*').eq('id', id).maybeSingle();
            if (error)
                throw normalizeError(error);
            return data;
        },
        /** List suppliers (v_suppliers). */
        async listSuppliers() {
            const { data, error } = await supabase.from('v_suppliers').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** Get supplier by id. */
        async getSupplierById(id) {
            const { data, error } = await supabase.from('v_suppliers').select('*').eq('id', id).maybeSingle();
            if (error)
                throw normalizeError(error);
            return data;
        },
        /** List inventory locations (v_inventory_locations). */
        async listInventoryLocations() {
            const { data, error } = await supabase.from('v_inventory_locations').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** List stock levels (v_stock_levels). */
        async listStockLevels() {
            const { data, error } = await supabase.from('v_stock_levels').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** List part reservations (v_part_reservations). */
        async listPartReservations() {
            const { data, error } = await supabase.from('v_part_reservations').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** List part reservations for a work order. */
        async listPartReservationsByWorkOrderId(workOrderId) {
            const { data, error } = await supabase
                .from('v_part_reservations')
                .select('*')
                .eq('work_order_id', workOrderId);
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** List part usage (v_part_usage). */
        async listPartUsage() {
            const { data, error } = await supabase.from('v_part_usage').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** List part usage for a work order. */
        async listPartUsageByWorkOrderId(workOrderId) {
            const { data, error } = await supabase.from('v_part_usage').select('*').eq('work_order_id', workOrderId);
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** Open purchase requisitions (v_open_requisitions). */
        async listOpenRequisitions() {
            const { data, error } = await supabase.from('v_open_requisitions').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** Create a draft purchase requisition. Requires purchase_requisition.create. Returns requisition id. */
        async createPurchaseRequisition(params) {
            return callRpc(rpc(supabase), 'rpc_create_purchase_requisition', {
                p_tenant_id: params.tenantId,
                p_due_date: params.dueDate ?? null,
                p_notes: params.notes ?? null,
            });
        },
        /** Add a line to a draft requisition. Requires purchase_requisition.edit. Returns line id. */
        async addPurchaseRequisitionLine(params) {
            return callRpc(rpc(supabase), 'rpc_add_purchase_requisition_line', {
                p_tenant_id: params.tenantId,
                p_purchase_requisition_id: params.purchaseRequisitionId,
                p_part_id: params.partId,
                p_quantity: params.quantity,
                p_estimated_unit_cost: params.estimatedUnitCost ?? null,
                p_notes: params.notes ?? null,
            });
        },
        /** Update a requisition line (draft only). Requires purchase_requisition.edit. */
        async updatePurchaseRequisitionLine(params) {
            return callRpc(rpc(supabase), 'rpc_update_purchase_requisition_line', {
                p_tenant_id: params.tenantId,
                p_line_id: params.lineId,
                p_quantity: params.quantity ?? null,
                p_estimated_unit_cost: params.estimatedUnitCost ?? null,
                p_notes: params.notes ?? null,
            });
        },
        /** Remove a line from a draft requisition. Requires purchase_requisition.edit. */
        async removePurchaseRequisitionLine(tenantId, lineId) {
            return callRpc(rpc(supabase), 'rpc_remove_purchase_requisition_line', {
                p_tenant_id: tenantId,
                p_line_id: lineId,
            });
        },
        /** Delete a draft requisition (and lines). Requires purchase_requisition.edit. */
        async deletePurchaseRequisition(tenantId, purchaseRequisitionId) {
            return callRpc(rpc(supabase), 'rpc_delete_purchase_requisition', {
                p_tenant_id: tenantId,
                p_purchase_requisition_id: purchaseRequisitionId,
            });
        },
        /** Open purchase orders (v_open_purchase_orders). */
        async listOpenPurchaseOrders() {
            const { data, error } = await supabase.from('v_open_purchase_orders').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** PO receipt status (v_purchase_order_receipt_status). */
        async listPurchaseOrderReceiptStatus() {
            const { data, error } = await supabase.from('v_purchase_order_receipt_status').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** Receipt status for a single PO. */
        async listPurchaseOrderReceiptStatusByPoId(poId) {
            const { data, error } = await supabase
                .from('v_purchase_order_receipt_status')
                .select('*')
                .eq('purchase_order_id', poId);
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** Reserve parts for a work order. Returns reservation id. */
        async reserveParts(params) {
            return callRpc(rpc(supabase), 'rpc_reserve_parts', {
                p_tenant_id: params.tenantId,
                p_work_order_id: params.workOrderId,
                p_part_id: params.partId,
                p_quantity: params.quantity,
                p_inventory_location_id: params.inventoryLocationId ?? null,
            });
        },
        /** Issue parts to a work order (decrements stock, records usage). Returns part_usage id. */
        async issuePartsToWorkOrder(params) {
            return callRpc(rpc(supabase), 'rpc_issue_parts_to_work_order', {
                p_tenant_id: params.tenantId,
                p_work_order_id: params.workOrderId,
                p_part_id: params.partId,
                p_quantity: params.quantity,
                p_inventory_location_id: params.inventoryLocationId ?? null,
            });
        },
        /** Receive a purchase order (create receipt, update PO lines and stock). Returns receipt id. */
        async receivePurchaseOrder(params) {
            const lines = params.lines.map((l) => ({
                purchase_order_line_id: l.purchase_order_line_id,
                quantity_received: l.quantity_received,
                to_inventory_location_id: l.to_inventory_location_id ?? null,
            }));
            return callRpc(rpc(supabase), 'rpc_receive_purchase_order', {
                p_tenant_id: params.tenantId,
                p_po_id: params.poId,
                p_lines: lines,
            });
        },
        /** Create a purchase order. Returns PO id. */
        async createPurchaseOrder(params) {
            const lines = (params.lines ?? []).map((l) => ({
                part_id: l.part_id,
                quantity_ordered: l.quantity_ordered,
                unit_price: l.unit_price ?? null,
            }));
            return callRpc(rpc(supabase), 'rpc_create_purchase_order', {
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
        async createPart(params) {
            return callRpc(rpc(supabase), 'rpc_create_part', {
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
        async updatePart(params) {
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
        async resolvePartByScanCode(tenantId, code) {
            const id = await callRpc(rpc(supabase), 'rpc_resolve_part_by_scan_code', {
                p_tenant_id: tenantId,
                p_code: code,
            });
            return id;
        },
        /** Create a supplier. Returns supplier id. */
        async createSupplier(params) {
            return callRpc(rpc(supabase), 'rpc_create_supplier', {
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
        async updateSupplier(params) {
            return callRpc(rpc(supabase), 'rpc_update_supplier', {
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
        async listSupplierContracts() {
            const { data, error } = await supabase.from('v_supplier_contracts').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** Contract rates for the tenant (`v_supplier_contract_rates`), optionally filtered by contract. */
        async listSupplierContractRates(contractId) {
            let q = supabase.from('v_supplier_contract_rates').select('*');
            if (contractId)
                q = q.eq('contract_id', contractId);
            const { data, error } = await q;
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** Vendor spend roll-up from work order vendor cost lines (`v_vendor_spend_by_supplier`). */
        async listVendorSpendBySupplier() {
            const { data, error } = await supabase.from('v_vendor_spend_by_supplier').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** Work order counts by primary supplier assignment (`v_work_order_counts_by_primary_supplier`). */
        async listWorkOrderCountsByPrimarySupplier() {
            const { data, error } = await supabase.from('v_work_order_counts_by_primary_supplier').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** Create a supplier contract. Returns contract id. */
        async createSupplierContract(params) {
            return callRpc(rpc(supabase), 'rpc_create_supplier_contract', {
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
        async updateSupplierContract(params) {
            return callRpc(rpc(supabase), 'rpc_update_supplier_contract', {
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
        async addSupplierContractRate(params) {
            return callRpc(rpc(supabase), 'rpc_add_supplier_contract_rate', {
                p_tenant_id: params.tenantId,
                p_contract_id: params.contractId,
                p_rate_type: params.rateType,
                p_amount_cents: params.amountCents,
                p_uom: params.uom ?? null,
            });
        },
    };
}
