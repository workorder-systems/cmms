-- SPDX-License-Identifier: AGPL-3.0-or-later
--
-- Mobile-first: lightweight sync views and rpc_mobile_sync for offline payload.
--
-- Purpose: Add v_mobile_* views (minimal columns, tenant-scoped) and rpc_mobile_sync
--   for incremental sync by updated_at with optional technician filter. Add
--   (tenant_id, updated_at) indexes where missing for efficient sync queries.
--
-- Affected: new indexes on app.locations, app.work_order_time_entries,
--   app.work_order_attachments; public.v_mobile_work_orders, v_mobile_assets,
--   v_mobile_locations, v_mobile_work_order_time_entries, v_mobile_work_order_attachments,
--   v_mobile_work_order_check_ins, v_mobile_work_order_notes; public.rpc_mobile_sync.

-- ============================================================================
-- 1. Indexes for incremental sync (tenant_id, updated_at or created_at)
-- ============================================================================

create index if not exists locations_tenant_updated_idx
  on app.locations (tenant_id, updated_at desc);

create index if not exists work_order_time_entries_tenant_updated_idx
  on app.work_order_time_entries (tenant_id, updated_at desc);

create index if not exists work_order_attachments_tenant_updated_idx
  on app.work_order_attachments (tenant_id, updated_at desc);

create index if not exists work_orders_tenant_updated_idx
  on app.work_orders (tenant_id, updated_at desc);

create index if not exists assets_tenant_updated_idx
  on app.assets (tenant_id, updated_at desc);

-- ============================================================================
-- 2. Lightweight mobile views (minimal columns, tenant-scoped)
-- ============================================================================

create or replace view public.v_mobile_work_orders
with (security_invoker = true)
as
select
  wo.id,
  wo.tenant_id,
  wo.title,
  wo.status,
  wo.priority,
  wo.assigned_to,
  wo.location_id,
  wo.asset_id,
  wo.due_date,
  wo.completed_at,
  wo.updated_at
from app.work_orders wo
where wo.tenant_id = authz.get_current_tenant_id();

comment on view public.v_mobile_work_orders is
  'Minimal work order columns for mobile sync. Tenant-scoped. Use updated_at for incremental sync.';

create or replace view public.v_mobile_assets
with (security_invoker = true)
as
select
  a.id,
  a.tenant_id,
  a.name,
  a.asset_number,
  a.location_id,
  a.status,
  a.updated_at
from app.assets a
where a.tenant_id = authz.get_current_tenant_id();

comment on view public.v_mobile_assets is
  'Minimal asset columns for mobile sync. Tenant-scoped. Use updated_at for incremental sync.';

create or replace view public.v_mobile_locations
with (security_invoker = true)
as
select
  l.id,
  l.tenant_id,
  l.name,
  l.parent_location_id,
  l.updated_at
from app.locations l
where l.tenant_id = authz.get_current_tenant_id();

comment on view public.v_mobile_locations is
  'Minimal location columns for mobile sync. Tenant-scoped. Use updated_at for incremental sync.';

create or replace view public.v_mobile_work_order_time_entries
with (security_invoker = true)
as
select
  tote.id,
  tote.tenant_id,
  tote.work_order_id,
  tote.user_id,
  tote.entry_date,
  tote.minutes,
  tote.description,
  tote.logged_at,
  tote.created_at,
  tote.updated_at,
  tote.latitude,
  tote.longitude
from app.work_order_time_entries tote
where tote.tenant_id = authz.get_current_tenant_id();

comment on view public.v_mobile_work_order_time_entries is
  'Minimal time entry columns for mobile sync. Tenant-scoped. Use updated_at for incremental sync.';

create or replace view public.v_mobile_work_order_attachments
with (security_invoker = true)
as
select
  woa.id,
  woa.tenant_id,
  woa.work_order_id,
  woa.file_id,
  woa.label,
  woa.kind,
  woa.created_at,
  woa.updated_at
from app.work_order_attachments woa
where woa.tenant_id = authz.get_current_tenant_id();

comment on view public.v_mobile_work_order_attachments is
  'Minimal work order attachment metadata for mobile sync. Tenant-scoped. Join app.files for storage path.';

create or replace view public.v_mobile_work_order_check_ins
with (security_invoker = true)
as
select
  c.id,
  c.tenant_id,
  c.work_order_id,
  c.user_id,
  c.checked_in_at,
  c.latitude,
  c.longitude,
  c.created_at
from app.work_order_check_ins c
where c.tenant_id = authz.get_current_tenant_id();

comment on view public.v_mobile_work_order_check_ins is
  'Check-ins for mobile sync. Tenant-scoped. Use created_at for incremental sync (no updated_at).';

create or replace view public.v_mobile_work_order_notes
with (security_invoker = true)
as
select
  n.id,
  n.tenant_id,
  n.work_order_id,
  n.body,
  n.created_by,
  n.created_at
from app.work_order_notes n
where n.tenant_id = authz.get_current_tenant_id();

comment on view public.v_mobile_work_order_notes is
  'Work order notes for mobile sync. Tenant-scoped. Use created_at for incremental sync.';

grant select on public.v_mobile_work_orders to authenticated, anon;
grant select on public.v_mobile_assets to authenticated, anon;
grant select on public.v_mobile_locations to authenticated, anon;
grant select on public.v_mobile_work_order_time_entries to authenticated, anon;
grant select on public.v_mobile_work_order_attachments to authenticated, anon;
grant select on public.v_mobile_work_order_check_ins to authenticated, anon;
grant select on public.v_mobile_work_order_notes to authenticated, anon;

-- ============================================================================
-- 3. rpc_mobile_sync: single RPC returning JSON payload for incremental sync
-- ============================================================================

create or replace function public.rpc_mobile_sync(
  p_tenant_id uuid,
  p_updated_after timestamptz default null,
  p_limit int default 500,
  p_technician_id uuid default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_result jsonb;
begin
  v_user_id := authz.rpc_setup(p_tenant_id);

  if p_limit is null or p_limit < 1 then
    p_limit := 500;
  end if;
  if p_limit > 2000 then
    p_limit := 2000;
  end if;

  v_result := jsonb_build_object(
    'work_orders', (
      select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
      from (
        select wo.id, wo.tenant_id, wo.title, wo.status, wo.priority, wo.assigned_to,
               wo.location_id, wo.asset_id, wo.due_date, wo.completed_at, wo.updated_at
        from app.work_orders wo
        where wo.tenant_id = p_tenant_id
          and (p_updated_after is null or wo.updated_at > p_updated_after)
          and (p_technician_id is null
               or wo.assigned_to = (select user_id from app.technicians where id = p_technician_id and tenant_id = p_tenant_id)
               or exists (select 1 from app.work_order_assignments wa where wa.work_order_id = wo.id and wa.technician_id = p_technician_id))
        order by wo.updated_at asc
        limit p_limit
      ) t
    ),
    'assets', (
      select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
      from (
        select a.id, a.tenant_id, a.name, a.asset_number, a.location_id, a.status, a.updated_at
        from app.assets a
        where a.tenant_id = p_tenant_id
          and (p_updated_after is null or a.updated_at > p_updated_after)
        order by a.updated_at asc
        limit p_limit
      ) t
    ),
    'locations', (
      select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
      from (
        select l.id, l.tenant_id, l.name, l.parent_location_id, l.updated_at
        from app.locations l
        where l.tenant_id = p_tenant_id
          and (p_updated_after is null or l.updated_at > p_updated_after)
        order by l.updated_at asc
        limit p_limit
      ) t
    ),
    'time_entries', (
      select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
      from (
        select tote.id, tote.tenant_id, tote.work_order_id, tote.user_id, tote.entry_date,
               tote.minutes, tote.description, tote.logged_at, tote.created_at, tote.updated_at,
               tote.latitude, tote.longitude
        from app.work_order_time_entries tote
        where tote.tenant_id = p_tenant_id
          and (p_updated_after is null or tote.updated_at > p_updated_after)
        order by tote.updated_at asc
        limit p_limit
      ) t
    ),
    'attachments', (
      select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
      from (
        select woa.id, woa.tenant_id, woa.work_order_id, woa.file_id, woa.label, woa.kind,
               woa.created_at, woa.updated_at
        from app.work_order_attachments woa
        where woa.tenant_id = p_tenant_id
          and (p_updated_after is null or woa.updated_at > p_updated_after)
        order by woa.updated_at asc
        limit p_limit
      ) t
    ),
    'check_ins', (
      select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
      from (
        select c.id, c.tenant_id, c.work_order_id, c.user_id, c.checked_in_at,
               c.latitude, c.longitude, c.created_at
        from app.work_order_check_ins c
        where c.tenant_id = p_tenant_id
          and (p_updated_after is null or c.created_at > p_updated_after)
        order by c.created_at asc
        limit p_limit
      ) t
    ),
    'notes', (
      select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
      from (
        select n.id, n.tenant_id, n.work_order_id, n.body, n.created_by, n.created_at
        from app.work_order_notes n
        where n.tenant_id = p_tenant_id
          and (p_updated_after is null or n.created_at > p_updated_after)
        order by n.created_at asc
        limit p_limit
      ) t
    )
  );

  return v_result;
end;
$$;

comment on function public.rpc_mobile_sync(uuid, timestamptz, int, uuid) is
  'Returns a JSON payload of work orders, assets, locations, time entries, attachments, check-ins, and notes for mobile offline sync. Set p_updated_after for incremental sync; p_technician_id filters work orders to those assigned to that technician. Limit per entity type (default 500, max 2000). Set tenant context via rpc_set_tenant_context or pass p_tenant_id.';

revoke all on function public.rpc_mobile_sync(uuid, timestamptz, int, uuid) from public;
grant execute on function public.rpc_mobile_sync(uuid, timestamptz, int, uuid) to authenticated;
