import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.js';
import { normalizeError } from '../errors.js';
import { callRpc } from '../unwrap.js';

export type IntegrationExternalIdRow = Database['public']['Views']['v_integration_external_ids'] extends {
  Row: infer R;
}
  ? R
  : Record<string, unknown>;

export type OutboundIntegrationEventRow = Database['public']['Views']['v_outbound_integration_events'] extends {
  Row: infer R;
}
  ? R
  : Record<string, unknown>;

export interface UpsertIntegrationExternalIdParams {
  tenantId: string;
  entityType: string;
  entityId: string;
  systemKey: string;
  externalId: string;
  metadata?: Record<string, unknown> | null;
}

export interface EnqueueIntegrationEventParams {
  tenantId: string;
  eventType: string;
  payload: Record<string, unknown>;
  entityType?: string | null;
  entityId?: string | null;
}

const rpc = (supabase: SupabaseClient<Database>) =>
  (supabase as unknown as { rpc: (n: string, p?: object) => Promise<{ data: unknown; error: unknown }> }).rpc.bind(
    supabase
  );

/**
 * Integration mappings and outbound event queue. Requires `integration.manage` (typically admin).
 * Set tenant context before listing views.
 */
export function createIntegrationsResource(supabase: SupabaseClient<Database>) {
  return {
    async listExternalIds(): Promise<IntegrationExternalIdRow[]> {
      const { data, error } = await supabase.from('v_integration_external_ids').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as IntegrationExternalIdRow[];
    },

    async listOutboundEvents(limit = 100): Promise<OutboundIntegrationEventRow[]> {
      const { data, error } = await supabase
        .from('v_outbound_integration_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw normalizeError(error);
      return (data ?? []) as OutboundIntegrationEventRow[];
    },

    async upsertExternalId(params: UpsertIntegrationExternalIdParams): Promise<string> {
      return callRpc<string>(rpc(supabase), 'rpc_upsert_integration_external_id', {
        p_tenant_id: params.tenantId,
        p_entity_type: params.entityType,
        p_entity_id: params.entityId,
        p_system_key: params.systemKey,
        p_external_id: params.externalId,
        p_metadata: params.metadata ?? null,
      });
    },

    async deleteExternalId(
      tenantId: string,
      entityType: string,
      entityId: string,
      systemKey: string
    ): Promise<void> {
      return callRpc<void>(rpc(supabase), 'rpc_delete_integration_external_id', {
        p_tenant_id: tenantId,
        p_entity_type: entityType,
        p_entity_id: entityId,
        p_system_key: systemKey,
      });
    },

    async enqueueEvent(params: EnqueueIntegrationEventParams): Promise<string> {
      return callRpc<string>(rpc(supabase), 'rpc_enqueue_integration_event', {
        p_tenant_id: params.tenantId,
        p_event_type: params.eventType,
        p_payload: params.payload,
        p_entity_type: params.entityType ?? null,
        p_entity_id: params.entityId ?? null,
      });
    },
  };
}

export type IntegrationsResource = ReturnType<typeof createIntegrationsResource>;
