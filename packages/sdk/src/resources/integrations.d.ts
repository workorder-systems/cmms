import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.js';
export type IntegrationExternalIdRow = Database['public']['Views']['v_integration_external_ids'] extends {
    Row: infer R;
} ? R : Record<string, unknown>;
export type OutboundIntegrationEventRow = Database['public']['Views']['v_outbound_integration_events'] extends {
    Row: infer R;
} ? R : Record<string, unknown>;
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
/**
 * Integration mappings and outbound event queue. Requires `integration.manage` (typically admin).
 * Set tenant context before listing views.
 */
export declare function createIntegrationsResource(supabase: SupabaseClient<Database>): {
    listExternalIds(): Promise<IntegrationExternalIdRow[]>;
    listOutboundEvents(limit?: number): Promise<OutboundIntegrationEventRow[]>;
    upsertExternalId(params: UpsertIntegrationExternalIdParams): Promise<string>;
    deleteExternalId(tenantId: string, entityType: string, entityId: string, systemKey: string): Promise<void>;
    enqueueEvent(params: EnqueueIntegrationEventParams): Promise<string>;
};
export type IntegrationsResource = ReturnType<typeof createIntegrationsResource>;
//# sourceMappingURL=integrations.d.ts.map