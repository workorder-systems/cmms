import { normalizeError } from '../errors.js';
/**
 * Audit resource: entity and permission changes, retention configuration (read-only).
 */
export function createAuditResource(supabase) {
    return {
        /** List entity changes for the current tenant (v_audit_entity_changes). */
        async listEntityChanges() {
            const { data, error } = await supabase.from('v_audit_entity_changes').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** List permission changes for the current tenant (v_audit_permission_changes). */
        async listPermissionChanges() {
            const { data, error } = await supabase.from('v_audit_permission_changes').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
        /** List audit retention configs for the current tenant (v_audit_retention_configs). */
        async listRetentionConfigs() {
            const { data, error } = await supabase.from('v_audit_retention_configs').select('*');
            if (error)
                throw normalizeError(error);
            return (data ?? []);
        },
    };
}
