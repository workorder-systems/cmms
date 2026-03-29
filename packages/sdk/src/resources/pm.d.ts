import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.js';
/** Row from v_pm_templates view. */
export type PmTemplateRow = Database['public']['Views']['v_pm_templates'] extends {
    Row: infer R;
} ? R : Record<string, unknown>;
/** Row from v_pm_template_checklist_items view. */
export type PmTemplateChecklistItemRow = Database['public']['Views']['v_pm_template_checklist_items'] extends {
    Row: infer R;
} ? R : Record<string, unknown>;
/** Row from v_pm_schedules view. */
export type PmScheduleRow = Database['public']['Views']['v_pm_schedules'] extends {
    Row: infer R;
} ? R : Record<string, unknown>;
/** Row from v_due_pms view. */
export type DuePmRow = Database['public']['Views']['v_due_pms'] extends {
    Row: infer R;
} ? R : Record<string, unknown>;
/** Row from v_overdue_pms view. */
export type OverduePmRow = Database['public']['Views']['v_overdue_pms'] extends {
    Row: infer R;
} ? R : Record<string, unknown>;
/** Row from v_upcoming_pms view. */
export type UpcomingPmRow = Database['public']['Views']['v_upcoming_pms'] extends {
    Row: infer R;
} ? R : Record<string, unknown>;
/** Row from v_pm_history view. */
export type PmHistoryRow = Database['public']['Views']['v_pm_history'] extends {
    Row: infer R;
} ? R : Record<string, unknown>;
export interface PmScheduleSummaryRow {
    id: string;
    title: string | null;
    asset_id: string | null;
    asset_name: string | null;
    next_due_date: string | null;
    is_active: boolean | null;
    is_overdue: boolean | null;
    updated_at: string | null;
}
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
/**
 * PM resource: templates, schedules, due/overdue/upcoming PMs, and history.
 * Uses v_pm_templates, v_pm_template_checklist_items, v_pm_schedules, v_due_pms, v_overdue_pms, v_upcoming_pms, v_pm_history
 * and related RPCs.
 */
export declare function createPmResource(supabase: SupabaseClient<Database>): {
    /** List PM templates for the current tenant (v_pm_templates). */
    listTemplates(): Promise<PmTemplateRow[]>;
    /** List checklist items across templates (v_pm_template_checklist_items). */
    listTemplateChecklistItems(): Promise<PmTemplateChecklistItemRow[]>;
    /** List PM schedules for the current tenant (v_pm_schedules). */
    listSchedules(): Promise<PmScheduleRow[]>;
    /** Token-efficient PM schedule summaries for selection/disambiguation. */
    listSchedulesSummary(limit?: number): Promise<PmScheduleSummaryRow[]>;
    /** List due PMs (v_due_pms). */
    listDue(): Promise<DuePmRow[]>;
    /** List overdue PMs (v_overdue_pms). */
    listOverdue(): Promise<OverduePmRow[]>;
    /** List upcoming PMs (v_upcoming_pms). */
    listUpcoming(): Promise<UpcomingPmRow[]>;
    /** List PM history (v_pm_history). */
    listHistory(): Promise<PmHistoryRow[]>;
    /** Create a PM template. Returns template UUID. */
    createTemplate(params: CreatePmTemplateParams): Promise<string>;
    /** Update a PM template. */
    updateTemplate(params: UpdatePmTemplateParams): Promise<void>;
    /** Create a PM schedule. Returns schedule UUID. */
    createSchedule(params: CreatePmScheduleParams): Promise<string>;
    /** Update a PM schedule. */
    updateSchedule(params: UpdatePmScheduleParams): Promise<void>;
    /** Delete a PM schedule. */
    deleteSchedule(params: DeletePmScheduleParams): Promise<void>;
    /** Create a PM dependency (schedule depends on another PM). Returns dependency UUID. */
    createDependency(params: CreatePmDependencyParams): Promise<string>;
    /** Generate due PMs. Returns number of generated PMs. */
    generateDuePms(params: GenerateDuePmsParams): Promise<number>;
    /** Trigger a manual PM for a schedule. Returns work order UUID. */
    triggerManualPm(params: TriggerManualPmParams): Promise<string>;
};
export type PmResource = ReturnType<typeof createPmResource>;
//# sourceMappingURL=pm.d.ts.map