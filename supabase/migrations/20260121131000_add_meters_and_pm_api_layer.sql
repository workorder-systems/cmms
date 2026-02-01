-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Adds RPC functions for meter tracking and preventive maintenance (PM) system.
-- 
-- This migration creates all public API RPC functions for the meter and PM system:
-- - Meter RPCs: create, update, record_reading, delete meters
-- - PM template RPCs: create, update templates with structured parameters
-- - PM schedule RPCs: create, update, delete, generate_due, trigger_manual, create_dependency
-- - Work order integration: extends rpc_create_work_order to accept p_pm_schedule_id
-- 
-- All RPC functions follow ADR conventions:
-- - Security: security definer with set search_path = ''
-- - Rate limiting: util.check_rate_limit() for abuse prevention
-- - Permissions: authz.rpc_setup() for permission validation
-- - Tenant isolation: validates tenant_id on all operations
-- - Backward compatibility: supports both structured and JSONB parameters

-- ============================================================================
-- Meter RPC Functions
-- ============================================================================

create or replace function public.rpc_create_meter(
  p_tenant_id uuid,
  p_asset_id uuid,
  p_meter_type text,
  p_name text,
  p_unit text,
  p_current_reading numeric default 0,
  p_reading_direction text default 'increasing',
  p_decimal_places integer default 0,
  p_description text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_meter_id uuid;
  v_asset_tenant_id uuid;
begin
  perform util.check_rate_limit('meter_create', null, 20, 1, auth.uid(), p_tenant_id);
  
  v_user_id := authz.rpc_setup(p_tenant_id, 'asset.edit');

  -- Validate asset belongs to tenant
  select tenant_id into v_asset_tenant_id
  from app.assets
  where id = p_asset_id;

  if not found then
    raise exception using
      message = format('Asset %s not found', p_asset_id),
      errcode = 'P0001';
  end if;

  if v_asset_tenant_id != p_tenant_id then
    raise exception using
      message = 'Unauthorized: Asset does not belong to this tenant',
      errcode = '42501';
  end if;

  -- Validate meter_type
  if p_meter_type not in ('runtime_hours', 'cycles', 'miles', 'production_units', 'custom') then
    raise exception using
      message = format('Invalid meter_type: %s', p_meter_type),
      errcode = '23514';
  end if;

  -- Validate name length
  if length(p_name) < 1 or length(p_name) > 255 then
    raise exception using
      message = 'Meter name must be between 1 and 255 characters',
      errcode = '23514';
  end if;

  -- Validate unit length
  if length(p_unit) < 1 or length(p_unit) > 50 then
    raise exception using
      message = 'Meter unit must be between 1 and 50 characters',
      errcode = '23514';
  end if;

  -- Validate reading_direction
  if p_reading_direction not in ('increasing', 'decreasing', 'reset') then
    raise exception using
      message = format('Invalid reading_direction: %s', p_reading_direction),
      errcode = '23514';
  end if;

  -- Validate decimal_places
  if p_decimal_places < 0 or p_decimal_places > 6 then
    raise exception using
      message = 'decimal_places must be between 0 and 6',
      errcode = '23514';
  end if;

  -- Validate current_reading
  if p_current_reading < 0 then
    raise exception using
      message = 'current_reading must be >= 0',
      errcode = '23514';
  end if;

  insert into app.asset_meters (
    tenant_id,
    asset_id,
    meter_type,
    name,
    unit,
    current_reading,
    reading_direction,
    decimal_places,
    description
  )
  values (
    p_tenant_id,
    p_asset_id,
    p_meter_type,
    p_name,
    p_unit,
    p_current_reading,
    p_reading_direction,
    p_decimal_places,
    p_description
  )
  returning id into v_meter_id;

  return v_meter_id;
end;
$$;

comment on function public.rpc_create_meter(uuid, uuid, text, text, text, numeric, text, integer, text) is 
  'Creates new meter for asset. Validates asset belongs to tenant, meter_type is valid, name is unique per asset. Requires asset.edit permission. Rate limited to 20 requests per minute per user. Returns the UUID of the created meter.';

revoke all on function public.rpc_create_meter(uuid, uuid, text, text, text, numeric, text, integer, text) from public;
grant execute on function public.rpc_create_meter(uuid, uuid, text, text, text, numeric, text, integer, text) to authenticated;

create or replace function public.rpc_update_meter(
  p_tenant_id uuid,
  p_meter_id uuid,
  p_name text default null,
  p_unit text default null,
  p_reading_direction text default null,
  p_decimal_places integer default null,
  p_description text default null,
  p_is_active boolean default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_meter_tenant_id uuid;
begin
  perform util.check_rate_limit('meter_update', null, 20, 1, auth.uid(), p_tenant_id);
  
  v_user_id := authz.rpc_setup(p_tenant_id, 'asset.edit');

  -- Validate meter belongs to tenant
  select tenant_id into v_meter_tenant_id
  from app.asset_meters
  where id = p_meter_id;

  if not found then
    raise exception using
      message = format('Meter %s not found', p_meter_id),
      errcode = 'P0001';
  end if;

  if v_meter_tenant_id != p_tenant_id then
    raise exception using
      message = 'Unauthorized: Meter does not belong to this tenant',
      errcode = '42501';
  end if;

  -- Validate name length if provided
  if p_name is not null and (length(p_name) < 1 or length(p_name) > 255) then
    raise exception using
      message = 'Meter name must be between 1 and 255 characters',
      errcode = '23514';
  end if;

  -- Validate unit length if provided
  if p_unit is not null and (length(p_unit) < 1 or length(p_unit) > 50) then
    raise exception using
      message = 'Meter unit must be between 1 and 50 characters',
      errcode = '23514';
  end if;

  -- Validate reading_direction if provided
  if p_reading_direction is not null and p_reading_direction not in ('increasing', 'decreasing', 'reset') then
    raise exception using
      message = format('Invalid reading_direction: %s', p_reading_direction),
      errcode = '23514';
  end if;

  -- Validate decimal_places if provided
  if p_decimal_places is not null and (p_decimal_places < 0 or p_decimal_places > 6) then
    raise exception using
      message = 'decimal_places must be between 0 and 6',
      errcode = '23514';
  end if;

  -- Check if meter is referenced by active PM schedules before deactivating
  if p_is_active = false then
    if exists (
      select 1
      from app.pm_schedules
      where trigger_type = 'usage'
        and (trigger_config->>'meter_id')::uuid = p_meter_id
        and is_active = true
    ) then
      raise exception using
        message = 'Cannot deactivate meter: Active PM schedules reference this meter',
        errcode = '23503';
    end if;
  end if;

  update app.asset_meters
  set
    name = coalesce(p_name, name),
    unit = coalesce(p_unit, unit),
    reading_direction = coalesce(p_reading_direction, reading_direction),
    decimal_places = coalesce(p_decimal_places, decimal_places),
    description = coalesce(p_description, description),
    is_active = coalesce(p_is_active, is_active),
    updated_at = pg_catalog.now()
  where id = p_meter_id;
end;
$$;

comment on function public.rpc_update_meter(uuid, uuid, text, text, text, integer, text, boolean) is 
  'Updates meter configuration. Cannot change meter_type or current_reading (use record_reading for that). Validates no active PM schedules reference meter before deactivating. Requires asset.edit permission. Rate limited to 20 requests per minute per user.';

revoke all on function public.rpc_update_meter(uuid, uuid, text, text, text, integer, text, boolean) from public;
grant execute on function public.rpc_update_meter(uuid, uuid, text, text, text, integer, text, boolean) to authenticated;

create or replace function public.rpc_record_meter_reading(
  p_tenant_id uuid,
  p_meter_id uuid,
  p_reading_value numeric,
  p_reading_date timestamptz default null,
  p_reading_type text default 'manual',
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_reading_id uuid;
  v_meter_tenant_id uuid;
  v_meter app.asset_meters%rowtype;
  v_pm_schedule app.pm_schedules%rowtype;
  v_threshold numeric;
  v_current_reading numeric;
begin
  perform util.check_rate_limit('meter_reading_record', null, 50, 1, auth.uid(), p_tenant_id);
  
  v_user_id := authz.rpc_setup(p_tenant_id, 'asset.edit');

  -- Validate meter belongs to tenant
  select * into v_meter
  from app.asset_meters
  where id = p_meter_id;

  if not found then
    raise exception using
      message = format('Meter %s not found', p_meter_id),
      errcode = 'P0001';
  end if;

  if v_meter.tenant_id != p_tenant_id then
    raise exception using
      message = 'Unauthorized: Meter does not belong to this tenant',
      errcode = '42501';
  end if;

  -- Validate reading_type
  if p_reading_type not in ('manual', 'automated', 'imported', 'estimated') then
    raise exception using
      message = format('Invalid reading_type: %s', p_reading_type),
      errcode = '23514';
  end if;

  -- Use provided reading_date or default to now
  if p_reading_date is null then
    p_reading_date := pg_catalog.now();
  end if;

  -- Insert reading (trigger will validate and update meter)
  insert into app.meter_readings (
    tenant_id,
    meter_id,
    reading_value,
    reading_date,
    reading_type,
    notes,
    recorded_by
  )
  values (
    p_tenant_id,
    p_meter_id,
    p_reading_value,
    p_reading_date,
    p_reading_type,
    p_notes,
    v_user_id
  )
  returning id into v_reading_id;

  -- Get updated meter reading
  select current_reading into v_current_reading
  from app.asset_meters
  where id = p_meter_id;

  -- Check usage-based PM schedules
  for v_pm_schedule in
    select *
    from app.pm_schedules
    where tenant_id = p_tenant_id
      and trigger_type = 'usage'
      and is_active = true
      and auto_generate = true
      and (trigger_config->>'meter_id')::uuid = p_meter_id
  loop
    v_threshold := (v_pm_schedule.trigger_config->>'threshold')::numeric;
    
    if v_threshold is not null and v_current_reading >= v_threshold then
      -- Check if PM is due and dependencies are met
      if pm.is_pm_due(v_pm_schedule) and pm.check_pm_dependencies(v_pm_schedule.id) then
        -- Generate work order
        perform pm.generate_pm_work_order(v_pm_schedule.id);
      end if;
    end if;
  end loop;

  return v_reading_id;
end;
$$;

comment on function public.rpc_record_meter_reading(uuid, uuid, numeric, timestamptz, text, text) is 
  'Records new meter reading. Validates reading, updates meter current_reading, creates reading history record, triggers PM usage-based checks. Requires asset.edit permission. Rate limited to 50 requests per minute per user. Returns the UUID of the created reading.';

revoke all on function public.rpc_record_meter_reading(uuid, uuid, numeric, timestamptz, text, text) from public;
grant execute on function public.rpc_record_meter_reading(uuid, uuid, numeric, timestamptz, text, text) to authenticated;

create or replace function public.rpc_delete_meter(
  p_tenant_id uuid,
  p_meter_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_meter_tenant_id uuid;
begin
  perform util.check_rate_limit('meter_delete', null, 10, 1, auth.uid(), p_tenant_id);
  
  v_user_id := authz.rpc_setup(p_tenant_id, 'asset.edit');

  -- Validate meter belongs to tenant
  select tenant_id into v_meter_tenant_id
  from app.asset_meters
  where id = p_meter_id;

  if not found then
    raise exception using
      message = format('Meter %s not found', p_meter_id),
      errcode = 'P0001';
  end if;

  if v_meter_tenant_id != p_tenant_id then
    raise exception using
      message = 'Unauthorized: Meter does not belong to this tenant',
      errcode = '42501';
  end if;

  -- Validate no active PM schedules reference this meter
  if exists (
    select 1
    from app.pm_schedules
    where trigger_type = 'usage'
      and (trigger_config->>'meter_id')::uuid = p_meter_id
      and is_active = true
  ) then
    raise exception using
      message = 'Cannot delete meter: Active PM schedules reference this meter',
      errcode = '23503';
  end if;

  -- Soft delete (set is_active = false)
  update app.asset_meters
  set
    is_active = false,
    updated_at = pg_catalog.now()
  where id = p_meter_id;
end;
$$;

comment on function public.rpc_delete_meter(uuid, uuid) is 
  'Soft deletes meter (sets is_active = false). Validates no active PM schedules reference this meter. Requires asset.edit permission. Rate limited to 10 requests per minute per user.';

revoke all on function public.rpc_delete_meter(uuid, uuid) from public;
grant execute on function public.rpc_delete_meter(uuid, uuid) to authenticated;

-- ============================================================================
-- PM Template RPC Functions
-- ============================================================================

create or replace function public.rpc_create_pm_template(
  p_tenant_id uuid,
  p_name text,
  p_trigger_type text,
  p_trigger_config jsonb,
  p_description text default null,
  p_work_order_template jsonb default null,
  p_checklist jsonb default null,
  p_estimated_hours numeric default null,
  -- New structured parameters
  p_wo_title text default null,
  p_wo_description text default null,
  p_wo_priority text default null,
  p_wo_estimated_hours numeric default null,
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
  v_wo_title text;
  v_wo_description text;
  v_wo_priority text;
  v_wo_estimated_hours numeric;
  v_checklist_item jsonb;
  v_item_ordinality integer;
begin
  perform util.check_rate_limit('pm_template_create', null, 20, 1, auth.uid(), p_tenant_id);
  
  v_user_id := authz.rpc_setup(p_tenant_id, 'tenant.admin');

  -- Validate name length
  if length(p_name) < 1 or length(p_name) > 255 then
    raise exception using
      message = 'Template name must be between 1 and 255 characters',
      errcode = '23514';
  end if;

  -- Validate trigger_type
  if p_trigger_type not in ('time', 'usage', 'calendar', 'condition', 'manual') then
    raise exception using
      message = format('Invalid trigger_type: %s', p_trigger_type),
      errcode = '23514';
  end if;

  -- Validate trigger_config
  perform pm.validate_trigger_config(p_trigger_type, p_trigger_config);

  -- Extract structured values: prefer new parameters, fallback to JSONB for backward compatibility
  v_wo_title := coalesce(
    p_wo_title,
    p_work_order_template->>'title'
  );
  v_wo_description := coalesce(
    p_wo_description,
    p_work_order_template->>'description'
  );
  v_wo_priority := coalesce(
    p_wo_priority,
    p_work_order_template->>'priority'
  );
  v_wo_estimated_hours := coalesce(
    p_wo_estimated_hours,
    (p_work_order_template->>'estimated_hours')::numeric,
    p_estimated_hours
  );

  -- Validate wo_priority if provided
  if v_wo_priority is not null then
    if not exists (
      select 1
      from cfg.priority_catalogs
      where tenant_id = p_tenant_id
        and entity_type = 'work_order'
        and key = v_wo_priority
    ) then
      raise exception using
        message = format('Invalid priority: %s. Priority must exist in tenant priority catalog for work_order entity type.', v_wo_priority),
        errcode = '23503';
    end if;
  end if;

  -- Insert template
  insert into cfg.pm_templates (
    tenant_id,
    name,
    description,
    trigger_type,
    trigger_config,
    work_order_template,
    checklist,
    estimated_hours,
    wo_title,
    wo_description,
    wo_priority,
    wo_estimated_hours
  )
  values (
    p_tenant_id,
    p_name,
    p_description,
    p_trigger_type,
    p_trigger_config,
    p_work_order_template, -- Keep JSONB for backward compatibility
    p_checklist, -- Keep JSONB for backward compatibility
    p_estimated_hours,
    v_wo_title,
    v_wo_description,
    v_wo_priority,
    v_wo_estimated_hours
  )
  returning id into v_template_id;

  -- Insert checklist items: prefer new p_checklist_items, fallback to p_checklist JSONB
  if p_checklist_items is not null and jsonb_typeof(p_checklist_items) = 'array' then
    -- Insert from new structured parameter
    for v_checklist_item, v_item_ordinality in 
      select value, ordinality
      from jsonb_array_elements(p_checklist_items) with ordinality as t(value, ordinality)
    loop
      if v_checklist_item->>'description' is not null 
         and length((v_checklist_item->>'description')::text) >= 1 then
        insert into cfg.pm_template_checklist_items (
          template_id,
          description,
          required,
          display_order
        )
        values (
          v_template_id,
          (v_checklist_item->>'description')::text,
          coalesce((v_checklist_item->>'required')::boolean, false),
          v_item_ordinality - 1
        );
      end if;
    end loop;
  elsif p_checklist is not null and jsonb_typeof(p_checklist) = 'array' then
    -- Fallback to old JSONB parameter for backward compatibility
    for v_checklist_item, v_item_ordinality in 
      select value, ordinality
      from jsonb_array_elements(p_checklist) with ordinality as t(value, ordinality)
    loop
      if v_checklist_item->>'description' is not null 
         and length((v_checklist_item->>'description')::text) >= 1 then
        insert into cfg.pm_template_checklist_items (
          template_id,
          description,
          required,
          display_order
        )
        values (
          v_template_id,
          (v_checklist_item->>'description')::text,
          coalesce((v_checklist_item->>'required')::boolean, false),
          v_item_ordinality - 1
        );
      end if;
    end loop;
  end if;

  return v_template_id;
end;
$$;

comment on function public.rpc_create_pm_template(uuid, text, text, jsonb, text, jsonb, jsonb, numeric, text, text, text, numeric, jsonb) is 
  'Creates reusable PM template. Validates trigger_config. Accepts structured wo_* parameters (preferred) or work_order_template JSONB (backward compatible). Accepts checklist_items JSONB array (preferred) or checklist JSONB (backward compatible). Requires tenant.admin permission. Rate limited to 20 requests per minute per user. Returns the UUID of the created template.';

revoke all on function public.rpc_create_pm_template(uuid, text, text, jsonb, text, jsonb, jsonb, numeric, text, text, text, numeric, jsonb) from public;
grant execute on function public.rpc_create_pm_template(uuid, text, text, jsonb, text, jsonb, jsonb, numeric, text, text, text, numeric, jsonb) to authenticated;

create or replace function public.rpc_update_pm_template(
  p_tenant_id uuid,
  p_template_id uuid,
  p_name text default null,
  p_description text default null,
  p_trigger_config jsonb default null,
  p_work_order_template jsonb default null,
  p_checklist jsonb default null,
  p_estimated_hours numeric default null,
  -- New structured parameters
  p_wo_title text default null,
  p_wo_description text default null,
  p_wo_priority text default null,
  p_wo_estimated_hours numeric default null,
  p_checklist_items jsonb default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_template_tenant_id uuid;
  v_trigger_type text;
  v_wo_title text;
  v_wo_description text;
  v_wo_priority text;
  v_wo_estimated_hours numeric;
  v_checklist_item jsonb;
  v_item_ordinality integer;
begin
  perform util.check_rate_limit('pm_template_update', null, 20, 1, auth.uid(), p_tenant_id);
  
  v_user_id := authz.rpc_setup(p_tenant_id, 'tenant.admin');

  -- Validate template belongs to tenant
  select tenant_id, trigger_type into v_template_tenant_id, v_trigger_type
  from cfg.pm_templates
  where id = p_template_id;

  if not found then
    raise exception using
      message = format('PM template %s not found', p_template_id),
      errcode = 'P0001';
  end if;

  if v_template_tenant_id != p_tenant_id then
    raise exception using
      message = 'Unauthorized: PM template does not belong to this tenant',
      errcode = '42501';
  end if;

  -- Validate name length if provided
  if p_name is not null and (length(p_name) < 1 or length(p_name) > 255) then
    raise exception using
      message = 'Template name must be between 1 and 255 characters',
      errcode = '23514';
  end if;

  -- Validate trigger_config if provided
  if p_trigger_config is not null then
    perform pm.validate_trigger_config(v_trigger_type, p_trigger_config);
  end if;

  -- Extract structured values: prefer new parameters, fallback to JSONB for backward compatibility
  if p_wo_title is not null or p_wo_description is not null or p_wo_priority is not null or p_wo_estimated_hours is not null or p_work_order_template is not null then
    v_wo_title := coalesce(
      p_wo_title,
      p_work_order_template->>'title'
    );
    v_wo_description := coalesce(
      p_wo_description,
      p_work_order_template->>'description'
    );
    v_wo_priority := coalesce(
      p_wo_priority,
      p_work_order_template->>'priority'
    );
    v_wo_estimated_hours := coalesce(
      p_wo_estimated_hours,
      (p_work_order_template->>'estimated_hours')::numeric
    );
  end if;

  -- Validate wo_priority if provided
  if v_wo_priority is not null then
    if not exists (
      select 1
      from cfg.priority_catalogs
      where tenant_id = p_tenant_id
        and entity_type = 'work_order'
        and key = v_wo_priority
    ) then
      raise exception using
        message = format('Invalid priority: %s. Priority must exist in tenant priority catalog for work_order entity type.', v_wo_priority),
        errcode = '23503';
    end if;
  end if;

  -- Update template
  update cfg.pm_templates
  set
    name = coalesce(p_name, name),
    description = coalesce(p_description, description),
    trigger_config = coalesce(p_trigger_config, trigger_config),
    work_order_template = coalesce(p_work_order_template, work_order_template), -- Keep JSONB for backward compatibility
    checklist = coalesce(p_checklist, checklist), -- Keep JSONB for backward compatibility
    estimated_hours = coalesce(p_estimated_hours, estimated_hours),
    wo_title = coalesce(v_wo_title, wo_title),
    wo_description = coalesce(v_wo_description, wo_description),
    wo_priority = coalesce(v_wo_priority, wo_priority),
    wo_estimated_hours = coalesce(v_wo_estimated_hours, wo_estimated_hours),
    updated_at = pg_catalog.now()
  where id = p_template_id;

  -- Update checklist items if provided
  if p_checklist_items is not null or p_checklist is not null then
    -- Delete existing checklist items
    delete from cfg.pm_template_checklist_items
    where template_id = p_template_id;

    -- Insert new checklist items: prefer new p_checklist_items, fallback to p_checklist JSONB
    if p_checklist_items is not null and jsonb_typeof(p_checklist_items) = 'array' then
      for v_checklist_item, v_item_ordinality in 
        select value, ordinality
        from jsonb_array_elements(p_checklist_items) with ordinality as t(value, ordinality)
      loop
        if v_checklist_item->>'description' is not null 
           and length((v_checklist_item->>'description')::text) >= 1 then
          insert into cfg.pm_template_checklist_items (
            template_id,
            description,
            required,
            display_order
          )
          values (
            p_template_id,
            (v_checklist_item->>'description')::text,
            coalesce((v_checklist_item->>'required')::boolean, false),
            v_item_ordinality - 1
          );
        end if;
      end loop;
    elsif p_checklist is not null and jsonb_typeof(p_checklist) = 'array' then
      -- Fallback to old JSONB parameter for backward compatibility
      for v_checklist_item, v_item_ordinality in 
        select value, ordinality
        from jsonb_array_elements(p_checklist) with ordinality as t(value, ordinality)
      loop
        if v_checklist_item->>'description' is not null 
           and length((v_checklist_item->>'description')::text) >= 1 then
          insert into cfg.pm_template_checklist_items (
            template_id,
            description,
            required,
            display_order
          )
          values (
            p_template_id,
            (v_checklist_item->>'description')::text,
            coalesce((v_checklist_item->>'required')::boolean, false),
            v_item_ordinality - 1
          );
        end if;
      end loop;
    end if;
  end if;
end;
$$;

comment on function public.rpc_update_pm_template(uuid, uuid, text, text, jsonb, jsonb, jsonb, numeric, text, text, text, numeric, jsonb) is 
  'Updates PM template. Validates trigger_config. Accepts structured wo_* parameters (preferred) or work_order_template JSONB (backward compatible). Accepts checklist_items JSONB array (preferred) or checklist JSONB (backward compatible). Updates checklist items by deleting existing and inserting new. Requires tenant.admin permission. Rate limited to 20 requests per minute per user.';

revoke all on function public.rpc_update_pm_template(uuid, uuid, text, text, jsonb, jsonb, jsonb, numeric, text, text, text, numeric, jsonb) from public;
grant execute on function public.rpc_update_pm_template(uuid, uuid, text, text, jsonb, jsonb, jsonb, numeric, text, text, text, numeric, jsonb) to authenticated;

-- ============================================================================
-- PM Schedule RPC Functions
-- ============================================================================

create or replace function public.rpc_create_pm_schedule(
  p_tenant_id uuid,
  p_asset_id uuid,
  p_title text,
  p_trigger_type text,
  p_trigger_config jsonb,
  p_description text default null,
  p_template_id uuid default null,
  p_work_order_template jsonb default null,
  p_auto_generate boolean default true,
  -- New structured parameters
  p_wo_title text default null,
  p_wo_description text default null,
  p_wo_priority text default null,
  p_wo_estimated_hours numeric default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_pm_schedule_id uuid;
  v_asset_tenant_id uuid;
  v_template_tenant_id uuid;
  v_meter_id uuid;
  v_pm_schedule app.pm_schedules%rowtype;
  v_wo_title text;
  v_wo_description text;
  v_wo_priority text;
  v_wo_estimated_hours numeric;
begin
  perform util.check_rate_limit('pm_schedule_create', null, 20, 1, auth.uid(), p_tenant_id);
  
  v_user_id := authz.rpc_setup(p_tenant_id, 'workorder.create');

  -- Validate asset belongs to tenant
  select tenant_id into v_asset_tenant_id
  from app.assets
  where id = p_asset_id;

  if not found then
    raise exception using
      message = format('Asset %s not found', p_asset_id),
      errcode = 'P0001';
  end if;

  if v_asset_tenant_id != p_tenant_id then
    raise exception using
      message = 'Unauthorized: Asset does not belong to this tenant',
      errcode = '42501';
  end if;

  -- Validate template if provided
  if p_template_id is not null then
    select tenant_id into v_template_tenant_id
    from cfg.pm_templates
    where id = p_template_id;

    if not found then
      raise exception using
        message = format('PM template %s not found', p_template_id),
        errcode = 'P0001';
    end if;

    if v_template_tenant_id != p_tenant_id then
      raise exception using
        message = 'Unauthorized: PM template does not belong to this tenant',
        errcode = '42501';
    end if;
  end if;

  -- Validate trigger_type
  if p_trigger_type not in ('time', 'usage', 'calendar', 'condition', 'manual') then
    raise exception using
      message = format('Invalid trigger_type: %s', p_trigger_type),
      errcode = '23514';
  end if;

  -- Validate trigger_config
  perform pm.validate_trigger_config(p_trigger_type, p_trigger_config);

  -- Validate meter exists for usage triggers
  if p_trigger_type = 'usage' then
    v_meter_id := (p_trigger_config->>'meter_id')::uuid;
    
    if v_meter_id is null then
      raise exception using
        message = 'Usage-based trigger requires meter_id in trigger_config',
        errcode = '23514';
    end if;

    if not exists (
      select 1
      from app.asset_meters
      where id = v_meter_id
        and tenant_id = p_tenant_id
        and asset_id = p_asset_id
        and is_active = true
    ) then
      raise exception using
        message = format('Meter %s not found or not active for this asset', v_meter_id),
        errcode = '23503';
    end if;
  end if;

  -- Validate title length
  if length(p_title) < 1 or length(p_title) > 500 then
    raise exception using
      message = 'PM schedule title must be between 1 and 500 characters',
      errcode = '23514';
  end if;

  -- Extract structured values: prefer new parameters, fallback to JSONB for backward compatibility
  v_wo_title := coalesce(
    p_wo_title,
    p_work_order_template->>'title'
  );
  v_wo_description := coalesce(
    p_wo_description,
    p_work_order_template->>'description'
  );
  v_wo_priority := coalesce(
    p_wo_priority,
    p_work_order_template->>'priority'
  );
  v_wo_estimated_hours := coalesce(
    p_wo_estimated_hours,
    (p_work_order_template->>'estimated_hours')::numeric
  );

  -- Validate wo_priority if provided
  if v_wo_priority is not null then
    if not exists (
      select 1
      from cfg.priority_catalogs
      where tenant_id = p_tenant_id
        and entity_type = 'work_order'
        and key = v_wo_priority
    ) then
      raise exception using
        message = format('Invalid priority: %s. Priority must exist in tenant priority catalog for work_order entity type.', v_wo_priority),
        errcode = '23503';
    end if;
  end if;

  -- Insert PM schedule
  insert into app.pm_schedules (
    tenant_id,
    asset_id,
    template_id,
    title,
    description,
    trigger_type,
    trigger_config,
    work_order_template,
    wo_title,
    wo_description,
    wo_priority,
    wo_estimated_hours,
    auto_generate
  )
  values (
    p_tenant_id,
    p_asset_id,
    p_template_id,
    p_title,
    p_description,
    p_trigger_type,
    p_trigger_config,
    p_work_order_template, -- Keep JSONB for backward compatibility
    v_wo_title,
    v_wo_description,
    v_wo_priority,
    v_wo_estimated_hours,
    p_auto_generate
  )
  returning id into v_pm_schedule_id;

  -- Get the PM schedule to calculate next_due_date
  select * into v_pm_schedule
  from app.pm_schedules
  where id = v_pm_schedule_id;

  -- Calculate initial next_due_date
  update app.pm_schedules
  set
    next_due_date = pm.calculate_next_due_date(
      v_pm_schedule,
      null
    ),
    updated_at = pg_catalog.now()
  where id = v_pm_schedule_id;

  return v_pm_schedule_id;
end;
$$;

comment on function public.rpc_create_pm_schedule(uuid, uuid, text, text, jsonb, text, uuid, jsonb, boolean, text, text, text, numeric) is 
  'Creates PM schedule for asset. Validates trigger_config, calculates initial next_due_date, validates meter exists for usage triggers. Accepts structured wo_* parameters (preferred) or work_order_template JSONB (backward compatible). Requires workorder.create permission. Rate limited to 20 requests per minute per user. Returns the UUID of the created PM schedule.';

revoke all on function public.rpc_create_pm_schedule(uuid, uuid, text, text, jsonb, text, uuid, jsonb, boolean, text, text, text, numeric) from public;
grant execute on function public.rpc_create_pm_schedule(uuid, uuid, text, text, jsonb, text, uuid, jsonb, boolean, text, text, text, numeric) to authenticated;

create or replace function public.rpc_update_pm_schedule(
  p_tenant_id uuid,
  p_pm_schedule_id uuid,
  p_title text default null,
  p_description text default null,
  p_trigger_config jsonb default null,
  p_work_order_template jsonb default null,
  p_auto_generate boolean default null,
  p_is_active boolean default null,
  -- New structured parameters
  p_wo_title text default null,
  p_wo_description text default null,
  p_wo_priority text default null,
  p_wo_estimated_hours numeric default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_pm_schedule_tenant_id uuid;
  v_trigger_type text;
  v_pm_schedule app.pm_schedules%rowtype;
  v_wo_title text;
  v_wo_description text;
  v_wo_priority text;
  v_wo_estimated_hours numeric;
begin
  perform util.check_rate_limit('pm_schedule_update', null, 20, 1, auth.uid(), p_tenant_id);
  
  v_user_id := authz.rpc_setup(p_tenant_id, 'workorder.create');

  -- Validate PM schedule belongs to tenant
  select tenant_id, trigger_type into v_pm_schedule_tenant_id, v_trigger_type
  from app.pm_schedules
  where id = p_pm_schedule_id;

  if not found then
    raise exception using
      message = format('PM schedule %s not found', p_pm_schedule_id),
      errcode = 'P0001';
  end if;

  if v_pm_schedule_tenant_id != p_tenant_id then
    raise exception using
      message = 'Unauthorized: PM schedule does not belong to this tenant',
      errcode = '42501';
  end if;

  -- Validate title length if provided
  if p_title is not null and (length(p_title) < 1 or length(p_title) > 500) then
    raise exception using
      message = 'PM schedule title must be between 1 and 500 characters',
      errcode = '23514';
  end if;

  -- Validate trigger_config if provided
  if p_trigger_config is not null then
    perform pm.validate_trigger_config(v_trigger_type, p_trigger_config);
  end if;

  -- Extract structured values: prefer new parameters, fallback to JSONB for backward compatibility
  if p_wo_title is not null or p_wo_description is not null or p_wo_priority is not null or p_wo_estimated_hours is not null or p_work_order_template is not null then
    v_wo_title := coalesce(
      p_wo_title,
      p_work_order_template->>'title'
    );
    v_wo_description := coalesce(
      p_wo_description,
      p_work_order_template->>'description'
    );
    v_wo_priority := coalesce(
      p_wo_priority,
      p_work_order_template->>'priority'
    );
    v_wo_estimated_hours := coalesce(
      p_wo_estimated_hours,
      (p_work_order_template->>'estimated_hours')::numeric
    );
  end if;

  -- Validate wo_priority if provided
  if v_wo_priority is not null then
    if not exists (
      select 1
      from cfg.priority_catalogs
      where tenant_id = p_tenant_id
        and entity_type = 'work_order'
        and key = v_wo_priority
    ) then
      raise exception using
        message = format('Invalid priority: %s. Priority must exist in tenant priority catalog for work_order entity type.', v_wo_priority),
        errcode = '23503';
    end if;
  end if;

  -- Update PM schedule
  update app.pm_schedules
  set
    title = coalesce(p_title, title),
    description = coalesce(p_description, description),
    trigger_config = coalesce(p_trigger_config, trigger_config),
    work_order_template = coalesce(p_work_order_template, work_order_template), -- Keep JSONB for backward compatibility
    wo_title = coalesce(v_wo_title, wo_title),
    wo_description = coalesce(v_wo_description, wo_description),
    wo_priority = coalesce(v_wo_priority, wo_priority),
    wo_estimated_hours = coalesce(v_wo_estimated_hours, wo_estimated_hours),
    auto_generate = coalesce(p_auto_generate, auto_generate),
    is_active = coalesce(p_is_active, is_active),
    updated_at = pg_catalog.now()
  where id = p_pm_schedule_id;

  -- Recalculate next_due_date if trigger_config changed
  if p_trigger_config is not null then
    select * into v_pm_schedule
    from app.pm_schedules
    where id = p_pm_schedule_id;

    update app.pm_schedules
    set
      next_due_date = pm.calculate_next_due_date(
        v_pm_schedule,
        v_pm_schedule.last_completed_at
      ),
      updated_at = pg_catalog.now()
    where id = p_pm_schedule_id;
  end if;
end;
$$;

comment on function public.rpc_update_pm_schedule(uuid, uuid, text, text, jsonb, jsonb, boolean, boolean, text, text, text, numeric) is 
  'Updates PM schedule. Recalculates next_due_date if trigger_config changes. Accepts structured wo_* parameters (preferred) or work_order_template JSONB (backward compatible). Requires workorder.create permission. Rate limited to 20 requests per minute per user.';

revoke all on function public.rpc_update_pm_schedule(uuid, uuid, text, text, jsonb, jsonb, boolean, boolean, text, text, text, numeric) from public;
grant execute on function public.rpc_update_pm_schedule(uuid, uuid, text, text, jsonb, jsonb, boolean, boolean, text, text, text, numeric) to authenticated;

create or replace function public.rpc_delete_pm_schedule(
  p_tenant_id uuid,
  p_pm_schedule_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_pm_schedule_tenant_id uuid;
begin
  perform util.check_rate_limit('pm_schedule_delete', null, 10, 1, auth.uid(), p_tenant_id);
  
  v_user_id := authz.rpc_setup(p_tenant_id, 'workorder.create');

  -- Validate PM schedule belongs to tenant
  select tenant_id into v_pm_schedule_tenant_id
  from app.pm_schedules
  where id = p_pm_schedule_id;

  if not found then
    raise exception using
      message = format('PM schedule %s not found', p_pm_schedule_id),
      errcode = 'P0001';
  end if;

  if v_pm_schedule_tenant_id != p_tenant_id then
    raise exception using
      message = 'Unauthorized: PM schedule does not belong to this tenant',
      errcode = '42501';
  end if;

  -- Validate no active dependencies
  if exists (
    select 1
    from app.pm_dependencies
    where pm_schedule_id = p_pm_schedule_id
      or depends_on_pm_id = p_pm_schedule_id
  ) then
    raise exception using
      message = 'Cannot delete PM schedule: Active dependencies exist',
      errcode = '23503';
  end if;

  -- Soft delete (set is_active = false)
  update app.pm_schedules
  set
    is_active = false,
    updated_at = pg_catalog.now()
  where id = p_pm_schedule_id;
end;
$$;

comment on function public.rpc_delete_pm_schedule(uuid, uuid) is 
  'Soft deletes PM schedule (sets is_active = false). Validates no active dependencies. Requires workorder.create permission. Rate limited to 10 requests per minute per user.';

revoke all on function public.rpc_delete_pm_schedule(uuid, uuid) from public;
grant execute on function public.rpc_delete_pm_schedule(uuid, uuid) to authenticated;

create or replace function public.rpc_generate_due_pms(
  p_tenant_id uuid,
  p_limit integer default 100
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_pm_schedule app.pm_schedules%rowtype;
  v_generated_count integer := 0;
begin
  perform util.check_rate_limit('pm_generate_due', null, 10, 1, auth.uid(), p_tenant_id);
  
  v_user_id := authz.rpc_setup(p_tenant_id, 'workorder.create');

  -- Find due PMs and generate work orders
  for v_pm_schedule in
    select *
    from app.pm_schedules
    where tenant_id = p_tenant_id
      and is_active = true
      and auto_generate = true
      and next_due_date is not null
      and next_due_date <= pg_catalog.now()
      and pm.is_pm_due(pm_schedules)
    limit p_limit
  loop
    -- Check dependencies
    if pm.check_pm_dependencies(v_pm_schedule.id) then
      -- Generate work order
      perform pm.generate_pm_work_order(v_pm_schedule.id);
      v_generated_count := v_generated_count + 1;
    end if;
  end loop;

  return v_generated_count;
end;
$$;

comment on function public.rpc_generate_due_pms(uuid, integer) is 
  'Batch function to generate work orders for due PMs. Finds PMs where next_due_date <= now() and is_due() = true, checks dependencies, generates WOs, updates next_due_date. Returns count of generated WOs. Requires workorder.create permission. Rate limited to 10 requests per minute per user.';

revoke all on function public.rpc_generate_due_pms(uuid, integer) from public;
grant execute on function public.rpc_generate_due_pms(uuid, integer) to authenticated;

create or replace function public.rpc_trigger_manual_pm(
  p_tenant_id uuid,
  p_pm_schedule_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_pm_schedule app.pm_schedules%rowtype;
  v_work_order_id uuid;
begin
  perform util.check_rate_limit('pm_trigger_manual', null, 20, 1, auth.uid(), p_tenant_id);
  
  v_user_id := authz.rpc_setup(p_tenant_id, 'workorder.create');

  -- Validate PM schedule belongs to tenant
  select * into v_pm_schedule
  from app.pm_schedules
  where id = p_pm_schedule_id;

  if not found then
    raise exception using
      message = format('PM schedule %s not found', p_pm_schedule_id),
      errcode = 'P0001';
  end if;

  if v_pm_schedule.tenant_id != p_tenant_id then
    raise exception using
      message = 'Unauthorized: PM schedule does not belong to this tenant',
      errcode = '42501';
  end if;

  -- Validate trigger type is manual
  if v_pm_schedule.trigger_type != 'manual' then
    raise exception using
      message = format('PM schedule trigger_type must be "manual", got: %s', v_pm_schedule.trigger_type),
      errcode = '23514';
  end if;

  -- Check if PM is active
  if not v_pm_schedule.is_active then
    raise exception using
      message = 'PM schedule is not active',
      errcode = '23503';
  end if;

  -- Check dependencies
  if not pm.check_pm_dependencies(p_pm_schedule_id) then
    raise exception using
      message = 'PM dependencies not satisfied',
      errcode = '23503';
  end if;

  -- Generate work order
  v_work_order_id := pm.generate_pm_work_order(p_pm_schedule_id);

  return v_work_order_id;
end;
$$;

comment on function public.rpc_trigger_manual_pm(uuid, uuid) is 
  'Manually triggers a manual-type PM schedule. Generates work order immediately. Requires workorder.create permission. Rate limited to 20 requests per minute per user. Returns the UUID of the generated work order.';

revoke all on function public.rpc_trigger_manual_pm(uuid, uuid) from public;
grant execute on function public.rpc_trigger_manual_pm(uuid, uuid) to authenticated;

create or replace function public.rpc_create_pm_dependency(
  p_tenant_id uuid,
  p_pm_schedule_id uuid,
  p_depends_on_pm_id uuid,
  p_dependency_type text default 'after'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_dependency_id uuid;
  v_pm_tenant_id uuid;
  v_depends_on_tenant_id uuid;
begin
  perform util.check_rate_limit('pm_dependency_create', null, 20, 1, auth.uid(), p_tenant_id);
  
  v_user_id := authz.rpc_setup(p_tenant_id, 'workorder.create');

  -- Validate dependency_type
  if p_dependency_type not in ('before', 'after', 'same_day') then
    raise exception using
      message = format('Invalid dependency_type: %s', p_dependency_type),
      errcode = '23514';
  end if;

  -- Validate PM schedules belong to tenant
  select tenant_id into v_pm_tenant_id
  from app.pm_schedules
  where id = p_pm_schedule_id;

  if not found then
    raise exception using
      message = format('PM schedule %s not found', p_pm_schedule_id),
      errcode = 'P0001';
  end if;

  select tenant_id into v_depends_on_tenant_id
  from app.pm_schedules
  where id = p_depends_on_pm_id;

  if not found then
    raise exception using
      message = format('PM schedule %s not found', p_depends_on_pm_id),
      errcode = 'P0001';
  end if;

  if v_pm_tenant_id != p_tenant_id or v_depends_on_tenant_id != p_tenant_id then
    raise exception using
      message = 'Unauthorized: PM schedules must belong to this tenant',
      errcode = '42501';
  end if;

  -- Prevent self-dependency
  if p_pm_schedule_id = p_depends_on_pm_id then
    raise exception using
      message = 'PM schedule cannot depend on itself',
      errcode = '23503';
  end if;

  -- Insert dependency (trigger will validate for cycles)
  insert into app.pm_dependencies (
    tenant_id,
    pm_schedule_id,
    depends_on_pm_id,
    dependency_type
  )
  values (
    p_tenant_id,
    p_pm_schedule_id,
    p_depends_on_pm_id,
    p_dependency_type
  )
  returning id into v_dependency_id;

  return v_dependency_id;
end;
$$;

comment on function public.rpc_create_pm_dependency(uuid, uuid, uuid, text) is 
  'Creates PM dependency. Validates no circular dependencies (via trigger). Requires workorder.create permission. Rate limited to 20 requests per minute per user. Returns the UUID of the created dependency.';

revoke all on function public.rpc_create_pm_dependency(uuid, uuid, uuid, text) from public;
grant execute on function public.rpc_create_pm_dependency(uuid, uuid, uuid, text) to authenticated;

-- ============================================================================
-- Update pm.generate_pm_work_order to use RPC function
-- ============================================================================

create or replace function pm.generate_pm_work_order(
  p_pm_schedule_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pm_schedule app.pm_schedules%rowtype;
  v_work_order_id uuid;
  v_wo_template jsonb;
  v_title text;
  v_description text;
  v_priority text;
  v_maintenance_type text;
begin
  -- Get PM schedule
  select * into v_pm_schedule
  from app.pm_schedules
  where id = p_pm_schedule_id;

  if not found then
    raise exception using
      message = format('PM schedule %s not found', p_pm_schedule_id),
      errcode = 'P0001';
  end if;

  -- Check if dependencies are met
  if not pm.check_pm_dependencies(p_pm_schedule_id) then
    raise exception using
      message = 'PM dependencies not satisfied',
      errcode = '23503';
  end if;

  -- Get work order template (from schedule or template)
  v_wo_template := coalesce(
    v_pm_schedule.work_order_template,
    (
      select work_order_template
      from cfg.pm_templates
      where id = v_pm_schedule.template_id
    ),
    '{}'::jsonb
  );

  -- Extract template values
  v_title := coalesce(
    v_wo_template->>'title',
    v_pm_schedule.title
  );
  v_description := coalesce(
    v_wo_template->>'description',
    v_pm_schedule.description
  );
  v_priority := coalesce(
    v_wo_template->>'priority',
    'medium'
  );

  -- Determine maintenance type based on trigger type
  if v_pm_schedule.trigger_type = 'time' then
    v_maintenance_type := 'preventive_time';
  elsif v_pm_schedule.trigger_type = 'usage' then
    v_maintenance_type := 'preventive_usage';
  else
    v_maintenance_type := 'preventive_time';
  end if;

  -- Create work order via RPC
  v_work_order_id := public.rpc_create_work_order(
    v_pm_schedule.tenant_id,
    v_title,
    v_description,
    v_priority,
    null, -- assigned_to
    null, -- location_id (can be extracted from template if needed)
    v_pm_schedule.asset_id,
    null, -- due_date
    p_pm_schedule_id
  );

  -- Update work order with maintenance_type (RPC doesn't set it, so we update directly)
  update app.work_orders
  set
    maintenance_type = v_maintenance_type
  where id = v_work_order_id;

  -- Update PM schedule
  update app.pm_schedules
  set
    last_work_order_id = v_work_order_id,
    updated_at = pg_catalog.now()
  where id = p_pm_schedule_id;

  -- Recalculate next_due_date (for time-based PMs)
  if v_pm_schedule.trigger_type = 'time' then
    update app.pm_schedules
    set
      next_due_date = pm.calculate_next_due_date(
        v_pm_schedule,
        v_pm_schedule.last_completed_at
      ),
      updated_at = pg_catalog.now()
    where id = p_pm_schedule_id;
  end if;

  return v_work_order_id;
end;
$$;

comment on function pm.generate_pm_work_order(uuid) is 
  'Generates work order from PM schedule using RPC function. Uses work_order_template, sets maintenance_type to preventive_time or preventive_usage, links to PM schedule, updates next_due_date. Checks dependencies before generating.';

-- ============================================================================
-- Extend rpc_create_work_order to accept p_pm_schedule_id
-- ============================================================================

create or replace function public.rpc_create_work_order(
  p_tenant_id uuid,
  p_title text,
  p_description text default null,
  p_priority text default 'medium',
  p_assigned_to uuid default null,
  p_location_id uuid default null,
  p_asset_id uuid default null,
  p_due_date timestamptz default null,
  p_pm_schedule_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_work_order_id uuid;
  v_initial_status text;
  v_pm_schedule_tenant_id uuid;
  v_pm_schedule_is_active boolean;
begin
  perform util.check_rate_limit('work_order_create', null, 10, 1, auth.uid(), p_tenant_id);
  
  v_user_id := authz.rpc_setup(p_tenant_id, 'workorder.create');

  -- Validate PM schedule if provided
  if p_pm_schedule_id is not null then
    select tenant_id, is_active into v_pm_schedule_tenant_id, v_pm_schedule_is_active
    from app.pm_schedules
    where id = p_pm_schedule_id;

    if not found then
      raise exception using
        message = format('PM schedule %s not found', p_pm_schedule_id),
        errcode = 'P0001';
    end if;

    if v_pm_schedule_tenant_id != p_tenant_id then
      raise exception using
        message = 'Unauthorized: PM schedule does not belong to this tenant',
        errcode = '42501';
    end if;

    if not v_pm_schedule_is_active then
      raise exception using
        message = 'PM schedule is not active',
        errcode = '23503';
    end if;
  end if;

  if not exists (
    select 1
    from cfg.priority_catalogs
    where tenant_id = p_tenant_id
      and entity_type = 'work_order'
      and key = p_priority
  ) then
    raise exception using
      message = format('Invalid priority: %s', p_priority),
      errcode = '23503';
  end if;

  v_initial_status := cfg.get_default_status(
    p_tenant_id,
    'work_order',
    pg_catalog.jsonb_build_object('assigned_to', p_assigned_to)
  );

  insert into app.work_orders (
    tenant_id,
    title,
    description,
    priority,
    assigned_to,
    location_id,
    asset_id,
    due_date,
    status,
    pm_schedule_id
  )
  values (
    p_tenant_id,
    p_title,
    p_description,
    p_priority,
    p_assigned_to,
    p_location_id,
    p_asset_id,
    p_due_date,
    v_initial_status,
    p_pm_schedule_id
  )
  returning id into v_work_order_id;

  return v_work_order_id;
end;
$$;

comment on function public.rpc_create_work_order(uuid, text, text, text, uuid, uuid, uuid, timestamptz, uuid) is 
  'Creates a new work order for the current tenant context. Requires workorder.create permission. Validates priority exists in catalog, automatically assigns default status from workflow catalogs based on context (e.g., assigned status if assigned_to is provided). Validates that referenced assets, locations, and PM schedules belong to the same tenant. Rate limited to 10 work orders per minute per user. Returns the UUID of the created work order. Side effects: Creates work order record. Security implications: Requires workorder.create permission and tenant membership. Extended to support PM schedule linkage via p_pm_schedule_id parameter.';

revoke all on function public.rpc_create_work_order(uuid, text, text, text, uuid, uuid, uuid, timestamptz, uuid) from public;
grant execute on function public.rpc_create_work_order(uuid, text, text, text, uuid, uuid, uuid, timestamptz, uuid) to authenticated;
