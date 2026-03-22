/*
 * migration: 20260326103000_integration_external_ids_and_outbound_events.sql
 *
 * purpose: integration external id map + append-only outbound event queue; permission integration.manage.
 */

-- ============================================================================
-- 1. cfg.permissions + admin backfill
-- ============================================================================

insert into cfg.permissions (key, name, category, description)
values (
  'integration.manage',
  'Manage integration mappings and events',
  'integration',
  'Upsert/delete external system ids and enqueue outbound integration events.'
)
on conflict (key) do nothing;

insert into cfg.tenant_role_permissions (tenant_role_id, permission_id)
select tr.id, p.id
from cfg.tenant_roles tr
cross join cfg.permissions p
where tr.key = 'admin'
  and p.key = 'integration.manage'
  and not exists (
    select 1
    from cfg.tenant_role_permissions x
    where x.tenant_role_id = tr.id
      and x.permission_id = p.id
  );

-- ============================================================================
-- 2. int.integration_external_ids
-- ============================================================================

create table int.integration_external_ids (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  system_key text not null,
  external_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default pg_catalog.now(),
  constraint integration_external_ids_entity_type_check check (
    length(trim(entity_type)) >= 1
    and length(trim(entity_type)) <= 80
    and entity_type ~ '^[a-z][a-z0-9_]*$'
  ),
  constraint integration_external_ids_system_key_check check (
    length(trim(system_key)) >= 1
    and length(trim(system_key)) <= 80
  ),
  constraint integration_external_ids_external_id_check check (
    length(trim(external_id)) >= 1
    and length(trim(external_id)) <= 500
  ),
  constraint integration_external_ids_unique_mapping unique (tenant_id, entity_type, entity_id, system_key)
);

comment on table int.integration_external_ids is
  'Maps tenant entities to external system identifiers (ERP, HRIS, etc.).';

create index integration_external_ids_tenant_entity_idx
  on int.integration_external_ids (tenant_id, entity_type, entity_id);

alter table int.integration_external_ids enable row level security;

create policy integration_external_ids_select_tenant on int.integration_external_ids
  for select to authenticated
  using (authz.is_current_user_tenant_member(tenant_id));

create policy integration_external_ids_select_anon on int.integration_external_ids
  for select to anon
  using (false);

create policy integration_external_ids_insert_tenant on int.integration_external_ids
  for insert to authenticated
  with check (false);

create policy integration_external_ids_insert_anon on int.integration_external_ids
  for insert to anon
  with check (false);

create policy integration_external_ids_update_tenant on int.integration_external_ids
  for update to authenticated
  using (false)
  with check (false);

create policy integration_external_ids_update_anon on int.integration_external_ids
  for update to anon
  using (false)
  with check (false);

create policy integration_external_ids_delete_tenant on int.integration_external_ids
  for delete to authenticated
  using (false);

create policy integration_external_ids_delete_anon on int.integration_external_ids
  for delete to anon
  using (false);

grant select on int.integration_external_ids to authenticated;
alter table int.integration_external_ids force row level security;

-- ============================================================================
-- 3. int.outbound_integration_events
-- ============================================================================

create table int.outbound_integration_events (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  event_type text not null,
  payload jsonb not null,
  entity_type text,
  entity_id uuid,
  created_at timestamptz not null default pg_catalog.now(),
  constraint outbound_integration_events_event_type_check check (
    length(trim(event_type)) >= 1 and length(trim(event_type)) <= 120
  )
);

comment on table int.outbound_integration_events is
  'Append-only outbound integration / sync intent for workers or webhooks to consume.';

create index outbound_integration_events_tenant_created_idx
  on int.outbound_integration_events (tenant_id, created_at desc);

alter table int.outbound_integration_events enable row level security;

create policy outbound_integration_events_select_tenant on int.outbound_integration_events
  for select to authenticated
  using (authz.is_current_user_tenant_member(tenant_id));

create policy outbound_integration_events_select_anon on int.outbound_integration_events
  for select to anon
  using (false);

create policy outbound_integration_events_insert_tenant on int.outbound_integration_events
  for insert to authenticated
  with check (false);

create policy outbound_integration_events_insert_anon on int.outbound_integration_events
  for insert to anon
  with check (false);

create policy outbound_integration_events_update_tenant on int.outbound_integration_events
  for update to authenticated
  using (false)
  with check (false);

create policy outbound_integration_events_update_anon on int.outbound_integration_events
  for update to anon
  using (false)
  with check (false);

create policy outbound_integration_events_delete_tenant on int.outbound_integration_events
  for delete to authenticated
  using (false);

create policy outbound_integration_events_delete_anon on int.outbound_integration_events
  for delete to anon
  using (false);

grant select on int.outbound_integration_events to authenticated;
alter table int.outbound_integration_events force row level security;

-- ============================================================================
-- 4. public read views (int not in PostgREST schema list — expose via public)
-- ============================================================================

create or replace view public.v_integration_external_ids
with (security_invoker = true)
as
select
  m.id,
  m.tenant_id,
  m.entity_type,
  m.entity_id,
  m.system_key,
  m.external_id,
  m.metadata,
  m.updated_at
from int.integration_external_ids m
where m.tenant_id = authz.get_current_tenant_id();

comment on view public.v_integration_external_ids is
  'External system id mappings for the current tenant.';

grant select on public.v_integration_external_ids to authenticated, anon;

create or replace view public.v_outbound_integration_events
with (security_invoker = true)
as
select
  e.id,
  e.tenant_id,
  e.event_type,
  e.payload,
  e.entity_type,
  e.entity_id,
  e.created_at
from int.outbound_integration_events e
where e.tenant_id = authz.get_current_tenant_id();

comment on view public.v_outbound_integration_events is
  'Recent outbound integration events for the current tenant (newest first in client queries).';

grant select on public.v_outbound_integration_events to authenticated, anon;

-- ============================================================================
-- 5. RPCs
-- ============================================================================

create or replace function public.rpc_upsert_integration_external_id(
  p_tenant_id uuid,
  p_entity_type text,
  p_entity_id uuid,
  p_system_key text,
  p_external_id text,
  p_metadata jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform util.check_rate_limit('integration_external_id_upsert', null, 120, 1, auth.uid(), p_tenant_id);
  perform authz.rpc_setup(p_tenant_id, 'integration.manage');

  insert into int.integration_external_ids (
    tenant_id,
    entity_type,
    entity_id,
    system_key,
    external_id,
    metadata
  )
  values (
    p_tenant_id,
    trim(p_entity_type),
    p_entity_id,
    trim(p_system_key),
    trim(p_external_id),
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (tenant_id, entity_type, entity_id, system_key)
  do update set
    external_id = excluded.external_id,
    metadata = excluded.metadata,
    updated_at = pg_catalog.now()
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.rpc_upsert_integration_external_id(uuid, text, uuid, text, text, jsonb) from public;
grant execute on function public.rpc_upsert_integration_external_id(uuid, text, uuid, text, text, jsonb) to authenticated;

create or replace function public.rpc_delete_integration_external_id(
  p_tenant_id uuid,
  p_entity_type text,
  p_entity_id uuid,
  p_system_key text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform util.check_rate_limit('integration_external_id_delete', null, 60, 1, auth.uid(), p_tenant_id);
  perform authz.rpc_setup(p_tenant_id, 'integration.manage');

  delete from int.integration_external_ids m
  where m.tenant_id = p_tenant_id
    and m.entity_type = trim(p_entity_type)
    and m.entity_id = p_entity_id
    and m.system_key = trim(p_system_key);
end;
$$;

revoke all on function public.rpc_delete_integration_external_id(uuid, text, uuid, text) from public;
grant execute on function public.rpc_delete_integration_external_id(uuid, text, uuid, text) to authenticated;

create or replace function public.rpc_enqueue_integration_event(
  p_tenant_id uuid,
  p_event_type text,
  p_payload jsonb,
  p_entity_type text default null,
  p_entity_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform util.check_rate_limit('integration_event_enqueue', null, 200, 1, auth.uid(), p_tenant_id);
  perform authz.rpc_setup(p_tenant_id, 'integration.manage');

  if p_payload is null then
    raise exception using message = 'payload is required', errcode = '23514';
  end if;

  insert into int.outbound_integration_events (
    tenant_id,
    event_type,
    payload,
    entity_type,
    entity_id
  )
  values (
    p_tenant_id,
    trim(p_event_type),
    p_payload,
    nullif(trim(p_entity_type), ''),
    p_entity_id
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.rpc_enqueue_integration_event(uuid, text, jsonb, text, uuid) from public;
grant execute on function public.rpc_enqueue_integration_event(uuid, text, jsonb, text, uuid) to authenticated;
