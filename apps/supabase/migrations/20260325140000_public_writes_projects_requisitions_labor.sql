/*
 * migration: 20260325140000_public_writes_projects_requisitions_labor.sql
 *
 * purpose:
 *   - add cfg.permissions: project.manage, labor.crew.manage, labor.technician.manage
 *   - backfill admin role with new permissions for existing tenants
 *   - public rpcs: projects (create/update/delete), purchase requisitions + lines, labor crews/technicians/members
 *
 * affected: cfg.permissions, cfg.tenant_role_permissions, public.rpc_* (new)
 */

-- ============================================================================
-- 1. permissions + admin backfill
-- ============================================================================

insert into cfg.permissions (key, name, category, description)
values
  ('project.manage', 'Manage projects', 'project', 'Create, update, and delete projects for cost roll-up.'),
  ('labor.crew.manage', 'Manage crews', 'labor', 'Create, update, delete crews and crew membership.'),
  ('labor.technician.manage', 'Manage technicians', 'labor', 'Create and update technician records for tenant members.')
on conflict (key) do nothing;

insert into cfg.tenant_role_permissions (tenant_role_id, permission_id)
select tr.id, p.id
from cfg.tenant_roles tr
cross join cfg.permissions p
where tr.key = 'admin'
  and p.key in ('project.manage', 'labor.crew.manage', 'labor.technician.manage')
  and not exists (
    select 1
    from cfg.tenant_role_permissions x
    where x.tenant_role_id = tr.id
      and x.permission_id = p.id
  );

-- ============================================================================
-- 2. projects
-- ============================================================================

create or replace function public.rpc_create_project(
  p_tenant_id uuid,
  p_name text,
  p_code text default null,
  p_description text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform util.check_rate_limit('project_create', null, 30, 1, auth.uid(), p_tenant_id);
  perform authz.rpc_setup(p_tenant_id, 'project.manage');

  if p_name is null or length(trim(p_name)) < 1 then
    raise exception using message = 'name is required', errcode = '23514';
  end if;

  insert into app.projects (tenant_id, name, code, description)
  values (
    p_tenant_id,
    trim(p_name),
    case when p_code is not null and length(trim(p_code)) > 0 then trim(p_code) else null end,
    nullif(trim(p_description), '')
  )
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.rpc_create_project(uuid, text, text, text) is
  'Creates a project. Optional code must be unique per tenant when set. Requires project.manage.';

revoke all on function public.rpc_create_project(uuid, text, text, text) from public;
grant execute on function public.rpc_create_project(uuid, text, text, text) to authenticated;

create or replace function public.rpc_update_project(
  p_tenant_id uuid,
  p_project_id uuid,
  p_name text default null,
  p_code text default null,
  p_description text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row_tenant uuid;
begin
  perform util.check_rate_limit('project_update', null, 30, 1, auth.uid(), p_tenant_id);
  perform authz.rpc_setup(p_tenant_id, 'project.manage');

  select tenant_id into v_row_tenant
  from app.projects
  where id = p_project_id;

  if v_row_tenant is null or v_row_tenant <> p_tenant_id then
    raise exception using message = 'Project not found or wrong tenant', errcode = 'P0001';
  end if;

  if p_code is not null and length(trim(p_code)) > 0 then
    if exists (
      select 1
      from app.projects p2
      where p2.tenant_id = p_tenant_id
        and p2.code = trim(p_code)
        and p2.id <> p_project_id
    ) then
      raise exception using message = 'Project code already in use', errcode = '23505';
    end if;
  end if;

  update app.projects
  set
    name = coalesce(nullif(trim(p_name), ''), name),
    code = case
      when p_code is not null then nullif(trim(p_code), '')
      else code
    end,
    description = case
      when p_description is not null then nullif(trim(p_description), '')
      else description
    end,
    updated_at = pg_catalog.now()
  where id = p_project_id;
end;
$$;

comment on function public.rpc_update_project(uuid, uuid, text, text, text) is
  'Updates a project. Requires project.manage.';

revoke all on function public.rpc_update_project(uuid, uuid, text, text, text) from public;
grant execute on function public.rpc_update_project(uuid, uuid, text, text, text) to authenticated;

create or replace function public.rpc_delete_project(
  p_tenant_id uuid,
  p_project_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row_tenant uuid;
begin
  perform util.check_rate_limit('project_delete', null, 20, 1, auth.uid(), p_tenant_id);
  perform authz.rpc_setup(p_tenant_id, 'project.manage');

  select tenant_id into v_row_tenant
  from app.projects
  where id = p_project_id;

  if v_row_tenant is null or v_row_tenant <> p_tenant_id then
    raise exception using message = 'Project not found or wrong tenant', errcode = 'P0001';
  end if;

  delete from app.projects
  where id = p_project_id;
end;
$$;

comment on function public.rpc_delete_project(uuid, uuid) is
  'Deletes a project. Work orders project_id is set null via FK. Requires project.manage.';

revoke all on function public.rpc_delete_project(uuid, uuid) from public;
grant execute on function public.rpc_delete_project(uuid, uuid) to authenticated;

-- ============================================================================
-- 3. purchase requisitions (draft-only line edits)
-- ============================================================================

create or replace function public.rpc_create_purchase_requisition(
  p_tenant_id uuid,
  p_due_date date default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform util.check_rate_limit('purchase_requisition_create', null, 30, 1, auth.uid(), p_tenant_id);
  perform authz.rpc_setup(p_tenant_id, 'purchase_requisition.create');

  insert into app.purchase_requisitions (tenant_id, status, requested_by, due_date, notes)
  values (
    p_tenant_id,
    'draft',
    auth.uid(),
    p_due_date,
    nullif(trim(p_notes), '')
  )
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.rpc_create_purchase_requisition(uuid, date, text) is
  'Creates a draft purchase requisition. Requires purchase_requisition.create.';

revoke all on function public.rpc_create_purchase_requisition(uuid, date, text) from public;
grant execute on function public.rpc_create_purchase_requisition(uuid, date, text) to authenticated;

create or replace function public.rpc_add_purchase_requisition_line(
  p_tenant_id uuid,
  p_purchase_requisition_id uuid,
  p_part_id uuid,
  p_quantity numeric,
  p_estimated_unit_cost numeric default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_line_id uuid;
  v_pr_tenant uuid;
  v_pr_status text;
begin
  perform util.check_rate_limit('purchase_requisition_line_add', null, 60, 1, auth.uid(), p_tenant_id);
  perform authz.rpc_setup(p_tenant_id, 'purchase_requisition.edit');

  select tenant_id, status into v_pr_tenant, v_pr_status
  from app.purchase_requisitions
  where id = p_purchase_requisition_id;

  if v_pr_tenant is null or v_pr_tenant <> p_tenant_id then
    raise exception using message = 'Requisition not found or wrong tenant', errcode = 'P0001';
  end if;

  if v_pr_status <> 'draft' then
    raise exception using message = 'Requisition is not editable (not draft)', errcode = '23503';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception using message = 'quantity must be positive', errcode = '23514';
  end if;

  if not exists (
    select 1 from app.parts pt
    where pt.id = p_part_id
      and pt.tenant_id = p_tenant_id
  ) then
    raise exception using message = 'Part not found or wrong tenant', errcode = '23503';
  end if;

  insert into app.purchase_requisition_lines (
    purchase_requisition_id,
    part_id,
    quantity,
    estimated_unit_cost,
    notes
  )
  values (
    p_purchase_requisition_id,
    p_part_id,
    p_quantity,
    p_estimated_unit_cost,
    nullif(trim(p_notes), '')
  )
  returning id into v_line_id;

  return v_line_id;
end;
$$;

comment on function public.rpc_add_purchase_requisition_line(uuid, uuid, uuid, numeric, numeric, text) is
  'Adds a line to a draft requisition. Requires purchase_requisition.edit.';

revoke all on function public.rpc_add_purchase_requisition_line(uuid, uuid, uuid, numeric, numeric, text) from public;
grant execute on function public.rpc_add_purchase_requisition_line(uuid, uuid, uuid, numeric, numeric, text) to authenticated;

create or replace function public.rpc_update_purchase_requisition_line(
  p_tenant_id uuid,
  p_line_id uuid,
  p_quantity numeric default null,
  p_estimated_unit_cost numeric default null,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
  v_pr_tenant uuid;
begin
  perform util.check_rate_limit('purchase_requisition_line_update', null, 60, 1, auth.uid(), p_tenant_id);
  perform authz.rpc_setup(p_tenant_id, 'purchase_requisition.edit');

  select pr.status, pr.tenant_id into v_status, v_pr_tenant
  from app.purchase_requisition_lines ln
  join app.purchase_requisitions pr on pr.id = ln.purchase_requisition_id
  where ln.id = p_line_id;

  if v_pr_tenant is null or v_pr_tenant <> p_tenant_id then
    raise exception using message = 'Line not found or wrong tenant', errcode = 'P0001';
  end if;

  if v_status <> 'draft' then
    raise exception using message = 'Requisition is not editable (not draft)', errcode = '23503';
  end if;

  if p_quantity is not null and p_quantity <= 0 then
    raise exception using message = 'quantity must be positive', errcode = '23514';
  end if;

  update app.purchase_requisition_lines ln
  set
    quantity = coalesce(p_quantity, ln.quantity),
    estimated_unit_cost = coalesce(p_estimated_unit_cost, ln.estimated_unit_cost),
    notes = case when p_notes is not null then nullif(trim(p_notes), '') else ln.notes end
  where ln.id = p_line_id;
end;
$$;

comment on function public.rpc_update_purchase_requisition_line(uuid, uuid, numeric, numeric, text) is
  'Updates a requisition line (draft only). Requires purchase_requisition.edit.';

revoke all on function public.rpc_update_purchase_requisition_line(uuid, uuid, numeric, numeric, text) from public;
grant execute on function public.rpc_update_purchase_requisition_line(uuid, uuid, numeric, numeric, text) to authenticated;

create or replace function public.rpc_remove_purchase_requisition_line(
  p_tenant_id uuid,
  p_line_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
  v_pr_tenant uuid;
begin
  perform util.check_rate_limit('purchase_requisition_line_remove', null, 60, 1, auth.uid(), p_tenant_id);
  perform authz.rpc_setup(p_tenant_id, 'purchase_requisition.edit');

  select pr.status, pr.tenant_id into v_status, v_pr_tenant
  from app.purchase_requisition_lines ln
  join app.purchase_requisitions pr on pr.id = ln.purchase_requisition_id
  where ln.id = p_line_id;

  if v_pr_tenant is null or v_pr_tenant <> p_tenant_id then
    raise exception using message = 'Line not found or wrong tenant', errcode = 'P0001';
  end if;

  if v_status <> 'draft' then
    raise exception using message = 'Requisition is not editable (not draft)', errcode = '23503';
  end if;

  delete from app.purchase_requisition_lines
  where id = p_line_id;
end;
$$;

comment on function public.rpc_remove_purchase_requisition_line(uuid, uuid) is
  'Removes a line from a draft requisition. Requires purchase_requisition.edit.';

revoke all on function public.rpc_remove_purchase_requisition_line(uuid, uuid) from public;
grant execute on function public.rpc_remove_purchase_requisition_line(uuid, uuid) to authenticated;

create or replace function public.rpc_delete_purchase_requisition(
  p_tenant_id uuid,
  p_purchase_requisition_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
  v_row_tenant uuid;
begin
  perform util.check_rate_limit('purchase_requisition_delete', null, 20, 1, auth.uid(), p_tenant_id);
  perform authz.rpc_setup(p_tenant_id, 'purchase_requisition.edit');

  select tenant_id, status into v_row_tenant, v_status
  from app.purchase_requisitions
  where id = p_purchase_requisition_id;

  if v_row_tenant is null or v_row_tenant <> p_tenant_id then
    raise exception using message = 'Requisition not found or wrong tenant', errcode = 'P0001';
  end if;

  if v_status <> 'draft' then
    raise exception using message = 'Only draft requisitions can be deleted', errcode = '23503';
  end if;

  delete from app.purchase_requisitions
  where id = p_purchase_requisition_id;
end;
$$;

comment on function public.rpc_delete_purchase_requisition(uuid, uuid) is
  'Deletes a draft requisition and lines (cascade). Requires purchase_requisition.edit.';

revoke all on function public.rpc_delete_purchase_requisition(uuid, uuid) from public;
grant execute on function public.rpc_delete_purchase_requisition(uuid, uuid) to authenticated;

-- ============================================================================
-- 4. labor: crews
-- ============================================================================

create or replace function public.rpc_create_crew(
  p_tenant_id uuid,
  p_name text,
  p_description text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform util.check_rate_limit('labor_crew_create', null, 30, 1, auth.uid(), p_tenant_id);
  perform authz.rpc_setup(p_tenant_id, 'labor.crew.manage');

  if p_name is null or length(trim(p_name)) < 1 then
    raise exception using message = 'name is required', errcode = '23514';
  end if;

  insert into app.crews (tenant_id, name, description)
  values (p_tenant_id, trim(p_name), nullif(trim(p_description), ''))
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.rpc_create_crew(uuid, text, text) is
  'Creates a crew. Requires labor.crew.manage.';

revoke all on function public.rpc_create_crew(uuid, text, text) from public;
grant execute on function public.rpc_create_crew(uuid, text, text) to authenticated;

create or replace function public.rpc_update_crew(
  p_tenant_id uuid,
  p_crew_id uuid,
  p_name text default null,
  p_description text default null,
  p_lead_technician_id uuid default null,
  p_clear_lead_technician boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row_tenant uuid;
begin
  perform util.check_rate_limit('labor_crew_update', null, 30, 1, auth.uid(), p_tenant_id);
  perform authz.rpc_setup(p_tenant_id, 'labor.crew.manage');

  select tenant_id into v_row_tenant
  from app.crews
  where id = p_crew_id;

  if v_row_tenant is null or v_row_tenant <> p_tenant_id then
    raise exception using message = 'Crew not found or wrong tenant', errcode = 'P0001';
  end if;

  if p_lead_technician_id is not null then
    if not exists (
      select 1 from app.technicians t
      where t.id = p_lead_technician_id
        and t.tenant_id = p_tenant_id
    ) then
      raise exception using message = 'Lead technician not found or wrong tenant', errcode = '23503';
    end if;
  end if;

  update app.crews
  set
    name = coalesce(nullif(trim(p_name), ''), name),
    description = case when p_description is not null then nullif(trim(p_description), '') else description end,
    lead_technician_id = case
      when p_clear_lead_technician then null
      when p_lead_technician_id is not null then p_lead_technician_id
      else lead_technician_id
    end,
    updated_at = pg_catalog.now()
  where id = p_crew_id;
end;
$$;

comment on function public.rpc_update_crew(uuid, uuid, text, text, uuid, boolean) is
  'Updates a crew. p_clear_lead_technician clears lead. Requires labor.crew.manage.';

revoke all on function public.rpc_update_crew(uuid, uuid, text, text, uuid, boolean) from public;
grant execute on function public.rpc_update_crew(uuid, uuid, text, text, uuid, boolean) to authenticated;

create or replace function public.rpc_delete_crew(
  p_tenant_id uuid,
  p_crew_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row_tenant uuid;
begin
  perform util.check_rate_limit('labor_crew_delete', null, 20, 1, auth.uid(), p_tenant_id);
  perform authz.rpc_setup(p_tenant_id, 'labor.crew.manage');

  select tenant_id into v_row_tenant
  from app.crews
  where id = p_crew_id;

  if v_row_tenant is null or v_row_tenant <> p_tenant_id then
    raise exception using message = 'Crew not found or wrong tenant', errcode = 'P0001';
  end if;

  delete from app.crews
  where id = p_crew_id;
end;
$$;

comment on function public.rpc_delete_crew(uuid, uuid) is
  'Deletes a crew; members cascade; schedule_blocks.crew_id nulls. Requires labor.crew.manage.';

revoke all on function public.rpc_delete_crew(uuid, uuid) from public;
grant execute on function public.rpc_delete_crew(uuid, uuid) to authenticated;

-- ============================================================================
-- 5. labor: technicians
-- ============================================================================

create or replace function public.rpc_create_technician(
  p_tenant_id uuid,
  p_user_id uuid,
  p_employee_number text default null,
  p_default_crew_id uuid default null,
  p_department_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform util.check_rate_limit('labor_technician_create', null, 30, 1, auth.uid(), p_tenant_id);
  perform authz.rpc_setup(p_tenant_id, 'labor.technician.manage');

  if not exists (
    select 1 from app.tenant_memberships m
    where m.tenant_id = p_tenant_id
      and m.user_id = p_user_id
  ) then
    raise exception using message = 'User is not a member of this tenant', errcode = '42501';
  end if;

  if p_default_crew_id is not null then
    if not exists (
      select 1 from app.crews c
      where c.id = p_default_crew_id
        and c.tenant_id = p_tenant_id
    ) then
      raise exception using message = 'Default crew not found or wrong tenant', errcode = '23503';
    end if;
  end if;

  if p_department_id is not null then
    if not exists (
      select 1 from app.departments d
      where d.id = p_department_id
        and d.tenant_id = p_tenant_id
    ) then
      raise exception using message = 'Department not found or wrong tenant', errcode = '23503';
    end if;
  end if;

  insert into app.technicians (
    tenant_id,
    user_id,
    employee_number,
    default_crew_id,
    department_id
  )
  values (
    p_tenant_id,
    p_user_id,
    case when p_employee_number is not null then nullif(trim(p_employee_number), '') else null end,
    p_default_crew_id,
    p_department_id
  )
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.rpc_create_technician(uuid, uuid, text, uuid, uuid) is
  'Creates a technician for a tenant member user. Requires labor.technician.manage.';

revoke all on function public.rpc_create_technician(uuid, uuid, text, uuid, uuid) from public;
grant execute on function public.rpc_create_technician(uuid, uuid, text, uuid, uuid) to authenticated;

create or replace function public.rpc_update_technician(
  p_tenant_id uuid,
  p_technician_id uuid,
  p_employee_number text default null,
  p_default_crew_id uuid default null,
  p_department_id uuid default null,
  p_is_active boolean default null,
  p_clear_default_crew boolean default false,
  p_clear_department boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row_tenant uuid;
begin
  perform util.check_rate_limit('labor_technician_update', null, 30, 1, auth.uid(), p_tenant_id);
  perform authz.rpc_setup(p_tenant_id, 'labor.technician.manage');

  select tenant_id into v_row_tenant
  from app.technicians
  where id = p_technician_id;

  if v_row_tenant is null or v_row_tenant <> p_tenant_id then
    raise exception using message = 'Technician not found or wrong tenant', errcode = 'P0001';
  end if;

  if p_default_crew_id is not null then
    if not exists (
      select 1 from app.crews c
      where c.id = p_default_crew_id
        and c.tenant_id = p_tenant_id
    ) then
      raise exception using message = 'Default crew not found or wrong tenant', errcode = '23503';
    end if;
  end if;

  if p_department_id is not null then
    if not exists (
      select 1 from app.departments d
      where d.id = p_department_id
        and d.tenant_id = p_tenant_id
    ) then
      raise exception using message = 'Department not found or wrong tenant', errcode = '23503';
    end if;
  end if;

  update app.technicians
  set
    employee_number = case
      when p_employee_number is not null then nullif(trim(p_employee_number), '')
      else employee_number
    end,
    default_crew_id = case
      when p_clear_default_crew then null
      when p_default_crew_id is not null then p_default_crew_id
      else default_crew_id
    end,
    department_id = case
      when p_clear_department then null
      when p_department_id is not null then p_department_id
      else department_id
    end,
    is_active = coalesce(p_is_active, is_active),
    updated_at = pg_catalog.now()
  where id = p_technician_id;
end;
$$;

comment on function public.rpc_update_technician(uuid, uuid, text, uuid, uuid, boolean, boolean, boolean) is
  'Updates technician fields. Use p_clear_default_crew / p_clear_department to null FKs. Requires labor.technician.manage.';

revoke all on function public.rpc_update_technician(uuid, uuid, text, uuid, uuid, boolean, boolean, boolean) from public;
grant execute on function public.rpc_update_technician(uuid, uuid, text, uuid, uuid, boolean, boolean, boolean) to authenticated;

-- ============================================================================
-- 6. labor: crew members
-- ============================================================================

create or replace function public.rpc_add_crew_member(
  p_tenant_id uuid,
  p_crew_id uuid,
  p_technician_id uuid,
  p_role text default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_crew_tenant uuid;
  v_tech_tenant uuid;
  v_existing_id bigint;
  v_existing_left timestamptz;
  v_new_id bigint;
begin
  perform util.check_rate_limit('labor_crew_member_add', null, 60, 1, auth.uid(), p_tenant_id);
  perform authz.rpc_setup(p_tenant_id, 'labor.crew.manage');

  select tenant_id into v_crew_tenant from app.crews where id = p_crew_id;
  if v_crew_tenant is null or v_crew_tenant <> p_tenant_id then
    raise exception using message = 'Crew not found or wrong tenant', errcode = 'P0001';
  end if;

  select tenant_id into v_tech_tenant from app.technicians where id = p_technician_id;
  if v_tech_tenant is null or v_tech_tenant <> p_tenant_id then
    raise exception using message = 'Technician not found or wrong tenant', errcode = 'P0001';
  end if;

  select id, left_at into v_existing_id, v_existing_left
  from app.crew_members
  where crew_id = p_crew_id
    and technician_id = p_technician_id;

  if v_existing_id is not null then
    if v_existing_left is null then
      raise exception using message = 'Technician is already an active member of this crew', errcode = '23505';
    end if;
    update app.crew_members
    set
      left_at = null,
      joined_at = pg_catalog.now(),
      role = coalesce(nullif(trim(p_role), ''), role),
      updated_at = pg_catalog.now()
    where id = v_existing_id;
    return v_existing_id;
  end if;

  insert into app.crew_members (tenant_id, crew_id, technician_id, role)
  values (
    p_tenant_id,
    p_crew_id,
    p_technician_id,
    nullif(trim(p_role), '')
  )
  returning id into v_new_id;

  return v_new_id;
end;
$$;

comment on function public.rpc_add_crew_member(uuid, uuid, uuid, text) is
  'Adds or reactivates a crew member. Requires labor.crew.manage.';

revoke all on function public.rpc_add_crew_member(uuid, uuid, uuid, text) from public;
grant execute on function public.rpc_add_crew_member(uuid, uuid, uuid, text) to authenticated;

create or replace function public.rpc_remove_crew_member(
  p_tenant_id uuid,
  p_crew_id uuid,
  p_technician_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated integer;
begin
  perform util.check_rate_limit('labor_crew_member_remove', null, 60, 1, auth.uid(), p_tenant_id);
  perform authz.rpc_setup(p_tenant_id, 'labor.crew.manage');

  update app.crew_members cm
  set
    left_at = pg_catalog.now(),
    updated_at = pg_catalog.now()
  from app.crews c
  where cm.crew_id = c.id
    and cm.crew_id = p_crew_id
    and cm.technician_id = p_technician_id
    and c.tenant_id = p_tenant_id
    and cm.left_at is null;

  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise exception using message = 'Active crew membership not found', errcode = 'P0001';
  end if;
end;
$$;

comment on function public.rpc_remove_crew_member(uuid, uuid, uuid) is
  'Ends active crew membership (sets left_at). Requires labor.crew.manage.';

revoke all on function public.rpc_remove_crew_member(uuid, uuid, uuid) from public;
grant execute on function public.rpc_remove_crew_member(uuid, uuid, uuid) to authenticated;
