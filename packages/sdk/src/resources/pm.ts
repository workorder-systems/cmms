import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.js';
import { normalizeError } from '../errors.js';
import { callRpc } from '../unwrap.js';

/** Row from v_pm_templates view. */
export type PmTemplateRow = Database['public']['Views']['v_pm_templates'] extends { Row: infer R }
  ? R
  : Record<string, unknown>;

/** Row from v_pm_template_checklist_items view. */
export type PmTemplateChecklistItemRow =
  Database['public']['Views']['v_pm_template_checklist_items'] extends { Row: infer R }
    ? R
    : Record<string, unknown>;

/** Row from v_pm_schedules view. */
export type PmScheduleRow = Database['public']['Views']['v_pm_schedules'] extends { Row: infer R }
  ? R
  : Record<string, unknown>;

/** Row from v_due_pms view. */
export type DuePmRow = Database['public']['Views']['v_due_pms'] extends { Row: infer R } ? R : Record<string, unknown>;

/** Row from v_overdue_pms view. */
export type OverduePmRow = Database['public']['Views']['v_overdue_pms'] extends { Row: infer R }
  ? R
  : Record<string, unknown>;

/** Row from v_upcoming_pms view. */
export type UpcomingPmRow = Database['public']['Views']['v_upcoming_pms'] extends { Row: infer R }
  ? R
  : Record<string, unknown>;

/** Row from v_pm_history view. */
export type PmHistoryRow = Database['public']['Views']['v_pm_history'] extends { Row: infer R }
  ? R
  : Record<string, unknown>;

/** Params for creating a PM template. */
export interface CreatePmTemplateParams {
  tenantId: string;
  name: string;
  triggerType: string;
  triggerConfig: Record<string, unknown>;
  description?: string | null;
  estimatedHours?: number | null;
  workOrderTitle?: string | null;
  workOrderDescription?: string | null;
  workOrderEstimatedHours?: number | null;
  workOrderPriority?: string | null;
  checklistItems?: Record<string, unknown>[] | null;
}

/** Params for updating a PM template. */
export interface UpdatePmTemplateParams {
  tenantId: string;
  templateId: string;
  name?: string | null;
  triggerConfig?: Record<string, unknown> | null;
  description?: string | null;
  estimatedHours?: number | null;
  workOrderTitle?: string | null;
  workOrderDescription?: string | null;
  workOrderEstimatedHours?: number | null;
  workOrderPriority?: string | null;
  checklistItems?: Record<string, unknown>[] | null;
}

/** Params for creating a PM schedule. */
export interface CreatePmScheduleParams {
  tenantId: string;
  assetId: string;
  title: string;
  triggerType: string;
  triggerConfig: Record<string, unknown>;
  description?: string | null;
  estimatedHours?: number | null;
  autoGenerate?: boolean | null;
  workOrderTitle?: string | null;
  workOrderDescription?: string | null;
  workOrderEstimatedHours?: number | null;
  workOrderPriority?: string | null;
  templateId?: string | null;
}

/** Params for updating a PM schedule. */
export interface UpdatePmScheduleParams {
  tenantId: string;
  pmScheduleId: string;
  title?: string | null;
  triggerConfig?: Record<string, unknown> | null;
  description?: string | null;
  estimatedHours?: number | null;
  isActive?: boolean | null;
  autoGenerate?: boolean | null;
  workOrderTitle?: string | null;
  workOrderDescription?: string | null;
  workOrderEstimatedHours?: number | null;
  workOrderPriority?: string | null;
}

/** Params for deleting a PM schedule. */
export interface DeletePmScheduleParams {
  tenantId: string;
  pmScheduleId: string;
}

/** Params for creating a PM dependency. */
export interface CreatePmDependencyParams {
  tenantId: string;
  pmScheduleId: string;
  dependsOnPmId: string;
  dependencyType?: string | null;
}

/** Params for generating due PMs. */
export interface GenerateDuePmsParams {
  tenantId: string;
  limit?: number | null;
}

/** Params for triggering a manual PM. */
export interface TriggerManualPmParams {
  tenantId: string;
  pmScheduleId: string;
}

const rpc = (supabase: SupabaseClient<Database>) =>
  (supabase as unknown as { rpc: (n: string, p?: object) => Promise<{ data: unknown; error: unknown }> }).rpc.bind(
    supabase
  );

/**
 * PM resource: templates, schedules, due/overdue/upcoming PMs, and history.
 * Uses v_pm_templates, v_pm_template_checklist_items, v_pm_schedules, v_due_pms, v_overdue_pms, v_upcoming_pms, v_pm_history
 * and related RPCs.
 */
export function createPmResource(supabase: SupabaseClient<Database>) {
  return {
    /** List PM templates for the current tenant (v_pm_templates). */
    async listTemplates(): Promise<PmTemplateRow[]> {
      const { data, error } = await supabase.from('v_pm_templates').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as PmTemplateRow[];
    },

    /** List checklist items across templates (v_pm_template_checklist_items). */
    async listTemplateChecklistItems(): Promise<PmTemplateChecklistItemRow[]> {
      const { data, error } = await supabase.from('v_pm_template_checklist_items').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as PmTemplateChecklistItemRow[];
    },

    /** List PM schedules for the current tenant (v_pm_schedules). */
    async listSchedules(): Promise<PmScheduleRow[]> {
      const { data, error } = await supabase.from('v_pm_schedules').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as PmScheduleRow[];
    },

    /** List due PMs (v_due_pms). */
    async listDue(): Promise<DuePmRow[]> {
      const { data, error } = await supabase.from('v_due_pms').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as DuePmRow[];
    },

    /** List overdue PMs (v_overdue_pms). */
    async listOverdue(): Promise<OverduePmRow[]> {
      const { data, error } = await supabase.from('v_overdue_pms').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as OverduePmRow[];
    },

    /** List upcoming PMs (v_upcoming_pms). */
    async listUpcoming(): Promise<UpcomingPmRow[]> {
      const { data, error } = await supabase.from('v_upcoming_pms').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as UpcomingPmRow[];
    },

    /** List PM history (v_pm_history). */
    async listHistory(): Promise<PmHistoryRow[]> {
      const { data, error } = await supabase.from('v_pm_history').select('*');
      if (error) throw normalizeError(error);
      return (data ?? []) as PmHistoryRow[];
    },

    /** Create a PM template. Returns template UUID. */
    async createTemplate(params: CreatePmTemplateParams): Promise<string> {
      return callRpc<string>(rpc(supabase), 'rpc_create_pm_template', {
        p_tenant_id: params.tenantId,
        p_name: params.name,
        p_trigger_type: params.triggerType,
        p_trigger_config: params.triggerConfig,
        p_description: params.description ?? null,
        p_estimated_hours: params.estimatedHours ?? null,
        p_wo_title: params.workOrderTitle ?? null,
        p_wo_description: params.workOrderDescription ?? null,
        p_wo_estimated_hours: params.workOrderEstimatedHours ?? null,
        p_wo_priority: params.workOrderPriority ?? null,
        p_checklist_items: params.checklistItems ?? null,
      });
    },

    /** Update a PM template. */
    async updateTemplate(params: UpdatePmTemplateParams): Promise<void> {
      return callRpc(rpc(supabase), 'rpc_update_pm_template', {
        p_tenant_id: params.tenantId,
        p_template_id: params.templateId,
        p_name: params.name ?? null,
        p_trigger_config: params.triggerConfig ?? null,
        p_description: params.description ?? null,
        p_estimated_hours: params.estimatedHours ?? null,
        p_wo_title: params.workOrderTitle ?? null,
        p_wo_description: params.workOrderDescription ?? null,
        p_wo_estimated_hours: params.workOrderEstimatedHours ?? null,
        p_wo_priority: params.workOrderPriority ?? null,
        p_checklist_items: params.checklistItems ?? null,
      });
    },

    /** Create a PM schedule. Returns schedule UUID. */
    async createSchedule(params: CreatePmScheduleParams): Promise<string> {
      return callRpc<string>(rpc(supabase), 'rpc_create_pm_schedule', {
        p_tenant_id: params.tenantId,
        p_asset_id: params.assetId,
        p_title: params.title,
        p_trigger_type: params.triggerType,
        p_trigger_config: params.triggerConfig,
        p_description: params.description ?? null,
        p_estimated_hours: params.estimatedHours ?? null,
        p_auto_generate: params.autoGenerate ?? null,
        p_wo_title: params.workOrderTitle ?? null,
        p_wo_description: params.workOrderDescription ?? null,
        p_wo_estimated_hours: params.workOrderEstimatedHours ?? null,
        p_wo_priority: params.workOrderPriority ?? null,
        p_template_id: params.templateId ?? null,
      });
    },

    /** Update a PM schedule. */
    async updateSchedule(params: UpdatePmScheduleParams): Promise<void> {
      return callRpc(rpc(supabase), 'rpc_update_pm_schedule', {
        p_tenant_id: params.tenantId,
        p_pm_schedule_id: params.pmScheduleId,
        p_title: params.title ?? null,
        p_trigger_config: params.triggerConfig ?? null,
        p_description: params.description ?? null,
        p_estimated_hours: params.estimatedHours ?? null,
        p_is_active: params.isActive ?? null,
        p_auto_generate: params.autoGenerate ?? null,
        p_wo_title: params.workOrderTitle ?? null,
        p_wo_description: params.workOrderDescription ?? null,
        p_wo_estimated_hours: params.workOrderEstimatedHours ?? null,
        p_wo_priority: params.workOrderPriority ?? null,
      });
    },

    /** Delete a PM schedule. */
    async deleteSchedule(params: DeletePmScheduleParams): Promise<void> {
      return callRpc(rpc(supabase), 'rpc_delete_pm_schedule', {
        p_tenant_id: params.tenantId,
        p_pm_schedule_id: params.pmScheduleId,
      });
    },

    /** Create a PM dependency (schedule depends on another PM). Returns dependency UUID. */
    async createDependency(params: CreatePmDependencyParams): Promise<string> {
      return callRpc<string>(rpc(supabase), 'rpc_create_pm_dependency', {
        p_tenant_id: params.tenantId,
        p_pm_schedule_id: params.pmScheduleId,
        p_depends_on_pm_id: params.dependsOnPmId,
        p_dependency_type: params.dependencyType ?? null,
      });
    },

    /** Generate due PMs. Returns number of generated PMs. */
    async generateDuePms(params: GenerateDuePmsParams): Promise<number> {
      return callRpc<number>(rpc(supabase), 'rpc_generate_due_pms', {
        p_tenant_id: params.tenantId,
        p_limit: params.limit ?? null,
      });
    },

    /** Trigger a manual PM for a schedule. Returns work order UUID. */
    async triggerManualPm(params: TriggerManualPmParams): Promise<string> {
      return callRpc<string>(rpc(supabase), 'rpc_trigger_manual_pm', {
        p_tenant_id: params.tenantId,
        p_pm_schedule_id: params.pmScheduleId,
      });
    },
  };
}

export type PmResource = ReturnType<typeof createPmResource>;

