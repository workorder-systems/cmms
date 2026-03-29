-- SPDX-License-Identifier: AGPL-3.0-or-later
--
-- purpose: strengthen the agent-facing contract for the most common automation flow:
--   set tenant context, resolve entities, create work orders, and retry safely.
--
-- affected objects:
--   - public.rpc_create_work_order(uuid, text, text, text, text, uuid, uuid, uuid, timestamptz, uuid, uuid, text)
--   - public.rpc_search_entity_candidates_v2(text, text[], int)
--
-- notes:
--   - work-order creation remains backward-compatible because the new idempotency key
--     is an optional trailing parameter.
--   - entity search v2 keeps the original rpc_search_entity_candidates shape unchanged
--     and adds richer disambiguation fields for agents.

set check_function_bodies = off;

-- ============================================================================
-- 1. work order create: optional retry-safe client request id
-- ============================================================================

-- dropping the prior signature keeps PostgREST resolution simple while preserving
-- backward compatibility for callers that omit the new trailing argument.
drop function if exists public.rpc_create_work_order(
  uuid,
  text,
  text,
  text,
  text,
  uuid,
  uuid,
  uuid,
  timestamptz,
  uuid,
  uuid
);

create or replace function public.rpc_create_work_order(
  p_tenant_id uuid,
  p_title text,
  p_description text default null,
  p_priority text default 'medium',
  p_maintenance_type text default null,
  p_assigned_to uuid default null,
  p_location_id uuid default null,
  p_asset_id uuid default null,
  p_due_date timestamptz default null,
  p_pm_schedule_id uuid default null,
  p_project_id uuid default null,
  p_client_request_id text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_work_order_id uuid;
  v_existing_work_order_id uuid;
  v_initial_status text;
  v_pm_schedule_tenant_id uuid;
  v_pm_schedule_is_active boolean;
  v_project_tenant_id uuid;
  v_client_request_id text;
  v_idempotency_scope constant text := 'work_order.create';
begin
  v_client_request_id := nullif(trim(p_client_request_id), '');

  perform util.check_rate_limit('work_order_create', null, 10, 1, auth.uid(), p_tenant_id);

  v_user_id := authz.rpc_setup(p_tenant_id, 'workorder.create');

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

  if p_maintenance_type is not null then
    if not exists (
      select 1
      from cfg.maintenance_type_catalogs
      where tenant_id = p_tenant_id
        and entity_type = 'work_order'
        and key = p_maintenance_type
    ) then
      raise exception using
        message = format('Invalid maintenance type: %s', p_maintenance_type),
        errcode = '23503';
    end if;
  end if;

  if p_pm_schedule_id is not null then
    select tenant_id, is_active
    into v_pm_schedule_tenant_id, v_pm_schedule_is_active
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

  if p_project_id is not null then
    select tenant_id
    into v_project_tenant_id
    from app.projects
    where id = p_project_id;

    if not found then
      raise exception using
        message = format('Project %s not found', p_project_id),
        errcode = 'P0001';
    end if;

    perform util.validate_tenant_match(p_tenant_id, v_project_tenant_id, 'Project');
  end if;

  /*
   * claim the idempotency key only after validation passes so a bad request does
   * not permanently poison the key. if a previous successful call already created
   * the work order, return that id instead of duplicating the write.
   */
  if v_client_request_id is not null then
    insert into app.client_idempotency (
      tenant_id,
      scope,
      idempotency_key,
      resource_id
    )
    values (
      p_tenant_id,
      v_idempotency_scope,
      v_client_request_id,
      null
    )
    on conflict (tenant_id, scope, idempotency_key) do nothing;

    if not found then
      select c.resource_id
      into v_existing_work_order_id
      from app.client_idempotency c
      where c.tenant_id = p_tenant_id
        and c.scope = v_idempotency_scope
        and c.idempotency_key = v_client_request_id;

      if v_existing_work_order_id is not null then
        return v_existing_work_order_id;
      end if;

      raise exception using
        message = format(
          'work order create request %s is already in progress; retry with the same client_request_id',
          v_client_request_id
        ),
        errcode = '40001';
    end if;
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
    maintenance_type,
    assigned_to,
    location_id,
    asset_id,
    due_date,
    status,
    pm_schedule_id,
    project_id
  )
  values (
    p_tenant_id,
    p_title,
    p_description,
    p_priority,
    p_maintenance_type,
    p_assigned_to,
    p_location_id,
    p_asset_id,
    p_due_date,
    v_initial_status,
    p_pm_schedule_id,
    p_project_id
  )
  returning id into v_work_order_id;

  if v_client_request_id is not null then
    update app.client_idempotency
    set resource_id = v_work_order_id
    where tenant_id = p_tenant_id
      and scope = v_idempotency_scope
      and idempotency_key = v_client_request_id
      and resource_id is null;
  end if;

  return v_work_order_id;
end;
$$;

comment on function public.rpc_create_work_order(
  uuid,
  text,
  text,
  text,
  text,
  uuid,
  uuid,
  uuid,
  timestamptz,
  uuid,
  uuid,
  text
) is
  'Creates a work order. Tenant membership and workflow catalogs are validated server-side. Optional p_client_request_id makes retries safe: repeated calls with the same tenant and client request id return the original work_order_id instead of creating duplicates.';

revoke all on function public.rpc_create_work_order(
  uuid,
  text,
  text,
  text,
  text,
  uuid,
  uuid,
  uuid,
  timestamptz,
  uuid,
  uuid,
  text
) from public;

grant execute on function public.rpc_create_work_order(
  uuid,
  text,
  text,
  text,
  text,
  uuid,
  uuid,
  uuid,
  timestamptz,
  uuid,
  uuid,
  text
) to authenticated;

-- ============================================================================
-- 2. richer entity resolution for agents
-- ============================================================================

create or replace function public.rpc_search_entity_candidates_v2(
  p_query text,
  p_entity_types text[] default null,
  p_limit int default 10
)
returns table (
  entity_type text,
  entity_id uuid,
  label text,
  match_type text,
  score double precision,
  subtitle text,
  site_name text,
  location_path text,
  asset_number text,
  barcode text,
  part_number text,
  supplier_name text,
  disambiguation_hint text
)
language plpgsql
stable
set search_path = ''
as $$
declare
  v_tenant_id uuid;
  v_user_id uuid;
  v_q text;
  v_q_lower text;
  lim int;
begin
  v_user_id := authz.validate_authenticated();
  v_tenant_id := authz.get_current_tenant_id();

  if v_tenant_id is null then
    raise exception using
      message = 'Tenant context required. Call rpc_set_tenant_context first.',
      errcode = 'P0001';
  end if;

  if not authz.is_tenant_member(v_user_id, v_tenant_id) then
    return;
  end if;

  v_q := trim(coalesce(p_query, ''));
  v_q_lower := lower(v_q);
  lim := least(greatest(coalesce(p_limit, 10), 1), 50);

  if v_q = '' then
    return;
  end if;

  return query
  with location_context as (
    select
      lh.id as location_id,
      lh.tenant_id,
      array_to_string(lh.path_names, ' > ') as location_path,
      (
        select site.name
        from app.locations site
        where site.tenant_id = lh.tenant_id
          and site.location_type = 'site'
          and site.id = any (lh.path_ids)
        order by array_position(lh.path_ids, site.id)
        limit 1
      ) as site_name
    from app.v_location_hierarchy lh
  ),
  candidate_rows as (
    -- alias matches for assets
    select
      'asset'::text as entity_type,
      a.id as entity_id,
      a.name as label,
      case
        when ea.alias_text::text = v_q then 'alias_exact'
        else 'alias_partial'
      end as match_type,
      case
        when ea.alias_text::text = v_q then 1.00::double precision
        else 0.96::double precision
      end as score,
      concat_ws(
        ' · ',
        format('alias: %s', ea.alias_text::text),
        nullif(a.asset_number, ''),
        nullif(a.barcode, ''),
        nullif(lc.location_path, ''),
        nullif(a.status, '')
      ) as subtitle,
      lc.site_name,
      lc.location_path,
      a.asset_number,
      a.barcode,
      null::text as part_number,
      null::text as supplier_name,
      coalesce(
        nullif(lc.location_path, ''),
        concat_ws(' · ', nullif(a.asset_number, ''), nullif(a.barcode, ''))
      ) as disambiguation_hint
    from app.entity_aliases ea
    join app.assets a
      on a.id = ea.entity_id
     and a.tenant_id = ea.tenant_id
    left join location_context lc
      on lc.location_id = a.location_id
     and lc.tenant_id = a.tenant_id
    where ea.tenant_id = v_tenant_id
      and ea.entity_type = 'asset'
      and ea.alias_text ilike '%' || v_q || '%'
      and (p_entity_types is null or 'asset' = any (p_entity_types))

    union all

    -- alias matches for parts
    select
      'part'::text as entity_type,
      p.id as entity_id,
      coalesce(p.name, p.part_number) as label,
      case
        when ea.alias_text::text = v_q then 'alias_exact'
        else 'alias_partial'
      end as match_type,
      case
        when ea.alias_text::text = v_q then 1.00::double precision
        else 0.96::double precision
      end as score,
      concat_ws(
        ' · ',
        format('alias: %s', ea.alias_text::text),
        nullif(p.part_number, ''),
        nullif(p.barcode, ''),
        nullif(s.name, '')
      ) as subtitle,
      null::text as site_name,
      null::text as location_path,
      null::text as asset_number,
      p.barcode,
      p.part_number,
      s.name as supplier_name,
      concat_ws(' · ', nullif(p.part_number, ''), nullif(p.barcode, ''), nullif(s.name, '')) as disambiguation_hint
    from app.entity_aliases ea
    join app.parts p
      on p.id = ea.entity_id
     and p.tenant_id = ea.tenant_id
    left join app.suppliers s
      on s.id = p.preferred_supplier_id
     and s.tenant_id = p.tenant_id
    where ea.tenant_id = v_tenant_id
      and ea.entity_type = 'part'
      and ea.alias_text ilike '%' || v_q || '%'
      and (p_entity_types is null or 'part' = any (p_entity_types))

    union all

    -- alias matches for locations
    select
      'location'::text as entity_type,
      l.id as entity_id,
      l.name as label,
      case
        when ea.alias_text::text = v_q then 'alias_exact'
        else 'alias_partial'
      end as match_type,
      case
        when ea.alias_text::text = v_q then 1.00::double precision
        else 0.96::double precision
      end as score,
      concat_ws(
        ' · ',
        format('alias: %s', ea.alias_text::text),
        nullif(l.location_type, ''),
        nullif(l.code, ''),
        nullif(lc.location_path, '')
      ) as subtitle,
      lc.site_name,
      lc.location_path,
      null::text as asset_number,
      null::text as barcode,
      null::text as part_number,
      null::text as supplier_name,
      coalesce(nullif(lc.location_path, ''), nullif(l.code, ''), l.location_type) as disambiguation_hint
    from app.entity_aliases ea
    join app.locations l
      on l.id = ea.entity_id
     and l.tenant_id = ea.tenant_id
    left join location_context lc
      on lc.location_id = l.id
     and lc.tenant_id = l.tenant_id
    where ea.tenant_id = v_tenant_id
      and ea.entity_type = 'location'
      and ea.alias_text ilike '%' || v_q || '%'
      and (p_entity_types is null or 'location' = any (p_entity_types))

    union all

    -- exact and partial asset identifiers
    select
      'asset'::text,
      a.id,
      a.name,
      case
        when a.barcode is not null and a.barcode = v_q then 'barcode_exact'
        when a.asset_number is not null and a.asset_number = v_q then 'asset_number_exact'
        when lower(a.name) = v_q_lower then 'name_exact'
        else 'name_partial'
      end as match_type,
      case
        when a.barcode is not null and a.barcode = v_q then 0.99::double precision
        when a.asset_number is not null and a.asset_number = v_q then 0.98::double precision
        when lower(a.name) = v_q_lower then 0.95::double precision
        else 0.80::double precision
      end as score,
      concat_ws(
        ' · ',
        nullif(a.asset_number, ''),
        nullif(a.barcode, ''),
        nullif(lc.location_path, ''),
        nullif(a.status, '')
      ) as subtitle,
      lc.site_name,
      lc.location_path,
      a.asset_number,
      a.barcode,
      null::text,
      null::text,
      coalesce(
        nullif(lc.location_path, ''),
        concat_ws(' · ', nullif(a.asset_number, ''), nullif(a.barcode, ''))
      ) as disambiguation_hint
    from app.assets a
    left join location_context lc
      on lc.location_id = a.location_id
     and lc.tenant_id = a.tenant_id
    where a.tenant_id = v_tenant_id
      and (p_entity_types is null or 'asset' = any (p_entity_types))
      and (
        (a.barcode is not null and a.barcode = v_q)
        or (a.asset_number is not null and a.asset_number = v_q)
        or lower(a.name) = v_q_lower
        or a.name ilike '%' || v_q || '%'
      )

    union all

    -- exact and partial part identifiers
    select
      'part'::text,
      p.id,
      coalesce(p.name, p.part_number) as label,
      case
        when p.barcode is not null and p.barcode = v_q then 'barcode_exact'
        when p.part_number = v_q then 'part_number_exact'
        when p.external_id is not null and p.external_id = v_q then 'external_id_exact'
        when p.name is not null and lower(p.name) = v_q_lower then 'name_exact'
        else 'name_partial'
      end as match_type,
      case
        when p.barcode is not null and p.barcode = v_q then 0.99::double precision
        when p.part_number = v_q then 0.98::double precision
        when p.external_id is not null and p.external_id = v_q then 0.97::double precision
        when p.name is not null and lower(p.name) = v_q_lower then 0.95::double precision
        else 0.80::double precision
      end as score,
      concat_ws(
        ' · ',
        nullif(p.part_number, ''),
        nullif(p.barcode, ''),
        nullif(s.name, '')
      ) as subtitle,
      null::text,
      null::text,
      null::text,
      p.barcode,
      p.part_number,
      s.name,
      concat_ws(' · ', nullif(p.part_number, ''), nullif(p.barcode, ''), nullif(s.name, '')) as disambiguation_hint
    from app.parts p
    left join app.suppliers s
      on s.id = p.preferred_supplier_id
     and s.tenant_id = p.tenant_id
    where p.tenant_id = v_tenant_id
      and (p_entity_types is null or 'part' = any (p_entity_types))
      and (
        (p.barcode is not null and p.barcode = v_q)
        or p.part_number = v_q
        or (p.external_id is not null and p.external_id = v_q)
        or (p.name is not null and lower(p.name) = v_q_lower)
        or (p.name is not null and p.name ilike '%' || v_q || '%')
      )

    union all

    -- exact and partial location identifiers
    select
      'location'::text,
      l.id,
      l.name,
      case
        when l.code is not null and l.code = v_q then 'code_exact'
        when lower(l.name) = v_q_lower then 'name_exact'
        else 'name_partial'
      end as match_type,
      case
        when l.code is not null and l.code = v_q then 0.98::double precision
        when lower(l.name) = v_q_lower then 0.95::double precision
        else 0.80::double precision
      end as score,
      concat_ws(
        ' · ',
        nullif(l.location_type, ''),
        nullif(l.code, ''),
        nullif(lc.location_path, '')
      ) as subtitle,
      lc.site_name,
      lc.location_path,
      null::text,
      null::text,
      null::text,
      null::text,
      coalesce(nullif(lc.location_path, ''), nullif(l.code, ''), l.location_type) as disambiguation_hint
    from app.locations l
    left join location_context lc
      on lc.location_id = l.id
     and lc.tenant_id = l.tenant_id
    where l.tenant_id = v_tenant_id
      and (p_entity_types is null or 'location' = any (p_entity_types))
      and (
        (l.code is not null and l.code = v_q)
        or lower(l.name) = v_q_lower
        or l.name ilike '%' || v_q || '%'
      )
  ),
  ranked_rows as (
    select
      candidate_rows.*,
      row_number() over (
        partition by candidate_rows.entity_type, candidate_rows.entity_id
        order by candidate_rows.score desc, length(candidate_rows.label) asc, candidate_rows.match_type asc
      ) as row_rank
    from candidate_rows
  )
  select
    ranked_rows.entity_type,
    ranked_rows.entity_id,
    ranked_rows.label,
    ranked_rows.match_type,
    ranked_rows.score,
    ranked_rows.subtitle,
    ranked_rows.site_name,
    ranked_rows.location_path,
    ranked_rows.asset_number,
    ranked_rows.barcode,
    ranked_rows.part_number,
    ranked_rows.supplier_name,
    ranked_rows.disambiguation_hint
  from ranked_rows
  where ranked_rows.row_rank = 1
  order by ranked_rows.score desc, length(ranked_rows.label) asc, ranked_rows.entity_type asc
  limit lim;
end;
$$;

comment on function public.rpc_search_entity_candidates_v2(text, text[], int) is
  'Agent-oriented entity resolution for the active tenant. Returns canonical ids plus disambiguation hints (location path, site, asset_number, barcode, part_number, supplier_name). Call rpc_set_tenant_context first so tenant-scoped matching is explicit.';

revoke all on function public.rpc_search_entity_candidates_v2(text, text[], int) from public;
grant execute on function public.rpc_search_entity_candidates_v2(text, text[], int) to authenticated;
