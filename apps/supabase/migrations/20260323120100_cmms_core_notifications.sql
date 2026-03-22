-- SPDX-License-Identifier: AGPL-3.0-or-later
--
-- In-app notifications: preferences, deduped enqueue, assignment + SLA breach
-- + PM overdue signals; cron tick; RPCs for inbox.
--
-- Depends on: pg_cron (from plugin migration), phase 1 SLA columns on work_orders.

-- ============================================================================
-- 1. Permissions
-- ============================================================================

insert into cfg.permissions (key, name, category, description) values
  ('notification.read', 'Read Own Notifications', 'notification', 'View and dismiss own in-app notifications'),
  ('notification.preference.manage', 'Manage Notification Preferences', 'notification', 'Update own notification preferences')
on conflict (key) do nothing;

insert into cfg.tenant_role_permissions (tenant_role_id, permission_id)
select tr.id, p.id
from cfg.tenant_roles tr
cross join cfg.permissions p
where tr.key in ('admin', 'member', 'manager', 'technician', 'requestor')
  and p.key in ('notification.read', 'notification.preference.manage')
  and not exists (
    select 1 from cfg.tenant_role_permissions x
    where x.tenant_role_id = tr.id and x.permission_id = p.id
  );

-- ============================================================================
-- 2. app.notification_preferences
-- ============================================================================

create table app.notification_preferences (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_key text not null,
  channel_in_app boolean not null default true,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint notification_preferences_event_key_check check (
    length(trim(event_key)) >= 1 and length(event_key) <= 100
  ),
  constraint notification_preferences_unique unique (tenant_id, user_id, event_key)
);

comment on table app.notification_preferences is
  'Per-user notification opt-in per event family (in-app channel).';

create index notification_preferences_user_tenant_idx
  on app.notification_preferences (user_id, tenant_id);

create trigger notification_preferences_set_updated_at
  before update on app.notification_preferences
  for each row
  execute function util.set_updated_at();

alter table app.notification_preferences enable row level security;

create policy notification_preferences_select_tenant on app.notification_preferences
  for select to authenticated
  using (
    authz.is_current_user_tenant_member(tenant_id)
    and user_id = auth.uid()
  );

create policy notification_preferences_select_anon on app.notification_preferences
  for select to anon
  using (false);

create policy notification_preferences_insert_tenant on app.notification_preferences
  for insert to authenticated
  with check (
    authz.is_current_user_tenant_member(tenant_id)
    and user_id = auth.uid()
  );

create policy notification_preferences_insert_anon on app.notification_preferences
  for insert to anon
  with check (false);

create policy notification_preferences_update_tenant on app.notification_preferences
  for update to authenticated
  using (
    authz.is_current_user_tenant_member(tenant_id)
    and user_id = auth.uid()
  )
  with check (
    authz.is_current_user_tenant_member(tenant_id)
    and user_id = auth.uid()
  );

create policy notification_preferences_update_anon on app.notification_preferences
  for update to anon
  using (false)
  with check (false);

create policy notification_preferences_delete_tenant on app.notification_preferences
  for delete to authenticated
  using (
    authz.is_current_user_tenant_member(tenant_id)
    and user_id = auth.uid()
  );

create policy notification_preferences_delete_anon on app.notification_preferences
  for delete to anon
  using (false);

alter table app.notification_preferences force row level security;

grant select, insert, update, delete on app.notification_preferences to authenticated;

-- ============================================================================
-- 3. app.notifications
-- ============================================================================

create table app.notifications (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  event_key text not null,
  title text not null,
  body text,
  payload jsonb not null default '{}'::jsonb,
  entity_type text,
  entity_id uuid,
  dedupe_key text,
  read_at timestamptz,
  created_at timestamptz not null default pg_catalog.now(),
  constraint notifications_title_length check (length(trim(title)) >= 1 and length(title) <= 500)
);

comment on table app.notifications is
  'In-app notifications for work orders and assets (assignment, SLA, PM).';

create unique index notifications_dedupe_unique_idx
  on app.notifications (tenant_id, recipient_user_id, dedupe_key)
  where dedupe_key is not null;

-- Note: dedupe uniqueness enforced in app.enqueue_in_app_notification (partial unique index
-- cannot be used reliably with INSERT ON CONFLICT in all versions).

create index notifications_recipient_unread_idx
  on app.notifications (tenant_id, recipient_user_id, created_at desc)
  where read_at is null;

alter table app.notifications enable row level security;

create policy notifications_select_tenant on app.notifications
  for select to authenticated
  using (
    authz.is_current_user_tenant_member(tenant_id)
    and recipient_user_id = auth.uid()
  );

create policy notifications_select_anon on app.notifications
  for select to anon
  using (false);

create policy notifications_insert_tenant on app.notifications
  for insert to authenticated
  with check (false);

create policy notifications_insert_anon on app.notifications
  for insert to anon
  with check (false);

create policy notifications_update_tenant on app.notifications
  for update to authenticated
  using (
    authz.is_current_user_tenant_member(tenant_id)
    and recipient_user_id = auth.uid()
  )
  with check (
    authz.is_current_user_tenant_member(tenant_id)
    and recipient_user_id = auth.uid()
  );

create policy notifications_update_anon on app.notifications
  for update to anon
  using (false)
  with check (false);

create policy notifications_delete_tenant on app.notifications
  for delete to authenticated
  using (false);

create policy notifications_delete_anon on app.notifications
  for delete to anon
  using (false);

alter table app.notifications force row level security;

grant select, update on app.notifications to authenticated;

-- ============================================================================
-- 4. app.enqueue_in_app_notification (security definer)
-- ============================================================================

create or replace function app.enqueue_in_app_notification(
  p_tenant_id uuid,
  p_recipient_user_id uuid,
  p_event_key text,
  p_title text,
  p_body text default null,
  p_payload jsonb default '{}'::jsonb,
  p_entity_type text default null,
  p_entity_id uuid default null,
  p_dedupe_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pref boolean;
  v_id uuid;
begin
  if not authz.is_tenant_member(p_recipient_user_id, p_tenant_id) then
    return null;
  end if;

  select channel_in_app into v_pref
  from app.notification_preferences
  where tenant_id = p_tenant_id
    and user_id = p_recipient_user_id
    and event_key = p_event_key;

  if v_pref is not null and v_pref = false then
    return null;
  end if;

  if p_dedupe_key is not null then
    select id into v_id
    from app.notifications
    where tenant_id = p_tenant_id
      and recipient_user_id = p_recipient_user_id
      and dedupe_key = p_dedupe_key
    limit 1;

    if v_id is not null then
      return v_id;
    end if;
  end if;

  insert into app.notifications (
    tenant_id, recipient_user_id, event_key, title, body, payload,
    entity_type, entity_id, dedupe_key
  )
  values (
    p_tenant_id, p_recipient_user_id, p_event_key, p_title, p_body, coalesce(p_payload, '{}'::jsonb),
    p_entity_type, p_entity_id, p_dedupe_key
  )
  returning id into v_id;

  return v_id;
end;
$$;

comment on function app.enqueue_in_app_notification(uuid, uuid, text, text, text, jsonb, text, uuid, text) is
  'Inserts an in-app notification with optional dedupe. Respects notification_preferences.';

revoke all on function app.enqueue_in_app_notification(uuid, uuid, text, text, text, jsonb, text, uuid, text) from public;
grant execute on function app.enqueue_in_app_notification(uuid, uuid, text, text, text, jsonb, text, uuid, text) to postgres;

-- ============================================================================
-- 5. Wire rpc_assign_work_order
-- ============================================================================

create or replace function public.rpc_assign_work_order(
  p_tenant_id uuid,
  p_work_order_id uuid,
  p_assigned_to uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_prev uuid;
  v_title text;
begin
  perform util.check_rate_limit('work_order_assign', null, 30, 1, auth.uid(), p_tenant_id);

  perform authz.rpc_setup(p_tenant_id, 'workorder.assign');

  select assigned_to, title into v_prev, v_title
  from app.work_orders
  where id = p_work_order_id
    and tenant_id = p_tenant_id;

  if not found then
    raise exception using message = 'Work order not found', errcode = 'P0001';
  end if;

  update app.work_orders
  set assigned_to = p_assigned_to
  where id = p_work_order_id
    and tenant_id = p_tenant_id;

  if p_assigned_to is not null
    and p_assigned_to is distinct from v_prev then
    perform app.enqueue_in_app_notification(
      p_tenant_id,
      p_assigned_to,
      'work_order.assigned',
      'Work order assigned',
      coalesce(v_title, 'Work order'),
      pg_catalog.jsonb_build_object('work_order_id', p_work_order_id),
      'work_order',
      p_work_order_id,
      'wo_assign:' || p_work_order_id::text || ':' || p_assigned_to::text
    );
  end if;
end;
$$;

revoke all on function public.rpc_assign_work_order(uuid, uuid, uuid) from public;
grant execute on function public.rpc_assign_work_order(uuid, uuid, uuid) to authenticated;

-- ============================================================================
-- 6. Cron: SLA breach + PM overdue (internal RPC)
-- ============================================================================

create or replace function public.rpc_process_due_notifications()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_uid uuid;
begin
  for r in
    select id, tenant_id, title
    from app.work_orders
    where status not in ('completed', 'cancelled')
      and sla_response_due_at is not null
      and acknowledged_at is null
      and sla_response_breached_at is null
      and pg_catalog.now() > sla_response_due_at
  loop
    update app.work_orders
    set sla_response_breached_at = pg_catalog.now()
    where id = r.id
      and sla_response_breached_at is null;

    for v_uid in
      select distinct utr.user_id
      from app.user_tenant_roles utr
      join cfg.tenant_roles tr on tr.id = utr.tenant_role_id
      join cfg.tenant_role_permissions trp on trp.tenant_role_id = tr.id
      join cfg.permissions p on p.id = trp.permission_id
      where utr.tenant_id = r.tenant_id
        and p.key in ('workorder.assign', 'tenant.admin')
    loop
      perform app.enqueue_in_app_notification(
        r.tenant_id,
        v_uid,
        'work_order.sla_response_breach',
        'SLA response breached',
        coalesce(r.title, 'Work order'),
        pg_catalog.jsonb_build_object('work_order_id', r.id),
        'work_order',
        r.id,
        'wo_sla_resp:' || r.id::text
      );
    end loop;
  end loop;

  for r in
    select id, tenant_id, title
    from app.work_orders
    where status not in ('completed', 'cancelled')
      and sla_resolution_due_at is not null
      and sla_resolution_breached_at is null
      and pg_catalog.now() > sla_resolution_due_at
  loop
    update app.work_orders
    set sla_resolution_breached_at = pg_catalog.now()
    where id = r.id
      and sla_resolution_breached_at is null;

    for v_uid in
      select distinct utr.user_id
      from app.user_tenant_roles utr
      join cfg.tenant_roles tr on tr.id = utr.tenant_role_id
      join cfg.tenant_role_permissions trp on trp.tenant_role_id = tr.id
      join cfg.permissions p on p.id = trp.permission_id
      where utr.tenant_id = r.tenant_id
        and p.key in ('workorder.assign', 'tenant.admin')
    loop
      perform app.enqueue_in_app_notification(
        r.tenant_id,
        v_uid,
        'work_order.sla_resolution_breach',
        'SLA resolution breached',
        coalesce(r.title, 'Work order'),
        pg_catalog.jsonb_build_object('work_order_id', r.id),
        'work_order',
        r.id,
        'wo_sla_res:' || r.id::text
      );
    end loop;
  end loop;

  for r in
    select ps.id, ps.tenant_id, ps.title, ps.asset_id
    from app.pm_schedules ps
    where ps.is_active = true
      and ps.next_due_date is not null
      and ps.next_due_date < pg_catalog.now()
  loop
    for v_uid in
      select distinct utr.user_id
      from app.user_tenant_roles utr
      join cfg.tenant_roles tr on tr.id = utr.tenant_role_id
      join cfg.tenant_role_permissions trp on trp.tenant_role_id = tr.id
      join cfg.permissions p on p.id = trp.permission_id
      where utr.tenant_id = r.tenant_id
        and p.key in ('workorder.assign', 'tenant.admin')
    loop
      perform app.enqueue_in_app_notification(
        r.tenant_id,
        v_uid,
        'pm.overdue',
        'PM schedule overdue',
        coalesce(r.title, 'PM schedule'),
        pg_catalog.jsonb_build_object('pm_schedule_id', r.id, 'asset_id', r.asset_id),
        'pm_schedule',
        r.id,
        'pm_od:' || r.id::text || ':' || pg_catalog.date_trunc('hour', pg_catalog.now())::text
      );
    end loop;
  end loop;
end;
$$;

comment on function public.rpc_process_due_notifications() is
  'Marks SLA breaches, notifies coordinators, and signals PM overdue (hourly dedupe). Intended for pg_cron.';

revoke all on function public.rpc_process_due_notifications() from public;
grant execute on function public.rpc_process_due_notifications() to postgres;

do $cron$
declare
  jid bigint;
begin
  for jid in
    select j.jobid
    from cron.job j
    where j.jobname in ('process_due_notifications', 'cmms_notification_tick')
  loop
    perform cron.unschedule(jid);
  end loop;
end
$cron$;

select cron.schedule(
  'process_due_notifications',
  '*/5 * * * *',
  $$select public.rpc_process_due_notifications()$$
);

-- ============================================================================
-- 7. Public RPCs: inbox + preferences
-- ============================================================================

create or replace function public.rpc_list_my_notifications(
  p_tenant_id uuid,
  p_limit integer default 50
)
returns setof app.notifications
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform authz.rpc_setup(p_tenant_id, 'notification.read');

  return query
  select n.*
  from app.notifications n
  where n.tenant_id = p_tenant_id
    and n.recipient_user_id = auth.uid()
  order by n.created_at desc
  limit least(coalesce(p_limit, 50), 200);
end;
$$;

revoke all on function public.rpc_list_my_notifications(uuid, integer) from public;
grant execute on function public.rpc_list_my_notifications(uuid, integer) to authenticated;

create or replace function public.rpc_mark_notifications_read(
  p_tenant_id uuid,
  p_notification_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform authz.rpc_setup(p_tenant_id, 'notification.read');

  update app.notifications
  set read_at = pg_catalog.now()
  where tenant_id = p_tenant_id
    and recipient_user_id = auth.uid()
    and id = any(p_notification_ids);
end;
$$;

revoke all on function public.rpc_mark_notifications_read(uuid, uuid[]) from public;
grant execute on function public.rpc_mark_notifications_read(uuid, uuid[]) to authenticated;

create or replace function public.rpc_upsert_notification_preference(
  p_tenant_id uuid,
  p_event_key text,
  p_channel_in_app boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  perform authz.rpc_setup(p_tenant_id, 'notification.preference.manage');

  insert into app.notification_preferences (
    tenant_id, user_id, event_key, channel_in_app
  )
  values (p_tenant_id, v_uid, trim(p_event_key), p_channel_in_app)
  on conflict (tenant_id, user_id, event_key)
  do update set
    channel_in_app = excluded.channel_in_app,
    updated_at = pg_catalog.now();
end;
$$;

revoke all on function public.rpc_upsert_notification_preference(uuid, text, boolean) from public;
grant execute on function public.rpc_upsert_notification_preference(uuid, text, boolean) to authenticated;

create or replace view public.v_my_notifications
with (security_invoker = true)
as
select
  n.id,
  n.tenant_id,
  n.event_key,
  n.title,
  n.body,
  n.payload,
  n.entity_type,
  n.entity_id,
  n.read_at,
  n.created_at
from app.notifications n
where n.tenant_id = authz.get_current_tenant_id()
  and n.recipient_user_id = auth.uid();

comment on view public.v_my_notifications is
  'Current user notifications for the active tenant.';

grant select on public.v_my_notifications to authenticated;
grant select on public.v_my_notifications to anon;
