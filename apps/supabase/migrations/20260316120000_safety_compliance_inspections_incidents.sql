-- SPDX-License-Identifier: AGPL-3.0-or-later
--
-- Safety and compliance: inspections, checklists, incidents, and corrective actions.
-- Purpose: Inspection templates and checklist items (cfg), inspection schedules and
--   runs with results (app), incidents and incident actions (app), plus public views
--   and RPCs for audit-ready compliance reporting. Tuned for regulated industries
--   (F&B, pharma, healthcare) with a flexible base that can be extended.
-- Affected: cfg.inspection_templates, cfg.inspection_template_items,
--   app.inspection_schedules, app.inspection_runs, app.inspection_run_items,
--   app.incidents, app.incident_actions; public views and RPCs; audit triggers.
-- Special considerations: RLS granular per operation and role (anon/authenticated);
--   at least one of asset_id or location_id required on runs and schedules.

-- ============================================================================
-- 1. cfg.inspection_templates
-- ============================================================================

create table cfg.inspection_templates (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  name text not null,
  description text,
  category text,
  trigger_config jsonb,
  is_system boolean not null default false,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint inspection_templates_name_length_check check (
    length(name) >= 1 and length(name) <= 255
  ),
  constraint inspection_templates_category_format_check check (
    category is null or (
      category ~ '^[a-z0-9_]+$' and length(category) >= 1 and length(category) <= 50
    )
  )
);

comment on table cfg.inspection_templates is
  'Reusable inspection templates for safety and compliance (e.g. daily safety round, GMP area checklist). Independent of PM. Category and trigger_config allow flexible scheduling.';
comment on column cfg.inspection_templates.tenant_id is
  'Tenant that owns this template.';
comment on column cfg.inspection_templates.name is
  'Template display name. Must be 1-255 characters.';
comment on column cfg.inspection_templates.description is
  'Optional description of the inspection procedure.';
comment on column cfg.inspection_templates.category is
  'Optional category for grouping (e.g. safety, compliance, quality). Lowercase alphanumeric and underscore, max 50 chars.';
comment on column cfg.inspection_templates.trigger_config is
  'Optional JSONB for schedule hints (e.g. daily, weekly, per_work_order). Schedules live in app.inspection_schedules.';
comment on column cfg.inspection_templates.is_system is
  'If true, template is system-provided and may be restricted from edit/delete.';

create index inspection_templates_tenant_idx
  on cfg.inspection_templates (tenant_id);

create index inspection_templates_tenant_category_idx
  on cfg.inspection_templates (tenant_id, category)
  where category is not null;

create trigger inspection_templates_set_updated_at
  before update on cfg.inspection_templates
  for each row
  execute function util.set_updated_at();

alter table cfg.inspection_templates enable row level security;

-- RLS: one policy per (operation, role) for inspection_templates
create policy inspection_templates_select_authenticated
  on cfg.inspection_templates
  for select
  to authenticated
  using (authz.is_current_user_tenant_member(tenant_id));

create policy inspection_templates_select_anon
  on cfg.inspection_templates
  for select
  to anon
  using (false);

create policy inspection_templates_insert_authenticated
  on cfg.inspection_templates
  for insert
  to authenticated
  with check (authz.is_current_user_tenant_member(tenant_id));

create policy inspection_templates_insert_anon
  on cfg.inspection_templates
  for insert
  to anon
  with check (false);

create policy inspection_templates_update_authenticated
  on cfg.inspection_templates
  for update
  to authenticated
  using (authz.is_current_user_tenant_member(tenant_id))
  with check (authz.is_current_user_tenant_member(tenant_id));

create policy inspection_templates_update_anon
  on cfg.inspection_templates
  for update
  to anon
  using (false)
  with check (false);

create policy inspection_templates_delete_authenticated
  on cfg.inspection_templates
  for delete
  to authenticated
  using (authz.is_current_user_tenant_member(tenant_id));

create policy inspection_templates_delete_anon
  on cfg.inspection_templates
  for delete
  to anon
  using (false);

comment on policy inspection_templates_select_authenticated on cfg.inspection_templates is
  'Allows authenticated users to view inspection templates in tenants they are members of.';
comment on policy inspection_templates_insert_authenticated on cfg.inspection_templates is
  'Allows authenticated users to create inspection templates in tenants they are members of.';
comment on policy inspection_templates_update_authenticated on cfg.inspection_templates is
  'Allows authenticated users to update inspection templates in tenants they are members of.';
comment on policy inspection_templates_delete_authenticated on cfg.inspection_templates is
  'Allows authenticated users to delete inspection templates in tenants they are members of.';

-- ============================================================================
-- 2. cfg.inspection_template_items
-- ============================================================================

create table cfg.inspection_template_items (
  id uuid primary key default extensions.gen_random_uuid(),
  template_id uuid not null references cfg.inspection_templates(id) on delete cascade,
  description text not null,
  required boolean not null default false,
  display_order integer not null,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint inspection_template_items_display_order_check check (display_order >= 0),
  constraint inspection_template_items_description_length_check check (
    length(description) >= 1 and length(description) <= 1000
  )
);

comment on table cfg.inspection_template_items is
  'Checklist items (steps/questions) per inspection template. One row per item with display_order.';
comment on column cfg.inspection_template_items.template_id is
  'Inspection template this item belongs to. Cascade delete when template is deleted.';
comment on column cfg.inspection_template_items.description is
  'Item text. Must be 1-1000 characters.';
comment on column cfg.inspection_template_items.required is
  'Whether this item must be completed for the run to be valid.';
comment on column cfg.inspection_template_items.display_order is
  'Order for display (0-based). Must be >= 0.';

create index inspection_template_items_template_idx
  on cfg.inspection_template_items (template_id, display_order);

create trigger inspection_template_items_set_updated_at
  before update on cfg.inspection_template_items
  for each row
  execute function util.set_updated_at();

alter table cfg.inspection_template_items enable row level security;

create policy inspection_template_items_select_authenticated
  on cfg.inspection_template_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from cfg.inspection_templates it
      where it.id = inspection_template_items.template_id
        and authz.is_current_user_tenant_member(it.tenant_id)
    )
  );

create policy inspection_template_items_select_anon
  on cfg.inspection_template_items
  for select
  to anon
  using (false);

create policy inspection_template_items_insert_authenticated
  on cfg.inspection_template_items
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from cfg.inspection_templates it
      where it.id = inspection_template_items.template_id
        and authz.is_current_user_tenant_member(it.tenant_id)
    )
  );

create policy inspection_template_items_insert_anon
  on cfg.inspection_template_items
  for insert
  to anon
  with check (false);

create policy inspection_template_items_update_authenticated
  on cfg.inspection_template_items
  for update
  to authenticated
  using (
    exists (
      select 1
      from cfg.inspection_templates it
      where it.id = inspection_template_items.template_id
        and authz.is_current_user_tenant_member(it.tenant_id)
    )
  )
  with check (
    exists (
      select 1
      from cfg.inspection_templates it
      where it.id = inspection_template_items.template_id
        and authz.is_current_user_tenant_member(it.tenant_id)
    )
  );

create policy inspection_template_items_update_anon
  on cfg.inspection_template_items
  for update
  to anon
  using (false)
  with check (false);

create policy inspection_template_items_delete_authenticated
  on cfg.inspection_template_items
  for delete
  to authenticated
  using (
    exists (
      select 1
      from cfg.inspection_templates it
      where it.id = inspection_template_items.template_id
        and authz.is_current_user_tenant_member(it.tenant_id)
    )
  );

create policy inspection_template_items_delete_anon
  on cfg.inspection_template_items
  for delete
  to anon
  using (false);

comment on policy inspection_template_items_select_authenticated on cfg.inspection_template_items is
  'Allows authenticated users to view checklist items for inspection templates in their tenants.';
comment on policy inspection_template_items_insert_authenticated on cfg.inspection_template_items is
  'Allows authenticated users to create checklist items for inspection templates in their tenants.';
comment on policy inspection_template_items_update_authenticated on cfg.inspection_template_items is
  'Allows authenticated users to update checklist items for inspection templates in their tenants.';
comment on policy inspection_template_items_delete_authenticated on cfg.inspection_template_items is
  'Allows authenticated users to delete checklist items for inspection templates in their tenants.';

-- ============================================================================
-- 3. app.inspection_schedules
-- ============================================================================

create table app.inspection_schedules (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  template_id uuid not null references cfg.inspection_templates(id) on delete restrict,
  asset_id uuid references app.assets(id) on delete cascade,
  location_id uuid references app.locations(id) on delete cascade,
  title text not null,
  trigger_config jsonb not null default '{}',
  next_due_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint inspection_schedules_asset_or_location check (
    (asset_id is not null) or (location_id is not null)
  ),
  constraint inspection_schedules_title_length_check check (
    length(title) >= 1 and length(title) <= 500
  )
);

comment on table app.inspection_schedules is
  'Scheduled inspections at an asset and/or location. Defines when inspections are due (e.g. daily, weekly). Feeds due-date reporting.';
comment on column app.inspection_schedules.template_id is
  'Inspection template to use for runs generated from this schedule.';
comment on column app.inspection_schedules.asset_id is
  'Asset to inspect. At least one of asset_id or location_id must be set.';
comment on column app.inspection_schedules.location_id is
  'Location to inspect. At least one of asset_id or location_id must be set.';
comment on column app.inspection_schedules.trigger_config is
  'JSONB for frequency/schedule (e.g. interval_days, cron, calendar).';
comment on column app.inspection_schedules.next_due_at is
  'Next due date/time. Updated when a run is completed or manually.';

create index inspection_schedules_tenant_idx
  on app.inspection_schedules (tenant_id);

create index inspection_schedules_template_idx
  on app.inspection_schedules (template_id);

create index inspection_schedules_next_due_idx
  on app.inspection_schedules (tenant_id, next_due_at)
  where is_active = true and next_due_at is not null;

create trigger inspection_schedules_set_updated_at
  before update on app.inspection_schedules
  for each row
  execute function util.set_updated_at();

alter table app.inspection_schedules enable row level security;

create policy inspection_schedules_select_authenticated
  on app.inspection_schedules
  for select
  to authenticated
  using (authz.is_current_user_tenant_member(tenant_id));

create policy inspection_schedules_select_anon
  on app.inspection_schedules
  for select
  to anon
  using (false);

create policy inspection_schedules_insert_authenticated
  on app.inspection_schedules
  for insert
  to authenticated
  with check (authz.is_current_user_tenant_member(tenant_id));

create policy inspection_schedules_insert_anon
  on app.inspection_schedules
  for insert
  to anon
  with check (false);

create policy inspection_schedules_update_authenticated
  on app.inspection_schedules
  for update
  to authenticated
  using (authz.is_current_user_tenant_member(tenant_id))
  with check (authz.is_current_user_tenant_member(tenant_id));

create policy inspection_schedules_update_anon
  on app.inspection_schedules
  for update
  to anon
  using (false)
  with check (false);

create policy inspection_schedules_delete_authenticated
  on app.inspection_schedules
  for delete
  to authenticated
  using (authz.is_current_user_tenant_member(tenant_id));

create policy inspection_schedules_delete_anon
  on app.inspection_schedules
  for delete
  to anon
  using (false);

comment on policy inspection_schedules_select_authenticated on app.inspection_schedules is
  'Allows authenticated users to view inspection schedules in their tenants.';
comment on policy inspection_schedules_insert_authenticated on app.inspection_schedules is
  'Allows authenticated users to create inspection schedules in their tenants.';
comment on policy inspection_schedules_update_authenticated on app.inspection_schedules is
  'Allows authenticated users to update inspection schedules in their tenants.';
comment on policy inspection_schedules_delete_authenticated on app.inspection_schedules is
  'Allows authenticated users to delete inspection schedules in their tenants.';

-- ============================================================================
-- 4. app.inspection_runs
-- ============================================================================

create table app.inspection_runs (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  template_id uuid references cfg.inspection_templates(id) on delete set null,
  inspection_schedule_id uuid references app.inspection_schedules(id) on delete set null,
  work_order_id uuid references app.work_orders(id) on delete set null,
  asset_id uuid references app.assets(id) on delete set null,
  location_id uuid references app.locations(id) on delete set null,
  status text not null default 'scheduled',
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  completed_by uuid references auth.users(id) on delete set null,
  conducted_by uuid references auth.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint inspection_runs_asset_or_location check (
    (asset_id is not null) or (location_id is not null)
  ),
  constraint inspection_runs_status_check check (
    status in ('scheduled', 'in_progress', 'completed', 'cancelled', 'overdue')
  ),
  constraint inspection_runs_status_format_check check (
    status ~ '^[a-z0-9_]+$' and length(status) >= 1 and length(status) <= 50
  )
);

comment on table app.inspection_runs is
  'One record per inspection execution. Ties to template, optional schedule/work order, and asset and/or location.';
comment on column app.inspection_runs.template_id is
  'Template used for this run. Null for ad hoc inspections.';
comment on column app.inspection_runs.work_order_id is
  'Optional work order this inspection is tied to.';
comment on column app.inspection_runs.asset_id is
  'Asset inspected. At least one of asset_id or location_id must be set.';
comment on column app.inspection_runs.location_id is
  'Location inspected. At least one of asset_id or location_id must be set.';
comment on column app.inspection_runs.status is
  'scheduled, in_progress, completed, cancelled, or overdue.';
comment on column app.inspection_runs.conducted_by is
  'User who performed the inspection.';

create index inspection_runs_tenant_status_idx
  on app.inspection_runs (tenant_id, status);

create index inspection_runs_tenant_completed_idx
  on app.inspection_runs (tenant_id, completed_at desc)
  where completed_at is not null;

create index inspection_runs_work_order_idx
  on app.inspection_runs (work_order_id)
  where work_order_id is not null;

create index inspection_runs_asset_idx
  on app.inspection_runs (asset_id)
  where asset_id is not null;

create index inspection_runs_location_idx
  on app.inspection_runs (location_id)
  where location_id is not null;

create index inspection_runs_template_idx
  on app.inspection_runs (template_id)
  where template_id is not null;

create index inspection_runs_schedule_idx
  on app.inspection_runs (inspection_schedule_id)
  where inspection_schedule_id is not null;

create trigger inspection_runs_set_updated_at
  before update on app.inspection_runs
  for each row
  execute function util.set_updated_at();

alter table app.inspection_runs enable row level security;

create policy inspection_runs_select_authenticated
  on app.inspection_runs
  for select
  to authenticated
  using (authz.is_current_user_tenant_member(tenant_id));

create policy inspection_runs_select_anon
  on app.inspection_runs
  for select
  to anon
  using (false);

create policy inspection_runs_insert_authenticated
  on app.inspection_runs
  for insert
  to authenticated
  with check (authz.is_current_user_tenant_member(tenant_id));

create policy inspection_runs_insert_anon
  on app.inspection_runs
  for insert
  to anon
  with check (false);

create policy inspection_runs_update_authenticated
  on app.inspection_runs
  for update
  to authenticated
  using (authz.is_current_user_tenant_member(tenant_id))
  with check (authz.is_current_user_tenant_member(tenant_id));

create policy inspection_runs_update_anon
  on app.inspection_runs
  for update
  to anon
  using (false)
  with check (false);

create policy inspection_runs_delete_authenticated
  on app.inspection_runs
  for delete
  to authenticated
  using (authz.is_current_user_tenant_member(tenant_id));

create policy inspection_runs_delete_anon
  on app.inspection_runs
  for delete
  to anon
  using (false);

comment on policy inspection_runs_select_authenticated on app.inspection_runs is
  'Allows authenticated users to view inspection runs in their tenants.';
comment on policy inspection_runs_insert_authenticated on app.inspection_runs is
  'Allows authenticated users to create inspection runs in their tenants.';
comment on policy inspection_runs_update_authenticated on app.inspection_runs is
  'Allows authenticated users to update inspection runs in their tenants.';
comment on policy inspection_runs_delete_authenticated on app.inspection_runs is
  'Allows authenticated users to delete inspection runs in their tenants.';

-- ============================================================================
-- 5. app.inspection_run_items
-- ============================================================================

create table app.inspection_run_items (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  inspection_run_id uuid not null references app.inspection_runs(id) on delete cascade,
  template_item_id uuid not null references cfg.inspection_template_items(id) on delete restrict,
  result text not null default 'not_checked',
  notes text,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint inspection_run_items_run_template_item_unique unique (inspection_run_id, template_item_id),
  constraint inspection_run_items_result_check check (
    result in ('pass', 'fail', 'na', 'not_checked')
  )
);

comment on table app.inspection_run_items is
  'Per-run, per-checklist-item result. Audit trail of what was checked and the outcome.';
comment on column app.inspection_run_items.result is
  'pass, fail, na (not applicable), or not_checked.';
comment on column app.inspection_run_items.notes is
  'Optional notes for this item.';

create index inspection_run_items_run_idx
  on app.inspection_run_items (inspection_run_id);

create index inspection_run_items_tenant_idx
  on app.inspection_run_items (tenant_id);

create trigger inspection_run_items_set_updated_at
  before update on app.inspection_run_items
  for each row
  execute function util.set_updated_at();

alter table app.inspection_run_items enable row level security;

create policy inspection_run_items_select_authenticated
  on app.inspection_run_items
  for select
  to authenticated
  using (authz.is_current_user_tenant_member(tenant_id));

create policy inspection_run_items_select_anon
  on app.inspection_run_items
  for select
  to anon
  using (false);

create policy inspection_run_items_insert_authenticated
  on app.inspection_run_items
  for insert
  to authenticated
  with check (authz.is_current_user_tenant_member(tenant_id));

create policy inspection_run_items_insert_anon
  on app.inspection_run_items
  for insert
  to anon
  with check (false);

create policy inspection_run_items_update_authenticated
  on app.inspection_run_items
  for update
  to authenticated
  using (authz.is_current_user_tenant_member(tenant_id))
  with check (authz.is_current_user_tenant_member(tenant_id));

create policy inspection_run_items_update_anon
  on app.inspection_run_items
  for update
  to anon
  using (false)
  with check (false);

create policy inspection_run_items_delete_authenticated
  on app.inspection_run_items
  for delete
  to authenticated
  using (authz.is_current_user_tenant_member(tenant_id));

create policy inspection_run_items_delete_anon
  on app.inspection_run_items
  for delete
  to anon
  using (false);

comment on policy inspection_run_items_select_authenticated on app.inspection_run_items is
  'Allows authenticated users to view inspection run items in their tenants.';
comment on policy inspection_run_items_insert_authenticated on app.inspection_run_items is
  'Allows authenticated users to create inspection run items in their tenants.';
comment on policy inspection_run_items_update_authenticated on app.inspection_run_items is
  'Allows authenticated users to update inspection run items in their tenants.';
comment on policy inspection_run_items_delete_authenticated on app.inspection_run_items is
  'Allows authenticated users to delete inspection run items in their tenants.';

-- ============================================================================
-- 6. app.incidents
-- ============================================================================

create table app.incidents (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  type text not null default 'incident',
  severity text not null default 'medium',
  title text not null,
  description text,
  occurred_at timestamptz not null default pg_catalog.now(),
  reported_at timestamptz not null default pg_catalog.now(),
  reported_by uuid references auth.users(id) on delete set null,
  location_id uuid references app.locations(id) on delete set null,
  asset_id uuid references app.assets(id) on delete set null,
  work_order_id uuid references app.work_orders(id) on delete set null,
  status text not null default 'open',
  closed_at timestamptz,
  closed_by uuid references auth.users(id) on delete set null,
  metadata jsonb default '{}',
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint incidents_type_check check (
    type in ('incident', 'near_miss', 'event')
  ),
  constraint incidents_severity_check check (
    severity in ('low', 'medium', 'high', 'critical')
  ),
  constraint incidents_status_check check (
    status in ('open', 'investigating', 'resolved', 'closed')
  ),
  constraint incidents_title_length_check check (
    length(title) >= 1 and length(title) <= 500
  )
);

comment on table app.incidents is
  'Safety/compliance events: incident, near-miss, or generic event. Tracks severity, status, and optional link to location, asset, work order.';
comment on column app.incidents.type is
  'incident, near_miss, or event.';
comment on column app.incidents.severity is
  'low, medium, high, or critical.';
comment on column app.incidents.occurred_at is
  'When the incident occurred.';
comment on column app.incidents.reported_at is
  'When the incident was reported.';
comment on column app.incidents.metadata is
  'Extensible JSONB for industry-specific fields.';

create index incidents_tenant_occurred_idx
  on app.incidents (tenant_id, occurred_at desc);

create index incidents_tenant_status_idx
  on app.incidents (tenant_id, status);

create index incidents_tenant_type_idx
  on app.incidents (tenant_id, type);

create index incidents_location_idx
  on app.incidents (location_id)
  where location_id is not null;

create index incidents_asset_idx
  on app.incidents (asset_id)
  where asset_id is not null;

create trigger incidents_set_updated_at
  before update on app.incidents
  for each row
  execute function util.set_updated_at();

alter table app.incidents enable row level security;

create policy incidents_select_authenticated
  on app.incidents
  for select
  to authenticated
  using (authz.is_current_user_tenant_member(tenant_id));

create policy incidents_select_anon
  on app.incidents
  for select
  to anon
  using (false);

create policy incidents_insert_authenticated
  on app.incidents
  for insert
  to authenticated
  with check (authz.is_current_user_tenant_member(tenant_id));

create policy incidents_insert_anon
  on app.incidents
  for insert
  to anon
  with check (false);

create policy incidents_update_authenticated
  on app.incidents
  for update
  to authenticated
  using (authz.is_current_user_tenant_member(tenant_id))
  with check (authz.is_current_user_tenant_member(tenant_id));

create policy incidents_update_anon
  on app.incidents
  for update
  to anon
  using (false)
  with check (false);

create policy incidents_delete_authenticated
  on app.incidents
  for delete
  to authenticated
  using (authz.is_current_user_tenant_member(tenant_id));

create policy incidents_delete_anon
  on app.incidents
  for delete
  to anon
  using (false);

comment on policy incidents_select_authenticated on app.incidents is
  'Allows authenticated users to view incidents in their tenants.';
comment on policy incidents_insert_authenticated on app.incidents is
  'Allows authenticated users to create incidents in their tenants.';
comment on policy incidents_update_authenticated on app.incidents is
  'Allows authenticated users to update incidents in their tenants.';
comment on policy incidents_delete_authenticated on app.incidents is
  'Allows authenticated users to delete incidents in their tenants.';

-- ============================================================================
-- 7. app.incident_actions
-- ============================================================================

create table app.incident_actions (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  incident_id uuid not null references app.incidents(id) on delete cascade,
  action_type text not null default 'corrective',
  description text not null,
  due_date date,
  assigned_to uuid references auth.users(id) on delete set null,
  status text not null default 'pending',
  completed_at timestamptz,
  completed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint incident_actions_action_type_check check (
    action_type in ('corrective', 'preventive', 'containment')
  ),
  constraint incident_actions_status_check check (
    status in ('pending', 'in_progress', 'completed', 'cancelled')
  ),
  constraint incident_actions_completed_consistency check (
    (completed_by is null) = (completed_at is null)
  ),
  constraint incident_actions_description_length_check check (
    length(description) >= 1 and length(description) <= 2000
  )
);

comment on table app.incident_actions is
  'Follow-up actions tied to an incident (corrective, preventive, containment). Tracks due date, assignee, and completion.';
comment on column app.incident_actions.action_type is
  'corrective, preventive, or containment.';
comment on column app.incident_actions.status is
  'pending, in_progress, completed, or cancelled.';

create index incident_actions_incident_idx
  on app.incident_actions (incident_id);

create index incident_actions_tenant_due_idx
  on app.incident_actions (tenant_id, due_date)
  where due_date is not null;

create index incident_actions_assigned_idx
  on app.incident_actions (assigned_to)
  where assigned_to is not null;

create trigger incident_actions_set_updated_at
  before update on app.incident_actions
  for each row
  execute function util.set_updated_at();

alter table app.incident_actions enable row level security;

create policy incident_actions_select_authenticated
  on app.incident_actions
  for select
  to authenticated
  using (authz.is_current_user_tenant_member(tenant_id));

create policy incident_actions_select_anon
  on app.incident_actions
  for select
  to anon
  using (false);

create policy incident_actions_insert_authenticated
  on app.incident_actions
  for insert
  to authenticated
  with check (authz.is_current_user_tenant_member(tenant_id));

create policy incident_actions_insert_anon
  on app.incident_actions
  for insert
  to anon
  with check (false);

create policy incident_actions_update_authenticated
  on app.incident_actions
  for update
  to authenticated
  using (authz.is_current_user_tenant_member(tenant_id))
  with check (authz.is_current_user_tenant_member(tenant_id));

create policy incident_actions_update_anon
  on app.incident_actions
  for update
  to anon
  using (false)
  with check (false);

create policy incident_actions_delete_authenticated
  on app.incident_actions
  for delete
  to authenticated
  using (authz.is_current_user_tenant_member(tenant_id));

create policy incident_actions_delete_anon
  on app.incident_actions
  for delete
  to anon
  using (false);

comment on policy incident_actions_select_authenticated on app.incident_actions is
  'Allows authenticated users to view incident actions in their tenants.';
comment on policy incident_actions_insert_authenticated on app.incident_actions is
  'Allows authenticated users to create incident actions in their tenants.';
comment on policy incident_actions_update_authenticated on app.incident_actions is
  'Allows authenticated users to update incident actions in their tenants.';
comment on policy incident_actions_delete_authenticated on app.incident_actions is
  'Allows authenticated users to delete incident actions in their tenants.';

-- ============================================================================
-- 8. Grants for app/cfg tables (for views and RPCs)
-- ============================================================================

grant select on cfg.inspection_templates to authenticated;
grant select on cfg.inspection_templates to anon;
grant select on cfg.inspection_template_items to authenticated;
grant select on cfg.inspection_template_items to anon;
grant select on app.inspection_schedules to authenticated;
grant select on app.inspection_schedules to anon;
grant select, insert, update, delete on app.inspection_runs to authenticated;
grant select, insert, update, delete on app.inspection_run_items to authenticated;
grant select, insert, update, delete on app.incidents to authenticated;
grant select, insert, update, delete on app.incident_actions to authenticated;

-- ============================================================================
-- 9. Public views (security_invoker = true, tenant filter)
-- ============================================================================

create or replace view public.v_inspection_templates
with (security_invoker = true)
as
select
  it.id,
  it.tenant_id,
  it.name,
  it.description,
  it.category,
  it.trigger_config,
  it.is_system,
  it.created_at,
  it.updated_at,
  (select count(*)::integer from cfg.inspection_template_items iti where iti.template_id = it.id) as item_count
from cfg.inspection_templates it
where it.tenant_id = authz.get_current_tenant_id()
order by it.name asc;

comment on view public.v_inspection_templates is
  'Inspection templates for current tenant. Uses SECURITY INVOKER. Clients must set tenant context via rpc_set_tenant_context. Includes item_count.';

grant select on public.v_inspection_templates to authenticated;
grant select on public.v_inspection_templates to anon;

create or replace view public.v_inspection_template_items
with (security_invoker = true)
as
select
  iti.id,
  iti.template_id,
  it.tenant_id,
  iti.description,
  iti.required,
  iti.display_order,
  iti.created_at,
  iti.updated_at
from cfg.inspection_template_items iti
join cfg.inspection_templates it on it.id = iti.template_id
where it.tenant_id = authz.get_current_tenant_id()
order by iti.template_id, iti.display_order asc;

comment on view public.v_inspection_template_items is
  'Inspection template checklist items for current tenant. Uses SECURITY INVOKER. Ordered by template and display_order.';

grant select on public.v_inspection_template_items to authenticated;
grant select on public.v_inspection_template_items to anon;

create or replace view public.v_inspection_schedules
with (security_invoker = true)
as
select
  s.id,
  s.tenant_id,
  s.template_id,
  it.name as template_name,
  s.asset_id,
  a.name as asset_name,
  s.location_id,
  l.name as location_name,
  s.title,
  s.trigger_config,
  s.next_due_at,
  s.is_active,
  s.created_at,
  s.updated_at
from app.inspection_schedules s
left join app.assets a on a.id = s.asset_id and a.tenant_id = s.tenant_id
left join app.locations l on l.id = s.location_id and l.tenant_id = s.tenant_id
join cfg.inspection_templates it on it.id = s.template_id
where s.tenant_id = authz.get_current_tenant_id()
order by s.next_due_at asc nulls last;

comment on view public.v_inspection_schedules is
  'Inspection schedules for current tenant with template, asset, and location names. Uses SECURITY INVOKER.';

grant select on public.v_inspection_schedules to authenticated;
grant select on public.v_inspection_schedules to anon;

create or replace view public.v_inspection_runs
with (security_invoker = true)
as
select
  r.id,
  r.tenant_id,
  r.template_id,
  it.name as template_name,
  r.inspection_schedule_id,
  r.work_order_id,
  wo.title as work_order_title,
  r.asset_id,
  a.name as asset_name,
  r.location_id,
  l.name as location_name,
  r.status,
  r.scheduled_at,
  r.started_at,
  r.completed_at,
  r.completed_by,
  p_completed.full_name as completed_by_name,
  r.conducted_by,
  p_conducted.full_name as conducted_by_name,
  r.notes,
  r.created_at,
  r.updated_at
from app.inspection_runs r
left join cfg.inspection_templates it on it.id = r.template_id
left join app.work_orders wo on wo.id = r.work_order_id and wo.tenant_id = r.tenant_id
left join app.assets a on a.id = r.asset_id and a.tenant_id = r.tenant_id
left join app.locations l on l.id = r.location_id and l.tenant_id = r.tenant_id
left join app.profiles p_completed on p_completed.user_id = r.completed_by and p_completed.tenant_id = r.tenant_id
left join app.profiles p_conducted on p_conducted.user_id = r.conducted_by and p_conducted.tenant_id = r.tenant_id
where r.tenant_id = authz.get_current_tenant_id()
order by r.scheduled_at desc nulls last, r.created_at desc;

comment on view public.v_inspection_runs is
  'Inspection runs for current tenant with template, work order, asset, location, and conductor names. Uses SECURITY INVOKER.';

grant select on public.v_inspection_runs to authenticated;
grant select on public.v_inspection_runs to anon;

create or replace view public.v_inspection_run_items
with (security_invoker = true)
as
select
  ri.id,
  ri.tenant_id,
  ri.inspection_run_id,
  ri.template_item_id,
  iti.description as template_item_description,
  iti.required as template_item_required,
  ri.result,
  ri.notes,
  ri.created_at,
  ri.updated_at
from app.inspection_run_items ri
join app.inspection_runs r on r.id = ri.inspection_run_id and r.tenant_id = ri.tenant_id
join cfg.inspection_template_items iti on iti.id = ri.template_item_id
where ri.tenant_id = authz.get_current_tenant_id()
order by ri.inspection_run_id, iti.display_order asc;

comment on view public.v_inspection_run_items is
  'Inspection run items with template item description for current tenant. Uses SECURITY INVOKER.';

grant select on public.v_inspection_run_items to authenticated;
grant select on public.v_inspection_run_items to anon;

create or replace view public.v_incidents
with (security_invoker = true)
as
select
  i.id,
  i.tenant_id,
  i.type,
  i.severity,
  i.title,
  i.description,
  i.occurred_at,
  i.reported_at,
  i.reported_by,
  p_reporter.full_name as reported_by_name,
  i.location_id,
  l.name as location_name,
  i.asset_id,
  a.name as asset_name,
  i.work_order_id,
  wo.title as work_order_title,
  i.status,
  i.closed_at,
  i.closed_by,
  p_closed.full_name as closed_by_name,
  i.metadata,
  i.created_at,
  i.updated_at
from app.incidents i
left join app.profiles p_reporter on p_reporter.user_id = i.reported_by and p_reporter.tenant_id = i.tenant_id
left join app.profiles p_closed on p_closed.user_id = i.closed_by and p_closed.tenant_id = i.tenant_id
left join app.locations l on l.id = i.location_id and l.tenant_id = i.tenant_id
left join app.assets a on a.id = i.asset_id and a.tenant_id = i.tenant_id
left join app.work_orders wo on wo.id = i.work_order_id and wo.tenant_id = i.tenant_id
where i.tenant_id = authz.get_current_tenant_id()
order by i.occurred_at desc;

comment on view public.v_incidents is
  'Incidents for current tenant with reporter, location, asset, work order names. Uses SECURITY INVOKER.';

grant select on public.v_incidents to authenticated;
grant select on public.v_incidents to anon;

create or replace view public.v_incident_actions
with (security_invoker = true)
as
select
  ia.id,
  ia.tenant_id,
  ia.incident_id,
  i.title as incident_title,
  i.severity as incident_severity,
  ia.action_type,
  ia.description,
  ia.due_date,
  ia.assigned_to,
  p_assigned.full_name as assigned_to_name,
  ia.status,
  ia.completed_at,
  ia.completed_by,
  p_completed.full_name as completed_by_name,
  ia.created_at,
  ia.updated_at
from app.incident_actions ia
join app.incidents i on i.id = ia.incident_id and i.tenant_id = ia.tenant_id
left join app.profiles p_assigned on p_assigned.user_id = ia.assigned_to and p_assigned.tenant_id = ia.tenant_id
left join app.profiles p_completed on p_completed.user_id = ia.completed_by and p_completed.tenant_id = ia.tenant_id
where ia.tenant_id = authz.get_current_tenant_id()
order by ia.incident_id, ia.due_date asc nulls last;

comment on view public.v_incident_actions is
  'Incident actions with incident title and assignee name for current tenant. Uses SECURITY INVOKER.';

grant select on public.v_incident_actions to authenticated;
grant select on public.v_incident_actions to anon;

-- ============================================================================
-- 10. RPCs: inspection templates (tenant.admin), schedules, runs, incidents, actions, compliance
-- ============================================================================

set check_function_bodies = off;

-- Inspection template create (checklist_items jsonb array like PM templates)
create or replace function public.rpc_create_inspection_template(
  p_tenant_id uuid,
  p_name text,
  p_description text default null,
  p_category text default null,
  p_trigger_config jsonb default null,
  p_checklist_items jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_template_id uuid;
  v_item jsonb;
  v_ordinal integer;
begin
  perform util.check_rate_limit('inspection_template_create', null, 20, 1, auth.uid(), p_tenant_id);
  v_user_id := authz.rpc_setup(p_tenant_id, 'tenant.admin');

  if length(p_name) < 1 or length(p_name) > 255 then
    raise exception using message = 'Template name must be between 1 and 255 characters', errcode = '23514';
  end if;

  insert into cfg.inspection_templates (tenant_id, name, description, category, trigger_config)
  values (p_tenant_id, p_name, p_description, p_category, p_trigger_config)
  returning id into v_template_id;

  if p_checklist_items is not null and jsonb_typeof(p_checklist_items) = 'array' then
    for v_item, v_ordinal in
      select value, ordinality
      from jsonb_array_elements(p_checklist_items) with ordinality as t(value, ordinality)
    loop
      if v_item->>'description' is not null and length((v_item->>'description')::text) >= 1 then
        insert into cfg.inspection_template_items (template_id, description, required, display_order)
        values (
          v_template_id,
          (v_item->>'description')::text,
          coalesce((v_item->>'required')::boolean, false),
          v_ordinal - 1
        );
      end if;
    end loop;
  end if;

  return v_template_id;
end;
$$;

comment on function public.rpc_create_inspection_template(uuid, text, text, text, jsonb, jsonb) is
  'Creates inspection template and optional checklist items. Requires tenant.admin. Rate limited. Returns template id.';

revoke all on function public.rpc_create_inspection_template(uuid, text, text, text, jsonb, jsonb) from public;
grant execute on function public.rpc_create_inspection_template(uuid, text, text, text, jsonb, jsonb) to authenticated;

-- Inspection template update
create or replace function public.rpc_update_inspection_template(
  p_tenant_id uuid,
  p_template_id uuid,
  p_name text default null,
  p_description text default null,
  p_category text default null,
  p_trigger_config jsonb default null,
  p_checklist_items jsonb default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_tenant_id uuid;
  v_item jsonb;
  v_ordinal integer;
begin
  perform util.check_rate_limit('inspection_template_update', null, 20, 1, auth.uid(), p_tenant_id);
  v_user_id := authz.rpc_setup(p_tenant_id, 'tenant.admin');

  select tenant_id into v_tenant_id from cfg.inspection_templates where id = p_template_id;
  if not found or v_tenant_id != p_tenant_id then
    raise exception using message = 'Inspection template not found or not in tenant', errcode = 'P0001';
  end if;

  update cfg.inspection_templates
  set
    name = coalesce(p_name, name),
    description = coalesce(p_description, description),
    category = coalesce(p_category, category),
    trigger_config = coalesce(p_trigger_config, trigger_config)
  where id = p_template_id;

  if p_checklist_items is not null then
    delete from cfg.inspection_template_items where template_id = p_template_id;
    if jsonb_typeof(p_checklist_items) = 'array' then
      for v_item, v_ordinal in
        select value, ordinality
        from jsonb_array_elements(p_checklist_items) with ordinality as t(value, ordinality)
      loop
        if v_item->>'description' is not null and length((v_item->>'description')::text) >= 1 then
          insert into cfg.inspection_template_items (template_id, description, required, display_order)
          values (
            p_template_id,
            (v_item->>'description')::text,
            coalesce((v_item->>'required')::boolean, false),
            v_ordinal - 1
          );
        end if;
      end loop;
    end if;
  end if;
end;
$$;

comment on function public.rpc_update_inspection_template(uuid, uuid, text, text, text, jsonb, jsonb) is
  'Updates inspection template and optionally replaces checklist items. Requires tenant.admin.';

revoke all on function public.rpc_update_inspection_template(uuid, uuid, text, text, text, jsonb, jsonb) from public;
grant execute on function public.rpc_update_inspection_template(uuid, uuid, text, text, text, jsonb, jsonb) to authenticated;

-- Inspection schedule create
create or replace function public.rpc_create_inspection_schedule(
  p_tenant_id uuid,
  p_template_id uuid,
  p_title text,
  p_asset_id uuid default null,
  p_location_id uuid default null,
  p_trigger_config jsonb default '{}',
  p_next_due_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_schedule_id uuid;
begin
  v_user_id := authz.validate_authenticated();
  perform util.check_rate_limit('inspection_schedule_create', null, 20, 1, v_user_id, p_tenant_id);
  if not authz.is_tenant_member(v_user_id, p_tenant_id) then
    raise exception using message = 'Unauthorized: User is not a member of this tenant', errcode = '42501';
  end if;
  if (p_asset_id is null) and (p_location_id is null) then
    raise exception using message = 'At least one of asset_id or location_id is required', errcode = '23514';
  end if;
  if not exists (select 1 from cfg.inspection_templates where id = p_template_id and tenant_id = p_tenant_id) then
    raise exception using message = 'Inspection template not found or not in tenant', errcode = '23503';
  end if;

  insert into app.inspection_schedules (tenant_id, template_id, asset_id, location_id, title, trigger_config, next_due_at)
  values (p_tenant_id, p_template_id, p_asset_id, p_location_id, p_title, coalesce(p_trigger_config, '{}'), p_next_due_at)
  returning id into v_schedule_id;
  return v_schedule_id;
end;
$$;

comment on function public.rpc_create_inspection_schedule(uuid, uuid, text, uuid, uuid, jsonb, timestamptz) is
  'Creates an inspection schedule. At least one of asset_id or location_id required. Tenant membership required.';

revoke all on function public.rpc_create_inspection_schedule(uuid, uuid, text, uuid, uuid, jsonb, timestamptz) from public;
grant execute on function public.rpc_create_inspection_schedule(uuid, uuid, text, uuid, uuid, jsonb, timestamptz) to authenticated;

-- Inspection schedule update
create or replace function public.rpc_update_inspection_schedule(
  p_tenant_id uuid,
  p_schedule_id uuid,
  p_title text default null,
  p_asset_id uuid default null,
  p_location_id uuid default null,
  p_trigger_config jsonb default null,
  p_next_due_at timestamptz default null,
  p_is_active boolean default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_tenant_id uuid;
begin
  v_user_id := authz.validate_authenticated();
  perform util.check_rate_limit('inspection_schedule_update', null, 20, 1, v_user_id, p_tenant_id);
  if not authz.is_tenant_member(v_user_id, p_tenant_id) then
    raise exception using message = 'Unauthorized: User is not a member of this tenant', errcode = '42501';
  end if;

  select tenant_id into v_tenant_id from app.inspection_schedules where id = p_schedule_id;
  if not found or v_tenant_id != p_tenant_id then
    raise exception using message = 'Inspection schedule not found or not in tenant', errcode = 'P0001';
  end if;

  update app.inspection_schedules
  set
    title = coalesce(p_title, title),
    asset_id = coalesce(p_asset_id, asset_id),
    location_id = coalesce(p_location_id, location_id),
    trigger_config = coalesce(p_trigger_config, trigger_config),
    next_due_at = coalesce(p_next_due_at, next_due_at),
    is_active = coalesce(p_is_active, is_active)
  where id = p_schedule_id;
end;
$$;

comment on function public.rpc_update_inspection_schedule(uuid, uuid, text, uuid, uuid, jsonb, timestamptz, boolean) is
  'Updates inspection schedule. Ensures at least one of asset_id or location_id remains set.';

revoke all on function public.rpc_update_inspection_schedule(uuid, uuid, text, uuid, uuid, jsonb, timestamptz, boolean) from public;
grant execute on function public.rpc_update_inspection_schedule(uuid, uuid, text, uuid, uuid, jsonb, timestamptz, boolean) to authenticated;

-- Inspection run create
create or replace function public.rpc_create_inspection_run(
  p_tenant_id uuid,
  p_template_id uuid default null,
  p_inspection_schedule_id uuid default null,
  p_work_order_id uuid default null,
  p_asset_id uuid default null,
  p_location_id uuid default null,
  p_scheduled_at timestamptz default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_run_id uuid;
begin
  v_user_id := authz.validate_authenticated();
  perform util.check_rate_limit('inspection_run_create', null, 30, 1, v_user_id, p_tenant_id);
  if not authz.is_tenant_member(v_user_id, p_tenant_id) then
    raise exception using message = 'Unauthorized: User is not a member of this tenant', errcode = '42501';
  end if;
  if (p_asset_id is null) and (p_location_id is null) then
    raise exception using message = 'At least one of asset_id or location_id is required', errcode = '23514';
  end if;

  insert into app.inspection_runs (
    tenant_id, template_id, inspection_schedule_id, work_order_id, asset_id, location_id,
    status, scheduled_at, notes
  )
  values (
    p_tenant_id, p_template_id, p_inspection_schedule_id, p_work_order_id, p_asset_id, p_location_id,
    'scheduled', p_scheduled_at, p_notes
  )
  returning id into v_run_id;
  return v_run_id;
end;
$$;

comment on function public.rpc_create_inspection_run(uuid, uuid, uuid, uuid, uuid, uuid, timestamptz, text) is
  'Creates an inspection run. At least one of asset_id or location_id required.';

revoke all on function public.rpc_create_inspection_run(uuid, uuid, uuid, uuid, uuid, uuid, timestamptz, text) from public;
grant execute on function public.rpc_create_inspection_run(uuid, uuid, uuid, uuid, uuid, uuid, timestamptz, text) to authenticated;

-- Inspection run update
create or replace function public.rpc_update_inspection_run(
  p_tenant_id uuid,
  p_run_id uuid,
  p_status text default null,
  p_scheduled_at timestamptz default null,
  p_started_at timestamptz default null,
  p_notes text default null,
  p_conducted_by uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_tenant_id uuid;
begin
  v_user_id := authz.validate_authenticated();
  perform util.check_rate_limit('inspection_run_update', null, 30, 1, v_user_id, p_tenant_id);
  if not authz.is_tenant_member(v_user_id, p_tenant_id) then
    raise exception using message = 'Unauthorized: User is not a member of this tenant', errcode = '42501';
  end if;

  select tenant_id into v_tenant_id from app.inspection_runs where id = p_run_id;
  if not found or v_tenant_id != p_tenant_id then
    raise exception using message = 'Inspection run not found or not in tenant', errcode = 'P0001';
  end if;

  update app.inspection_runs
  set
    status = coalesce(p_status, status),
    scheduled_at = coalesce(p_scheduled_at, scheduled_at),
    started_at = coalesce(p_started_at, started_at),
    notes = coalesce(p_notes, notes),
    conducted_by = coalesce(p_conducted_by, conducted_by)
  where id = p_run_id;
end;
$$;

comment on function public.rpc_update_inspection_run(uuid, uuid, text, timestamptz, timestamptz, text, uuid) is
  'Updates inspection run fields.';

revoke all on function public.rpc_update_inspection_run(uuid, uuid, text, timestamptz, timestamptz, text, uuid) from public;
grant execute on function public.rpc_update_inspection_run(uuid, uuid, text, timestamptz, timestamptz, text, uuid) to authenticated;

-- Inspection run complete (with optional item results)
create or replace function public.rpc_complete_inspection_run(
  p_tenant_id uuid,
  p_run_id uuid,
  p_item_results jsonb default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_tenant_id uuid;
  v_item jsonb;
  v_template_item_id uuid;
  v_result text;
  v_notes text;
begin
  v_user_id := authz.validate_authenticated();
  perform util.check_rate_limit('inspection_run_complete', null, 30, 1, v_user_id, p_tenant_id);
  if not authz.is_tenant_member(v_user_id, p_tenant_id) then
    raise exception using message = 'Unauthorized: User is not a member of this tenant', errcode = '42501';
  end if;

  select tenant_id into v_tenant_id from app.inspection_runs where id = p_run_id;
  if not found or v_tenant_id != p_tenant_id then
    raise exception using message = 'Inspection run not found or not in tenant', errcode = 'P0001';
  end if;

  update app.inspection_runs
  set status = 'completed', completed_at = pg_catalog.now(), completed_by = v_user_id
  where id = p_run_id;

  if p_item_results is not null and jsonb_typeof(p_item_results) = 'array' then
    for v_item in select * from jsonb_array_elements(p_item_results)
    loop
      v_template_item_id := (v_item->>'template_item_id')::uuid;
      v_result := coalesce(v_item->>'result', 'not_checked');
      v_notes := v_item->>'notes';
      if v_template_item_id is not null and v_result in ('pass', 'fail', 'na', 'not_checked') then
        insert into app.inspection_run_items (tenant_id, inspection_run_id, template_item_id, result, notes)
        values (p_tenant_id, p_run_id, v_template_item_id, v_result, v_notes)
        on conflict (inspection_run_id, template_item_id) do update
        set result = excluded.result, notes = excluded.notes, updated_at = pg_catalog.now();
      end if;
    end loop;
  end if;
end;
$$;

comment on function public.rpc_complete_inspection_run(uuid, uuid, jsonb) is
  'Marks inspection run as completed and optionally upserts run items from item_results array (template_item_id, result, notes).';

revoke all on function public.rpc_complete_inspection_run(uuid, uuid, jsonb) from public;
grant execute on function public.rpc_complete_inspection_run(uuid, uuid, jsonb) to authenticated;

-- Incident create
create or replace function public.rpc_create_incident(
  p_tenant_id uuid,
  p_title text,
  p_type text default 'incident',
  p_severity text default 'medium',
  p_description text default null,
  p_occurred_at timestamptz default null,
  p_location_id uuid default null,
  p_asset_id uuid default null,
  p_work_order_id uuid default null,
  p_metadata jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_incident_id uuid;
begin
  v_user_id := authz.validate_authenticated();
  perform util.check_rate_limit('incident_create', null, 30, 1, v_user_id, p_tenant_id);
  if not authz.is_tenant_member(v_user_id, p_tenant_id) then
    raise exception using message = 'Unauthorized: User is not a member of this tenant', errcode = '42501';
  end if;
  if p_type not in ('incident', 'near_miss', 'event') then
    raise exception using message = 'type must be incident, near_miss, or event', errcode = '23514';
  end if;
  if p_severity not in ('low', 'medium', 'high', 'critical') then
    raise exception using message = 'severity must be low, medium, high, or critical', errcode = '23514';
  end if;

  insert into app.incidents (
    tenant_id, type, severity, title, description, occurred_at, reported_at, reported_by,
    location_id, asset_id, work_order_id, metadata
  )
  values (
    p_tenant_id, p_type, p_severity, p_title, p_description,
    coalesce(p_occurred_at, pg_catalog.now()), pg_catalog.now(), v_user_id,
    p_location_id, p_asset_id, p_work_order_id, coalesce(p_metadata, '{}')
  )
  returning id into v_incident_id;
  return v_incident_id;
end;
$$;

comment on function public.rpc_create_incident(uuid, text, text, text, text, timestamptz, uuid, uuid, uuid, jsonb) is
  'Creates an incident. type: incident|near_miss|event; severity: low|medium|high|critical.';

revoke all on function public.rpc_create_incident(uuid, text, text, text, text, timestamptz, uuid, uuid, uuid, jsonb) from public;
grant execute on function public.rpc_create_incident(uuid, text, text, text, text, timestamptz, uuid, uuid, uuid, jsonb) to authenticated;

-- Incident update
create or replace function public.rpc_update_incident(
  p_tenant_id uuid,
  p_incident_id uuid,
  p_title text default null,
  p_type text default null,
  p_severity text default null,
  p_description text default null,
  p_occurred_at timestamptz default null,
  p_status text default null,
  p_location_id uuid default null,
  p_asset_id uuid default null,
  p_work_order_id uuid default null,
  p_metadata jsonb default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_tenant_id uuid;
begin
  v_user_id := authz.validate_authenticated();
  perform util.check_rate_limit('incident_update', null, 30, 1, v_user_id, p_tenant_id);
  if not authz.is_tenant_member(v_user_id, p_tenant_id) then
    raise exception using message = 'Unauthorized: User is not a member of this tenant', errcode = '42501';
  end if;

  select tenant_id into v_tenant_id from app.incidents where id = p_incident_id;
  if not found or v_tenant_id != p_tenant_id then
    raise exception using message = 'Incident not found or not in tenant', errcode = 'P0001';
  end if;

  if p_type is not null and p_type not in ('incident', 'near_miss', 'event') then
    raise exception using message = 'type must be incident, near_miss, or event', errcode = '23514';
  end if;
  if p_severity is not null and p_severity not in ('low', 'medium', 'high', 'critical') then
    raise exception using message = 'severity must be low, medium, high, or critical', errcode = '23514';
  end if;
  if p_status is not null and p_status not in ('open', 'investigating', 'resolved', 'closed') then
    raise exception using message = 'status must be open, investigating, resolved, or closed', errcode = '23514';
  end if;

  update app.incidents
  set
    title = coalesce(p_title, title),
    type = coalesce(p_type, type),
    severity = coalesce(p_severity, severity),
    description = coalesce(p_description, description),
    occurred_at = coalesce(p_occurred_at, occurred_at),
    status = coalesce(p_status, status),
    location_id = coalesce(p_location_id, location_id),
    asset_id = coalesce(p_asset_id, asset_id),
    work_order_id = coalesce(p_work_order_id, work_order_id),
    metadata = coalesce(p_metadata, metadata)
  where id = p_incident_id;
end;
$$;

comment on function public.rpc_update_incident(uuid, uuid, text, text, text, text, timestamptz, text, uuid, uuid, uuid, jsonb) is
  'Updates incident fields.';

revoke all on function public.rpc_update_incident(uuid, uuid, text, text, text, text, timestamptz, text, uuid, uuid, uuid, jsonb) from public;
grant execute on function public.rpc_update_incident(uuid, uuid, text, text, text, text, timestamptz, text, uuid, uuid, uuid, jsonb) to authenticated;

-- Incident close
create or replace function public.rpc_close_incident(
  p_tenant_id uuid,
  p_incident_id uuid,
  p_status text default 'closed'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_tenant_id uuid;
begin
  v_user_id := authz.validate_authenticated();
  if not authz.is_tenant_member(v_user_id, p_tenant_id) then
    raise exception using message = 'Unauthorized: User is not a member of this tenant', errcode = '42501';
  end if;

  select tenant_id into v_tenant_id from app.incidents where id = p_incident_id;
  if not found or v_tenant_id != p_tenant_id then
    raise exception using message = 'Incident not found or not in tenant', errcode = 'P0001';
  end if;

  update app.incidents
  set
    status = case when p_status in ('resolved', 'closed') then p_status else 'closed' end,
    closed_at = pg_catalog.now(),
    closed_by = v_user_id
  where id = p_incident_id;
end;
$$;

comment on function public.rpc_close_incident(uuid, uuid, text) is
  'Marks incident as resolved or closed and sets closed_at/closed_by.';

revoke all on function public.rpc_close_incident(uuid, uuid, text) from public;
grant execute on function public.rpc_close_incident(uuid, uuid, text) to authenticated;

-- Incident action create
create or replace function public.rpc_create_incident_action(
  p_tenant_id uuid,
  p_incident_id uuid,
  p_description text,
  p_action_type text default 'corrective',
  p_due_date date default null,
  p_assigned_to uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_action_id uuid;
  v_tenant_id uuid;
begin
  v_user_id := authz.validate_authenticated();
  perform util.check_rate_limit('incident_action_create', null, 30, 1, v_user_id, p_tenant_id);
  if not authz.is_tenant_member(v_user_id, p_tenant_id) then
    raise exception using message = 'Unauthorized: User is not a member of this tenant', errcode = '42501';
  end if;

  select tenant_id into v_tenant_id from app.incidents where id = p_incident_id;
  if not found or v_tenant_id != p_tenant_id then
    raise exception using message = 'Incident not found or not in tenant', errcode = 'P0001';
  end if;
  if p_action_type not in ('corrective', 'preventive', 'containment') then
    raise exception using message = 'action_type must be corrective, preventive, or containment', errcode = '23514';
  end if;

  insert into app.incident_actions (tenant_id, incident_id, action_type, description, due_date, assigned_to)
  values (p_tenant_id, p_incident_id, p_action_type, p_description, p_due_date, p_assigned_to)
  returning id into v_action_id;
  return v_action_id;
end;
$$;

comment on function public.rpc_create_incident_action(uuid, uuid, text, text, date, uuid) is
  'Creates a corrective/preventive/containment action for an incident.';

revoke all on function public.rpc_create_incident_action(uuid, uuid, text, text, date, uuid) from public;
grant execute on function public.rpc_create_incident_action(uuid, uuid, text, text, date, uuid) to authenticated;

-- Incident action update
create or replace function public.rpc_update_incident_action(
  p_tenant_id uuid,
  p_action_id uuid,
  p_description text default null,
  p_due_date date default null,
  p_assigned_to uuid default null,
  p_status text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_tenant_id uuid;
begin
  v_user_id := authz.validate_authenticated();
  perform util.check_rate_limit('incident_action_update', null, 30, 1, v_user_id, p_tenant_id);
  if not authz.is_tenant_member(v_user_id, p_tenant_id) then
    raise exception using message = 'Unauthorized: User is not a member of this tenant', errcode = '42501';
  end if;

  select tenant_id into v_tenant_id from app.incident_actions where id = p_action_id;
  if not found or v_tenant_id != p_tenant_id then
    raise exception using message = 'Incident action not found or not in tenant', errcode = 'P0001';
  end if;
  if p_status is not null and p_status not in ('pending', 'in_progress', 'completed', 'cancelled') then
    raise exception using message = 'status must be pending, in_progress, completed, or cancelled', errcode = '23514';
  end if;

  update app.incident_actions
  set
    description = coalesce(p_description, description),
    due_date = coalesce(p_due_date, due_date),
    assigned_to = coalesce(p_assigned_to, assigned_to),
    status = coalesce(p_status, status)
  where id = p_action_id;
end;
$$;

comment on function public.rpc_update_incident_action(uuid, uuid, text, date, uuid, text) is
  'Updates incident action fields.';

revoke all on function public.rpc_update_incident_action(uuid, uuid, text, date, uuid, text) from public;
grant execute on function public.rpc_update_incident_action(uuid, uuid, text, date, uuid, text) to authenticated;

-- Incident action complete
create or replace function public.rpc_complete_incident_action(
  p_tenant_id uuid,
  p_action_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_tenant_id uuid;
begin
  v_user_id := authz.validate_authenticated();
  if not authz.is_tenant_member(v_user_id, p_tenant_id) then
    raise exception using message = 'Unauthorized: User is not a member of this tenant', errcode = '42501';
  end if;

  select tenant_id into v_tenant_id from app.incident_actions where id = p_action_id;
  if not found or v_tenant_id != p_tenant_id then
    raise exception using message = 'Incident action not found or not in tenant', errcode = 'P0001';
  end if;

  update app.incident_actions
  set status = 'completed', completed_at = pg_catalog.now(), completed_by = v_user_id
  where id = p_action_id;
end;
$$;

comment on function public.rpc_complete_incident_action(uuid, uuid) is
  'Marks incident action as completed and sets completed_at/completed_by.';

revoke all on function public.rpc_complete_incident_action(uuid, uuid) from public;
grant execute on function public.rpc_complete_incident_action(uuid, uuid) to authenticated;

-- Compliance: inspection history (date range, optional asset/location filter)
create or replace function public.rpc_compliance_inspection_history(
  p_tenant_id uuid,
  p_from_date date,
  p_to_date date,
  p_asset_id uuid default null,
  p_location_id uuid default null
)
returns table (
  run_id uuid,
  template_name text,
  asset_name text,
  location_name text,
  status text,
  scheduled_at timestamptz,
  completed_at timestamptz,
  conducted_by_name text,
  pass_count bigint,
  fail_count bigint,
  na_count bigint,
  not_checked_count bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  v_user_id := authz.validate_authenticated();
  if not authz.is_tenant_member(v_user_id, p_tenant_id) then
    raise exception using message = 'Unauthorized: User is not a member of this tenant', errcode = '42501';
  end if;

  return query
  select
    r.id as run_id,
    it.name as template_name,
    a.name as asset_name,
    l.name as location_name,
    r.status,
    r.scheduled_at,
    r.completed_at,
    p.full_name as conducted_by_name,
    (select count(*) from app.inspection_run_items ri where ri.inspection_run_id = r.id and ri.result = 'pass') as pass_count,
    (select count(*) from app.inspection_run_items ri where ri.inspection_run_id = r.id and ri.result = 'fail') as fail_count,
    (select count(*) from app.inspection_run_items ri where ri.inspection_run_id = r.id and ri.result = 'na') as na_count,
    (select count(*) from app.inspection_run_items ri where ri.inspection_run_id = r.id and ri.result = 'not_checked') as not_checked_count
  from app.inspection_runs r
  left join cfg.inspection_templates it on it.id = r.template_id
  left join app.assets a on a.id = r.asset_id and a.tenant_id = r.tenant_id
  left join app.locations l on l.id = r.location_id and l.tenant_id = r.tenant_id
  left join app.profiles p on p.user_id = r.conducted_by and p.tenant_id = r.tenant_id
  where r.tenant_id = p_tenant_id
    and (r.scheduled_at::date >= p_from_date and r.scheduled_at::date <= p_to_date
         or (r.scheduled_at is null and r.completed_at::date >= p_from_date and r.completed_at::date <= p_to_date)
         or (r.scheduled_at is null and r.completed_at is null and r.created_at::date >= p_from_date and r.created_at::date <= p_to_date))
    and (p_asset_id is null or r.asset_id = p_asset_id)
    and (p_location_id is null or r.location_id = p_location_id)
  order by r.completed_at desc nulls last, r.scheduled_at desc nulls last;
end;
$$;

comment on function public.rpc_compliance_inspection_history(uuid, date, date, uuid, uuid) is
  'Returns inspection runs in date range with pass/fail/na/not_checked counts for compliance reporting. Optional asset_id/location_id filter.';

revoke all on function public.rpc_compliance_inspection_history(uuid, date, date, uuid, uuid) from public;
grant execute on function public.rpc_compliance_inspection_history(uuid, date, date, uuid, uuid) to authenticated;

-- Compliance: incident report (date range, optional severity filter)
create or replace function public.rpc_compliance_incident_report(
  p_tenant_id uuid,
  p_from_date date,
  p_to_date date,
  p_severity text default null
)
returns table (
  incident_id uuid,
  type text,
  severity text,
  title text,
  occurred_at timestamptz,
  status text,
  closed_at timestamptz,
  action_count bigint,
  action_pending_count bigint,
  action_completed_count bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  v_user_id := authz.validate_authenticated();
  if not authz.is_tenant_member(v_user_id, p_tenant_id) then
    raise exception using message = 'Unauthorized: User is not a member of this tenant', errcode = '42501';
  end if;

  if p_severity is not null and p_severity not in ('low', 'medium', 'high', 'critical') then
    raise exception using message = 'severity must be low, medium, high, or critical', errcode = '23514';
  end if;

  return query
  select
    i.id as incident_id,
    i.type,
    i.severity,
    i.title,
    i.occurred_at,
    i.status,
    i.closed_at,
    (select count(*) from app.incident_actions ia where ia.incident_id = i.id) as action_count,
    (select count(*) from app.incident_actions ia where ia.incident_id = i.id and ia.status in ('pending', 'in_progress')) as action_pending_count,
    (select count(*) from app.incident_actions ia where ia.incident_id = i.id and ia.status = 'completed') as action_completed_count
  from app.incidents i
  where i.tenant_id = p_tenant_id
    and i.occurred_at::date >= p_from_date and i.occurred_at::date <= p_to_date
    and (p_severity is null or i.severity = p_severity)
  order by i.occurred_at desc;
end;
$$;

comment on function public.rpc_compliance_incident_report(uuid, date, date, text) is
  'Returns incidents in date range with action counts for compliance reporting. Optional severity filter.';

revoke all on function public.rpc_compliance_incident_report(uuid, date, date, text) from public;
grant execute on function public.rpc_compliance_incident_report(uuid, date, date, text) to authenticated;

set check_function_bodies = on;

-- ============================================================================
-- 11. Audit triggers (audit-ready history for compliance)
-- ============================================================================

create trigger inspection_templates_audit_trigger
  after insert or update or delete on cfg.inspection_templates
  for each row execute function audit.log_entity_change();

create trigger inspection_template_items_audit_trigger
  after insert or update or delete on cfg.inspection_template_items
  for each row execute function audit.log_entity_change();

create trigger inspection_schedules_audit_trigger
  after insert or update or delete on app.inspection_schedules
  for each row execute function audit.log_entity_change();

create trigger inspection_runs_audit_trigger
  after insert or update or delete on app.inspection_runs
  for each row execute function audit.log_entity_change();

create trigger inspection_run_items_audit_trigger
  after insert or update or delete on app.inspection_run_items
  for each row execute function audit.log_entity_change();

create trigger incidents_audit_trigger
  after insert or update or delete on app.incidents
  for each row execute function audit.log_entity_change();

create trigger incident_actions_audit_trigger
  after insert or update or delete on app.incident_actions
  for each row execute function audit.log_entity_change();
