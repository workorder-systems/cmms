import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.js';
/** Row from v_audit_entity_changes view. */
export type AuditEntityChangeRow = Database['public']['Views']['v_audit_entity_changes'] extends {
    Row: infer R;
} ? R : Record<string, unknown>;
/** Row from v_audit_permission_changes view. */
export type AuditPermissionChangeRow = Database['public']['Views']['v_audit_permission_changes'] extends {
    Row: infer R;
} ? R : Record<string, unknown>;
/** Row from v_audit_retention_configs view. */
export type AuditRetentionConfigRow = Database['public']['Views']['v_audit_retention_configs'] extends {
    Row: infer R;
} ? R : Record<string, unknown>;
/**
 * Audit resource: entity and permission changes, retention configuration (read-only).
 */
export declare function createAuditResource(supabase: SupabaseClient<Database>): {
    /** List entity changes for the current tenant (v_audit_entity_changes). */
    listEntityChanges(): Promise<AuditEntityChangeRow[]>;
    /** List permission changes for the current tenant (v_audit_permission_changes). */
    listPermissionChanges(): Promise<AuditPermissionChangeRow[]>;
    /** List audit retention configs for the current tenant (v_audit_retention_configs). */
    listRetentionConfigs(): Promise<AuditRetentionConfigRow[]>;
};
export type AuditResource = ReturnType<typeof createAuditResource>;
//# sourceMappingURL=audit.d.ts.map