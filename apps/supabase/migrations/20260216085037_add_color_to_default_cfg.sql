-- SPDX-License-Identifier: AGPL-3.0-or-later
--
-- Migration: Add color to default cfg creation functions
--
-- Purpose: Include hex color values when creating default statuses, priorities,
--   asset statuses, and maintenance types so new tenants get consistent UI
--   badge colors. Colors follow hex format (#RRGGBB) per color column constraint.
-- Affected: cfg.create_default_work_order_statuses,
--   cfg.create_default_work_order_priorities,
--   cfg.create_default_asset_statuses,
--   cfg.create_default_maintenance_types

-- ============================================================================
-- Default work order statuses (with color)
-- ============================================================================

create or replace function cfg.create_default_work_order_statuses(
  p_tenant_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into cfg.status_catalogs (tenant_id, entity_type, key, name, category, display_order, is_system, is_final, color)
  values
    (p_tenant_id, 'work_order', 'draft', 'Draft', 'open', 1, true, false, '#94a3b8'),
    (p_tenant_id, 'work_order', 'assigned', 'Assigned', 'open', 2, true, false, '#3b82f6'),
    (p_tenant_id, 'work_order', 'in_progress', 'In Progress', 'open', 3, true, false, '#f59e0b'),
    (p_tenant_id, 'work_order', 'completed', 'Completed', 'closed', 4, true, true, '#22c55e'),
    (p_tenant_id, 'work_order', 'cancelled', 'Cancelled', 'closed', 5, true, true, '#64748b');

  insert into cfg.status_transitions (tenant_id, entity_type, from_status_key, to_status_key, required_permission, is_system)
  values
    (p_tenant_id, 'work_order', 'draft', 'assigned', 'workorder.assign', true),
    (p_tenant_id, 'work_order', 'assigned', 'in_progress', 'workorder.edit', true),
    (p_tenant_id, 'work_order', 'in_progress', 'completed', 'workorder.complete.assigned', true),
    (p_tenant_id, 'work_order', 'assigned', 'completed', 'workorder.complete.any', true),
    (p_tenant_id, 'work_order', 'draft', 'cancelled', 'workorder.cancel', true),
    (p_tenant_id, 'work_order', 'assigned', 'cancelled', 'workorder.cancel', true),
    (p_tenant_id, 'work_order', 'in_progress', 'cancelled', 'workorder.cancel', true);
end;
$$;

comment on function cfg.create_default_work_order_statuses(uuid) is
  'Creates default work order statuses (draft, assigned, in_progress, completed, cancelled) and their transitions for a new tenant. Includes hex colors for UI badges. System statuses cannot be deleted. Called automatically during tenant creation.';

-- ============================================================================
-- Default work order priorities (with color)
-- ============================================================================

create or replace function cfg.create_default_work_order_priorities(
  p_tenant_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into cfg.priority_catalogs (tenant_id, entity_type, key, name, weight, display_order, is_system, color)
  values
    (p_tenant_id, 'work_order', 'low', 'Low', 40, 1, true, '#22c55e'),
    (p_tenant_id, 'work_order', 'medium', 'Medium', 30, 2, true, '#3b82f6'),
    (p_tenant_id, 'work_order', 'high', 'High', 20, 3, true, '#f59e0b'),
    (p_tenant_id, 'work_order', 'critical', 'Critical', 10, 4, true, '#ef4444');
end;
$$;

comment on function cfg.create_default_work_order_priorities(uuid) is
  'Creates default work order priorities (low, medium, high, critical) for a new tenant. Includes hex colors for UI badges. Priorities have numeric weights for sorting (lower = higher priority). Called automatically during tenant creation.';

-- ============================================================================
-- Default asset statuses (with color)
-- ============================================================================

create or replace function cfg.create_default_asset_statuses(
  p_tenant_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into cfg.status_catalogs (tenant_id, entity_type, key, name, category, display_order, is_system, is_final, color)
  values
    (p_tenant_id, 'asset', 'active', 'Active', 'open', 1, true, false, '#22c55e'),
    (p_tenant_id, 'asset', 'inactive', 'Inactive', 'closed', 2, true, false, '#94a3b8'),
    (p_tenant_id, 'asset', 'retired', 'Retired', 'final', 3, true, true, '#64748b');
end;
$$;

comment on function cfg.create_default_asset_statuses(uuid) is
  'Creates default asset statuses (active, inactive, retired) for a new tenant. Includes hex colors for UI badges. System statuses cannot be deleted. Called automatically during tenant creation.';

-- ============================================================================
-- Default maintenance types (with color by category)
-- ============================================================================

create or replace function cfg.create_default_maintenance_types(
  p_tenant_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Reactive: red
  insert into cfg.maintenance_type_catalogs (tenant_id, entity_type, category, key, name, description, display_order, is_system, color)
  values
    (p_tenant_id, 'work_order', 'reactive', 'corrective', 'Corrective', 'Fix after failure or defect is detected. Unplanned maintenance to restore equipment to working condition.', 1, true, '#ef4444'),
    (p_tenant_id, 'work_order', 'reactive', 'emergency', 'Emergency', 'Urgent, safety-critical maintenance requiring immediate response. Highest priority reactive maintenance.', 2, true, '#ef4444'),
    (p_tenant_id, 'work_order', 'reactive', 'breakdown', 'Breakdown', 'Unplanned equipment failure requiring immediate repair. Equipment is non-operational.', 3, true, '#ef4444'),
    (p_tenant_id, 'work_order', 'reactive', 'run_to_failure', 'Run to Failure', 'Intentional strategy for low-value assets. No maintenance until failure occurs.', 4, true, '#ef4444');

  -- Planned: blue
  insert into cfg.maintenance_type_catalogs (tenant_id, entity_type, category, key, name, description, display_order, is_system, color)
  values
    (p_tenant_id, 'work_order', 'planned', 'preventive_time', 'Time-Based PM', 'Preventive maintenance scheduled by calendar intervals (daily, weekly, monthly, quarterly, annual).', 5, true, '#3b82f6'),
    (p_tenant_id, 'work_order', 'planned', 'preventive_usage', 'Usage-Based PM', 'Preventive maintenance scheduled by usage metrics (runtime hours, cycles, miles, production units).', 6, true, '#3b82f6'),
    (p_tenant_id, 'work_order', 'planned', 'condition_based', 'Condition-Based', 'Maintenance triggered by condition monitoring (vibration, oil analysis, thermography, ultrasonic, visual inspection thresholds).', 7, true, '#3b82f6');

  -- Advanced: violet
  insert into cfg.maintenance_type_catalogs (tenant_id, entity_type, category, key, name, description, display_order, is_system, color)
  values
    (p_tenant_id, 'work_order', 'advanced', 'predictive', 'Predictive', 'Data-driven maintenance using IoT sensors, machine learning, and statistical analysis to predict failures before they occur.', 8, true, '#8b5cf6'),
    (p_tenant_id, 'work_order', 'advanced', 'rcm', 'RCM', 'Reliability-Centered Maintenance. Risk-based analysis to determine optimal maintenance strategy for each asset.', 9, true, '#8b5cf6'),
    (p_tenant_id, 'work_order', 'advanced', 'rbm', 'RBM', 'Risk-Based Maintenance. Prioritizes maintenance on critical assets based on risk assessment.', 10, true, '#8b5cf6'),
    (p_tenant_id, 'work_order', 'advanced', 'fmea', 'FMEA', 'Failure Mode and Effects Analysis. Systematic analysis of potential failure modes and their effects.', 11, true, '#8b5cf6');

  -- Lean: green
  insert into cfg.maintenance_type_catalogs (tenant_id, entity_type, category, key, name, description, display_order, is_system, color)
  values
    (p_tenant_id, 'work_order', 'lean', 'tpm', 'TPM', 'Total Productive Maintenance. Operator involvement in maintenance activities, zero defects philosophy.', 12, true, '#22c55e'),
    (p_tenant_id, 'work_order', 'lean', 'proactive', 'Proactive', 'Root cause analysis and design improvements to prevent recurring failures. Focuses on eliminating root causes.', 13, true, '#22c55e'),
    (p_tenant_id, 'work_order', 'lean', 'design_out', 'Design-Out', 'Eliminate failure modes through design changes or equipment modifications.', 14, true, '#22c55e');

  -- Other: slate
  insert into cfg.maintenance_type_catalogs (tenant_id, entity_type, category, key, name, description, display_order, is_system, color)
  values
    (p_tenant_id, 'work_order', 'other', 'inspection', 'Inspection', 'Routine checks and assessments without repair work. Visual inspections, safety checks, compliance audits.', 15, true, '#64748b'),
    (p_tenant_id, 'work_order', 'other', 'calibration', 'Calibration', 'Adjust equipment to meet specifications. Ensures accuracy and compliance with standards.', 16, true, '#64748b'),
    (p_tenant_id, 'work_order', 'other', 'installation', 'Installation', 'New equipment setup and commissioning. Initial installation of assets.', 17, true, '#64748b'),
    (p_tenant_id, 'work_order', 'other', 'modification', 'Modification', 'Design changes or upgrades to existing equipment. Improvements and enhancements.', 18, true, '#64748b'),
    (p_tenant_id, 'work_order', 'other', 'project', 'Project', 'Large-scale, multi-phase maintenance work. Complex projects requiring coordination.', 19, true, '#64748b'),
    (p_tenant_id, 'work_order', 'other', 'shutdown', 'Shutdown/Turnaround', 'Planned facility downtime for major maintenance. Scheduled plant shutdowns.', 20, true, '#64748b');
end;
$$;

comment on function cfg.create_default_maintenance_types(uuid) is
  'Creates default maintenance types organized by category (reactive, planned, advanced, lean, other) for a new tenant. Includes hex colors per category for UI. System types cannot be deleted. Called automatically during tenant creation.';

revoke all on function cfg.create_default_work_order_statuses(uuid) from public;
grant execute on function cfg.create_default_work_order_statuses(uuid) to authenticated;

revoke all on function cfg.create_default_work_order_priorities(uuid) from public;
grant execute on function cfg.create_default_work_order_priorities(uuid) to authenticated;

revoke all on function cfg.create_default_asset_statuses(uuid) from public;
grant execute on function cfg.create_default_asset_statuses(uuid) to authenticated;

revoke all on function cfg.create_default_maintenance_types(uuid) from public;
grant execute on function cfg.create_default_maintenance_types(uuid) to authenticated;
