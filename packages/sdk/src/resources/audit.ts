import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.js';
import { normalizeError } from '../errors.js';

/** Row from v_audit_entity_changes view. */
export type AuditEntityChangeRow = Database['public']['Views']['v_audit_entity_changes'] extends { Row: infer R }
  ? R
  : Record<string, unknown>;

/** Row from v_audit_permission_changes view. */
export type AuditPermissionChangeRow =
  Database['public']['Views']['v_audit_permission_changes'] extends { Row: infer R }
    ? R
    : Record<string, unknown>;

/** Row from v_audit_retention_configs view. */
export type AuditRetentionConfigRow =
  Database['public']['Views']['v_audit_retention_configs'] extends { Row: infer R }
    ? R
    : Record<string, unknown>;

/**
 * Audit resource: entity and permission changes, retention configuration (read-only).
 */
export function createAuditResource(supabase: SupabaseClient<Database>) {
  return {
    /** List entity changes for the current tenant (v_audit_entity_changes). */
    async listEntityChanges(): Promise<AuditEntityChangeRow[]> {
      const { data, error } = await supabase.from('v_audit_entity_changes').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as AuditEntityChangeRow[];
    },

    /** List permission changes for the current tenant (v_audit_permission_changes). */
    async listPermissionChanges(): Promise<AuditPermissionChangeRow[]> {
      const { data, error } = await supabase.from('v_audit_permission_changes').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as AuditPermissionChangeRow[];
    },

    /** List audit retention configs for the current tenant (v_audit_retention_configs). */
    async listRetentionConfigs(): Promise<AuditRetentionConfigRow[]> {
      const { data, error } = await supabase.from('v_audit_retention_configs').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as AuditRetentionConfigRow[];
    },
  };
}

export type AuditResource = ReturnType<typeof createAuditResource>;

