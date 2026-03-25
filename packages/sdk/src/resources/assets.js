import { normalizeError } from '../errors.js';
import { callRpc } from '../unwrap.js';
const rpc = (supabase) => supabase.rpc.bind(supabase);
export function createAssetsResource(supabase) {
    return {
        async list() {
            const { data, error } = await supabase.from('v_assets').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        async getById(id) {
            const { data, error } = await supabase.from('v_assets').select('*').eq('id', id).maybeSingle();
            if (error)
                throw normalizeError(error);
            return data;
        },
        /** Warranty rows for the tenant; pass `assetId` to filter one asset. */
        async listWarranties(assetId) {
            let q = supabase.from('v_asset_warranties').select('*').order('expires_on', { ascending: true });
            if (assetId)
                q = q.eq('asset_id', assetId);
            const { data, error } = await q;
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** Insert or update `app.asset_warranties`; returns warranty UUID. */
        async upsertWarranty(params) {
            return callRpc(rpc(supabase), 'rpc_upsert_asset_warranty', {
                p_tenant_id: params.tenantId,
                p_asset_id: params.assetId,
                p_warranty_id: params.warrantyId ?? null,
                p_warranty_type: params.warrantyType ?? null,
                p_starts_on: params.startsOn ?? null,
                p_expires_on: params.expiresOn ?? null,
                p_coverage_summary: params.coverageSummary ?? null,
                p_external_reference: params.externalReference ?? null,
                p_supplier_id: params.supplierId ?? null,
                p_is_active: params.isActive ?? null,
            });
        },
        async create(params) {
            return callRpc(rpc(supabase), 'rpc_create_asset', {
                p_tenant_id: params.tenantId,
                p_name: params.name,
                p_description: params.description ?? null,
                p_asset_number: params.assetNumber ?? null,
                p_location_id: params.locationId ?? null,
                p_department_id: params.departmentId ?? null,
                p_status: params.status ?? 'active',
                p_barcode: params.barcode ?? null,
            });
        },
        async update(params) {
            await callRpc(rpc(supabase), 'rpc_update_asset', {
                p_tenant_id: params.tenantId,
                p_asset_id: params.assetId,
                p_name: params.name ?? null,
                p_description: params.description ?? null,
                p_asset_number: params.assetNumber ?? null,
                p_location_id: params.locationId ?? null,
                p_department_id: params.departmentId ?? null,
                p_status: params.status ?? null,
                p_barcode: params.barcode !== undefined ? params.barcode : null,
            });
        },
        /**
         * Resolve a scanned code to an asset id (barcode column, then asset_number). Requires `asset.view`.
         * Returns null if not found.
         */
        async resolveByScanCode(tenantId, code) {
            const id = await callRpc(rpc(supabase), 'rpc_resolve_asset_by_scan_code', {
                p_tenant_id: tenantId,
                p_code: code,
            });
            return id;
        },
        async delete(tenantId, assetId) {
            return callRpc(rpc(supabase), 'rpc_delete_asset', { p_tenant_id: tenantId, p_asset_id: assetId });
        },
        /** Bulk import assets. Returns created ids and per-row errors. */
        async bulkImport(params) {
            const raw = await callRpc(rpc(supabase), 'rpc_bulk_import_assets', {
                p_tenant_id: params.tenantId,
                p_rows: params.rows,
            });
            const data = raw;
            return {
                created_ids: data.created_ids ?? [],
                errors: data.errors ?? [],
            };
        },
        /** Insert a downtime event row. Returns the event UUID. */
        async recordDowntime(params) {
            return callRpc(rpc(supabase), 'rpc_record_asset_downtime', {
                p_tenant_id: params.tenantId,
                p_asset_id: params.assetId,
                p_reason_key: params.reasonKey,
                p_started_at: params.startedAt ?? null,
                p_ended_at: params.endedAt ?? null,
                p_linked_work_order_id: params.linkedWorkOrderId ?? null,
                p_notes: params.notes ?? null,
            });
        },
    };
}
