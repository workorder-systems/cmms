-- SPDX-License-Identifier: AGPL-3.0-or-later
--
-- Purpose: Replace per-entity attachment tables with a single polymorphic
--   app.entity_attachments (tenant_id, entity_type, entity_id, file_id, ...).
--   Breaking change: Storage path is always tenant_id/entity_type/entity_id/filename
--   (storage.foldername yields exactly three segments before the filename).
--
-- Supported entity_type keys (extend app.entity_attachment_upload_allowed when adding domains):
--   work_order, asset, location, purchase_order, purchase_requisition, part, supplier,
--   incident, inspection_run, shift_handover
--
-- Affected: drops app.work_order_attachments, app.asset_attachments, app.location_attachments;
--   replaces storage trigger and storage.objects policies; recreates public attachment views;
--   replaces rpc_insert_work_order_attachment_object, rpc_register_work_order_attachment,
--   rpc_update_work_order_attachment_metadata; updates rpc_mobile_sync attachment payload;
--   audit trigger target becomes entity_attachments.

-- ============================================================================
-- 1. New table (before data move)
-- ============================================================================

create table app.entity_attachments (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  file_id uuid not null references app.files(id) on delete cascade,
  label text,
  kind text,
  document_type_key text,
  is_controlled boolean not null default false,
  effective_date date,
  revision_label text,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  created_by uuid references auth.users(id) on delete set null,
  constraint entity_attachments_entity_type_format_check check (
    entity_type ~ '^[a-z0-9_]+$' and length(entity_type) >= 1 and length(entity_type) <= 64
  ),
  constraint entity_attachments_label_length_check check (
    label is null or (length(label) >= 1 and length(label) <= 255)
  ),
  constraint entity_attachments_kind_format_check check (
    kind is null or (kind ~ '^[a-z0-9_]+$' and length(kind) >= 1 and length(kind) <= 50)
  ),
  constraint entity_attachments_unique_target_file unique (tenant_id, entity_type, entity_id, file_id)
);

comment on table app.entity_attachments is
  'Polymorphic links from app.files to domain rows. entity_type identifies the table (e.g. work_order, part); entity_id is the row pk. Upload path: attachments bucket name = tenant_id/entity_type/entity_id/filename.';

create index entity_attachments_tenant_entity_idx
  on app.entity_attachments (tenant_id, entity_type, entity_id);

create index entity_attachments_tenant_updated_idx
  on app.entity_attachments (tenant_id, updated_at desc);

create index entity_attachments_file_id_idx on app.entity_attachments (file_id);

create trigger entity_attachments_set_updated_at
  before update on app.entity_attachments
  for each row
  execute function util.set_updated_at();

-- ============================================================================
-- 2. Backfill from legacy tables (preserve ids where possible)
-- ============================================================================

insert into app.entity_attachments (
  id, tenant_id, entity_type, entity_id, file_id, label, kind,
  document_type_key, is_controlled, effective_date, revision_label,
  created_at, updated_at, created_by
)
select
  id,
  tenant_id,
  'work_order',
  work_order_id,
  file_id,
  label,
  kind,
  document_type_key,
  is_controlled,
  effective_date,
  revision_label,
  created_at,
  updated_at,
  created_by
from app.work_order_attachments;

insert into app.entity_attachments (
  id, tenant_id, entity_type, entity_id, file_id, label, kind,
  document_type_key, is_controlled, effective_date, revision_label,
  created_at, updated_at, created_by
)
select
  id,
  tenant_id,
  'asset',
  asset_id,
  file_id,
  label,
  kind,
  document_type_key,
  is_controlled,
  effective_date,
  revision_label,
  created_at,
  updated_at,
  created_by
from app.asset_attachments;

insert into app.entity_attachments (
  id, tenant_id, entity_type, entity_id, file_id, label, kind,
  document_type_key, is_controlled, effective_date, revision_label,
  created_at, updated_at, created_by
)
select
  id,
  tenant_id,
  'location',
  location_id,
  file_id,
  label,
  kind,
  document_type_key,
  is_controlled,
  effective_date,
  revision_label,
  created_at,
  updated_at,
  created_by
from app.location_attachments;

-- ============================================================================
-- 3. Drop dependents on legacy tables, then drop legacy tables
-- ============================================================================

drop trigger if exists work_order_attachments_audit_trigger on app.work_order_attachments;

drop view if exists public.v_work_order_attachments cascade;
drop view if exists public.v_asset_attachments cascade;
drop view if exists public.v_location_attachments cascade;
drop view if exists public.v_mobile_work_order_attachments cascade;

drop table app.work_order_attachments cascade;
drop table app.asset_attachments cascade;
drop table app.location_attachments cascade;

-- ============================================================================
-- 4. RLS on app.entity_attachments
-- ============================================================================

alter table app.entity_attachments enable row level security;
alter table app.entity_attachments force row level security;

create policy entity_attachments_select_auth on app.entity_attachments
  for select to authenticated
  using (authz.is_current_user_tenant_member(tenant_id));

create policy entity_attachments_select_anon on app.entity_attachments
  for select to anon
  using (authz.is_current_user_tenant_member(tenant_id));

create policy entity_attachments_insert_auth on app.entity_attachments
  for insert to authenticated
  with check (authz.is_current_user_tenant_member(tenant_id));

create policy entity_attachments_insert_anon on app.entity_attachments
  for insert to anon
  with check (false);

create policy entity_attachments_update_auth on app.entity_attachments
  for update to authenticated
  using (
    authz.is_current_user_tenant_member(tenant_id)
    and (
      created_by = auth.uid()
      or authz.is_admin_or_manager(auth.uid(), tenant_id)
    )
  )
  with check (authz.is_current_user_tenant_member(tenant_id));

create policy entity_attachments_update_anon on app.entity_attachments
  for update to anon
  using (false)
  with check (false);

create policy entity_attachments_delete_auth on app.entity_attachments
  for delete to authenticated
  using (
    authz.is_current_user_tenant_member(tenant_id)
    and (
      created_by = auth.uid()
      or authz.is_admin_or_manager(auth.uid(), tenant_id)
    )
  );

create policy entity_attachments_delete_anon on app.entity_attachments
  for delete to anon
  using (false);

comment on policy entity_attachments_select_auth on app.entity_attachments is
  'Tenant members can list attachment rows for their tenant.';
comment on policy entity_attachments_insert_auth on app.entity_attachments is
  'Authenticated members may insert (typically via Storage trigger as service/definer paths).';
comment on policy entity_attachments_update_auth on app.entity_attachments is
  'Uploader or admin/manager may update metadata.';
comment on policy entity_attachments_delete_auth on app.entity_attachments is
  'Uploader or admin/manager may delete attachment links.';

grant select on app.entity_attachments to authenticated, anon;
grant insert, update, delete on app.entity_attachments to authenticated;

-- ============================================================================
-- 5. Upload authorization (used by Storage RLS + insert trigger)
-- ============================================================================

create or replace function app.entity_attachment_upload_allowed(
  p_tenant_id uuid,
  p_entity_type text,
  p_entity_id uuid,
  p_actor uuid
) returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_row_tenant uuid;
  v_assigned uuid;
begin
  if p_actor is null or not authz.is_tenant_member(p_actor, p_tenant_id) then
    return false;
  end if;

  case lower(p_entity_type)
    when 'work_order' then
      select tenant_id, assigned_to into v_row_tenant, v_assigned
      from app.work_orders
      where id = p_entity_id;
      if not found or v_row_tenant <> p_tenant_id then
        return false;
      end if;
      if v_assigned is distinct from p_actor then
        return authz.has_permission(p_actor, p_tenant_id, 'workorder.edit');
      end if;
      return true;

    when 'asset' then
      select tenant_id into v_row_tenant from app.assets where id = p_entity_id;
      return found and v_row_tenant = p_tenant_id;

    when 'location' then
      select tenant_id into v_row_tenant from app.locations where id = p_entity_id;
      return found and v_row_tenant = p_tenant_id;

    when 'purchase_order' then
      select tenant_id into v_row_tenant from app.purchase_orders where id = p_entity_id;
      return found and v_row_tenant = p_tenant_id;

    when 'purchase_requisition' then
      select tenant_id into v_row_tenant from app.purchase_requisitions where id = p_entity_id;
      return found and v_row_tenant = p_tenant_id;

    when 'part' then
      select tenant_id into v_row_tenant from app.parts where id = p_entity_id;
      return found and v_row_tenant = p_tenant_id;

    when 'supplier' then
      select tenant_id into v_row_tenant from app.suppliers where id = p_entity_id;
      return found and v_row_tenant = p_tenant_id;

    when 'incident' then
      select tenant_id into v_row_tenant from app.incidents where id = p_entity_id;
      return found and v_row_tenant = p_tenant_id;

    when 'inspection_run' then
      select tenant_id into v_row_tenant from app.inspection_runs where id = p_entity_id;
      return found and v_row_tenant = p_tenant_id;

    when 'shift_handover' then
      return exists (
        select 1
        from app.shift_handovers h
        where h.id = p_entity_id
          and h.tenant_id = p_tenant_id
          and (h.from_user_id = p_actor or h.to_user_id = p_actor)
      );

    else
      return false;
  end case;
end;
$$;

comment on function app.entity_attachment_upload_allowed(uuid, text, uuid, uuid) is
  'True if p_actor may upload an object whose storage.foldername is tenant_id/entity_type/entity_id. Unknown entity_type returns false; extend this function when adding new attachable tables.';

revoke all on function app.entity_attachment_upload_allowed(uuid, text, uuid, uuid) from public;
grant execute on function app.entity_attachment_upload_allowed(uuid, text, uuid, uuid) to postgres;

create or replace function authz.attachment_storage_path_upload_permitted(
  p_object_name text,
  p_actor uuid
) returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  tok text[];
  tid uuid;
  etype text;
  eid uuid;
begin
  if p_actor is null then
    return false;
  end if;
  tok := storage.foldername(p_object_name);
  if array_length(tok, 1) is distinct from 3 then
    return false;
  end if;
  tid := tok[1]::uuid;
  etype := lower(tok[2]);
  eid := tok[3]::uuid;
  return app.entity_attachment_upload_allowed(tid, etype, eid, p_actor);
exception
  when invalid_text_representation then
    return false;
end;
$$;

comment on function authz.attachment_storage_path_upload_permitted(text, uuid) is
  'Used by storage.objects INSERT policy: foldername must be tenant_id/entity_type/entity_id (three segments before filename).';

revoke all on function authz.attachment_storage_path_upload_permitted(text, uuid) from public;
grant execute on function authz.attachment_storage_path_upload_permitted(text, uuid) to authenticated;
grant execute on function authz.attachment_storage_path_upload_permitted(text, uuid) to anon;

-- ============================================================================
-- 6. Storage trigger: unified path only
-- ============================================================================

create or replace function app.on_attachment_object_inserted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant_id uuid;
  v_entity_type text;
  v_entity_id uuid;
  v_file_id uuid;
  v_path_tokens text[];
  v_meta_type text;
  v_meta_id uuid;
  v_eff date;
  v_controlled boolean;
begin
  if new.bucket_id <> 'attachments' then
    return new;
  end if;

  v_path_tokens := storage.foldername(new.name);
  if array_length(v_path_tokens, 1) is distinct from 3 then
    raise exception using
      message = 'Attachment path must be tenant_id/entity_type/entity_id/filename (storage.foldername returns three segments before the filename)',
      errcode = 'P0001';
  end if;

  v_tenant_id := coalesce(
    (new.metadata->>'tenant_id')::uuid,
    (v_path_tokens[1])::uuid
  );
  v_entity_type := lower(trim(v_path_tokens[2]));
  v_entity_id := (v_path_tokens[3])::uuid;

  v_meta_type := nullif(trim(lower(coalesce(new.metadata->>'entity_type', ''))), '');
  v_meta_id := (new.metadata->>'entity_id')::uuid;
  if v_meta_type is not null and v_meta_id is not null then
    if v_meta_type <> v_entity_type or v_meta_id <> v_entity_id then
      raise exception using
        message = 'metadata entity_type/entity_id must match path segments',
        errcode = 'P0001';
    end if;
  end if;

  if not app.entity_attachment_upload_allowed(
    v_tenant_id,
    v_entity_type,
    v_entity_id,
    (new.owner_id)::uuid
  ) then
    raise exception using
      message = 'Upload not permitted for this entity or tenant',
      errcode = '42501';
  end if;

  begin
    v_eff := (new.metadata->>'effective_date')::date;
  exception
    when others then
      v_eff := null;
  end;

  if new.metadata ? 'is_controlled' then
    v_controlled := (new.metadata->>'is_controlled')::boolean;
  else
    v_controlled := false;
  end if;

  insert into app.files (
    id, tenant_id, bucket_id, storage_path, filename, content_type, byte_size, created_at
  )
  values (
    extensions.gen_random_uuid(),
    v_tenant_id,
    new.bucket_id,
    new.name,
    storage.filename(new.name),
    new.metadata->>'content_type',
    (new.metadata->>'byte_size')::bigint,
    pg_catalog.now()
  )
  returning id into v_file_id;

  insert into app.entity_attachments (
    tenant_id,
    entity_type,
    entity_id,
    file_id,
    label,
    kind,
    document_type_key,
    is_controlled,
    effective_date,
    revision_label,
    created_by
  )
  values (
    v_tenant_id,
    v_entity_type,
    v_entity_id,
    v_file_id,
    nullif(new.metadata->>'label', ''),
    case
      when new.metadata->>'kind' is not null and new.metadata->>'kind' <> ''
      then new.metadata->>'kind'
      else null
    end,
    nullif(new.metadata->>'document_type_key', ''),
    coalesce(v_controlled, false),
    v_eff,
    nullif(new.metadata->>'revision_label', ''),
    (new.owner_id)::uuid
  );

  return new;
end;
$$;

comment on function app.on_attachment_object_inserted() is
  'After insert on storage.objects for bucket attachments: requires foldername = tenant_id/entity_type/entity_id; creates app.files and app.entity_attachments.';

-- ============================================================================
-- 7. storage.objects policies (attachments bucket)
-- ============================================================================

drop policy if exists attachments_select_authenticated on storage.objects;
drop policy if exists attachments_select_anon on storage.objects;
drop policy if exists attachments_insert_authenticated on storage.objects;
drop policy if exists attachments_insert_anon on storage.objects;
drop policy if exists attachments_update_authenticated on storage.objects;
drop policy if exists attachments_update_anon on storage.objects;
drop policy if exists attachments_delete_authenticated on storage.objects;
drop policy if exists attachments_delete_anon on storage.objects;

create policy attachments_select_authenticated on storage.objects for select to authenticated
  using (
    bucket_id = 'attachments'
    and exists (
      select 1
      from app.files f
      join app.entity_attachments ea on ea.file_id = f.id
      where f.bucket_id = storage.objects.bucket_id
        and f.storage_path = storage.objects.name
        and (select authz.is_current_user_tenant_member(ea.tenant_id))
    )
  );

create policy attachments_select_anon on storage.objects for select to anon
  using (
    bucket_id = 'attachments'
    and exists (
      select 1
      from app.files f
      join app.entity_attachments ea on ea.file_id = f.id
      where f.bucket_id = storage.objects.bucket_id
        and f.storage_path = storage.objects.name
        and (select authz.is_current_user_tenant_member(ea.tenant_id))
    )
  );

create policy attachments_insert_authenticated on storage.objects for insert to authenticated
  with check (
    bucket_id = 'attachments'
    and (
      owner_id is not null
      or auth.uid() is not null
      or (coalesce(auth.jwt(), '{}'::jsonb)->>'sub') is not null
    )
    and authz.attachment_storage_path_upload_permitted(
      name,
      coalesce(
        owner_id::uuid,
        auth.uid(),
        (coalesce(auth.jwt(), '{}'::jsonb)->>'sub')::uuid
      )
    )
  );

create policy attachments_insert_anon on storage.objects for insert to anon
  with check (false);

create policy attachments_update_authenticated on storage.objects for update to authenticated
  using (
    bucket_id = 'attachments'
    and exists (
      select 1
      from app.files f
      join app.entity_attachments ea on ea.file_id = f.id
      where f.bucket_id = storage.objects.bucket_id
        and f.storage_path = storage.objects.name
        and (select authz.is_current_user_tenant_member(ea.tenant_id))
        and (
          ea.created_by = auth.uid()
          or (select authz.is_admin_or_manager(auth.uid(), ea.tenant_id))
        )
    )
  )
  with check (
    bucket_id = 'attachments'
    and exists (
      select 1
      from app.files f
      join app.entity_attachments ea on ea.file_id = f.id
      where f.bucket_id = storage.objects.bucket_id
        and f.storage_path = storage.objects.name
        and (select authz.is_current_user_tenant_member(ea.tenant_id))
        and (
          ea.created_by = auth.uid()
          or (select authz.is_admin_or_manager(auth.uid(), ea.tenant_id))
        )
    )
  );

create policy attachments_update_anon on storage.objects for update to anon
  using (false) with check (false);

create policy attachments_delete_authenticated on storage.objects for delete to authenticated
  using (
    bucket_id = 'attachments'
    and exists (
      select 1
      from app.files f
      join app.entity_attachments ea on ea.file_id = f.id
      where f.bucket_id = storage.objects.bucket_id
        and f.storage_path = storage.objects.name
        and (select authz.is_current_user_tenant_member(ea.tenant_id))
        and (
          ea.created_by = auth.uid()
          or (select authz.is_admin_or_manager(auth.uid(), ea.tenant_id))
        )
    )
  );

create policy attachments_delete_anon on storage.objects for delete to anon using (false);

-- ============================================================================
-- 8. Public views
-- ============================================================================

create or replace view public.v_entity_attachments
with (security_invoker = true)
as
select
  ea.id,
  ea.tenant_id,
  ea.entity_type,
  ea.entity_id,
  ea.file_id,
  f.bucket_id,
  f.storage_path,
  f.filename,
  f.content_type,
  ea.label,
  ea.kind,
  ea.document_type_key,
  ea.is_controlled,
  ea.effective_date,
  ea.revision_label,
  ea.created_by,
  p_created_by.full_name as created_by_name,
  ea.created_at,
  ea.updated_at
from app.entity_attachments ea
left join app.files f on f.id = ea.file_id
left join app.profiles p_created_by
  on p_created_by.user_id = ea.created_by and p_created_by.tenant_id = ea.tenant_id
where ea.tenant_id = authz.get_current_tenant_id()
order by ea.created_at desc;

comment on view public.v_entity_attachments is
  'All file attachments in the current tenant context. Filter by entity_type/entity_id in the client or use typed convenience views.';

grant select on public.v_entity_attachments to authenticated, anon;

create or replace view public.v_work_order_attachments
with (security_invoker = true)
as
select
  ea.id,
  ea.tenant_id,
  ea.entity_id as work_order_id,
  ea.file_id,
  f.bucket_id,
  f.storage_path,
  f.filename,
  f.content_type,
  ea.label,
  ea.kind,
  ea.document_type_key,
  ea.is_controlled,
  ea.effective_date,
  ea.revision_label,
  ea.created_by,
  p_created_by.full_name as created_by_name,
  ea.created_at,
  ea.updated_at
from app.entity_attachments ea
left join app.files f on f.id = ea.file_id
left join app.profiles p_created_by
  on p_created_by.user_id = ea.created_by and p_created_by.tenant_id = ea.tenant_id
where ea.tenant_id = authz.get_current_tenant_id()
  and ea.entity_type = 'work_order'
order by ea.created_at desc;

grant select, update, delete on public.v_work_order_attachments to authenticated;
grant select on public.v_work_order_attachments to anon;

create or replace view public.v_asset_attachments
with (security_invoker = true)
as
select
  ea.id,
  ea.tenant_id,
  ea.entity_id as asset_id,
  ea.file_id,
  f.bucket_id,
  f.storage_path,
  f.filename,
  f.content_type,
  ea.label,
  ea.kind,
  ea.document_type_key,
  ea.is_controlled,
  ea.effective_date,
  ea.revision_label,
  ea.created_by,
  p_created_by.full_name as created_by_name,
  ea.created_at,
  ea.updated_at
from app.entity_attachments ea
left join app.files f on f.id = ea.file_id
left join app.profiles p_created_by
  on p_created_by.user_id = ea.created_by and p_created_by.tenant_id = ea.tenant_id
where ea.tenant_id = authz.get_current_tenant_id()
  and ea.entity_type = 'asset'
order by ea.created_at desc;

grant select on public.v_asset_attachments to authenticated, anon;

create or replace view public.v_location_attachments
with (security_invoker = true)
as
select
  ea.id,
  ea.tenant_id,
  ea.entity_id as location_id,
  ea.file_id,
  f.bucket_id,
  f.storage_path,
  f.filename,
  f.content_type,
  ea.label,
  ea.kind,
  ea.document_type_key,
  ea.is_controlled,
  ea.effective_date,
  ea.revision_label,
  ea.created_by,
  p_created_by.full_name as created_by_name,
  ea.created_at,
  ea.updated_at
from app.entity_attachments ea
left join app.files f on f.id = ea.file_id
left join app.profiles p_created_by
  on p_created_by.user_id = ea.created_by and p_created_by.tenant_id = ea.tenant_id
where ea.tenant_id = authz.get_current_tenant_id()
  and ea.entity_type = 'location'
order by ea.created_at desc;

grant select on public.v_location_attachments to authenticated, anon;

create or replace view public.v_mobile_work_order_attachments
with (security_invoker = true)
as
select
  ea.id,
  ea.tenant_id,
  ea.entity_id as work_order_id,
  ea.file_id,
  ea.label,
  ea.kind,
  ea.created_at,
  ea.updated_at
from app.entity_attachments ea
where ea.tenant_id = authz.get_current_tenant_id()
  and ea.entity_type = 'work_order';

comment on view public.v_mobile_work_order_attachments is
  'Minimal work order attachment metadata for mobile sync (entity_attachments where entity_type = work_order).';

grant select on public.v_mobile_work_order_attachments to authenticated, anon;

-- ============================================================================
-- 9. INSTEAD OF triggers (work order attachments view)
-- ============================================================================

create or replace function public.handle_v_work_order_attachments_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update app.entity_attachments
  set
    entity_id = new.work_order_id,
    file_id = new.file_id,
    label = new.label,
    kind = new.kind,
    document_type_key = new.document_type_key,
    is_controlled = new.is_controlled,
    effective_date = new.effective_date,
    revision_label = new.revision_label,
    created_by = new.created_by,
    updated_at = pg_catalog.now()
  where id = old.id
    and entity_type = 'work_order';

  return new;
end;
$$;

create or replace function public.handle_v_work_order_attachments_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from app.entity_attachments
  where id = old.id
    and entity_type = 'work_order';

  return old;
end;
$$;

drop trigger if exists v_work_order_attachments_instead_of_update on public.v_work_order_attachments;
drop trigger if exists v_work_order_attachments_instead_of_delete on public.v_work_order_attachments;

create trigger v_work_order_attachments_instead_of_update
  instead of update on public.v_work_order_attachments
  for each row
  execute function public.handle_v_work_order_attachments_update();

create trigger v_work_order_attachments_instead_of_delete
  instead of delete on public.v_work_order_attachments
  for each row
  execute function public.handle_v_work_order_attachments_delete();

revoke all on function public.handle_v_work_order_attachments_update() from public;
grant execute on function public.handle_v_work_order_attachments_update() to authenticated;
revoke all on function public.handle_v_work_order_attachments_delete() from public;
grant execute on function public.handle_v_work_order_attachments_delete() to authenticated;

-- ============================================================================
-- 10. Audit trigger on unified table
-- ============================================================================

create trigger entity_attachments_audit_trigger
  after insert or update or delete on app.entity_attachments
  for each row execute function audit.log_entity_change();

-- ============================================================================
-- 11. RPC: Storage insert fallback (replaces rpc_insert_work_order_attachment_object)
-- ============================================================================

drop function if exists public.rpc_insert_work_order_attachment_object(uuid, uuid, text, uuid, jsonb);

do $grant_storage$
begin
  execute format('grant insert on storage.objects to %I', current_user);
exception
  when insufficient_privilege or undefined_object then
    null;
end
$grant_storage$;

create or replace function public.rpc_insert_attachment_storage_object(
  p_tenant_id uuid,
  p_entity_type text,
  p_entity_id uuid,
  p_name text,
  p_owner_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  tok text[];
  v_type text;
begin
  if auth.uid() is distinct from p_owner_id then
    raise exception using message = 'Caller must pass their own user id as owner', errcode = '42501';
  end if;

  tok := storage.foldername(p_name);
  if array_length(tok, 1) is distinct from 3
     or (tok[1])::uuid <> p_tenant_id
     or lower(tok[2]) <> lower(trim(p_entity_type))
     or (tok[3])::uuid <> p_entity_id
  then
    raise exception using
      message = 'Attachment path must be tenant_id/entity_type/entity_id/filename and match parameters',
      errcode = 'P0001';
  end if;

  v_type := lower(trim(p_entity_type));
  if not app.entity_attachment_upload_allowed(p_tenant_id, v_type, p_entity_id, p_owner_id) then
    raise exception using message = 'Upload not permitted for this entity', errcode = '42501';
  end if;

  insert into storage.objects (bucket_id, name, owner_id, metadata)
  values ('attachments', p_name, p_owner_id::text, coalesce(p_metadata, '{}'::jsonb));
end;
$$;

comment on function public.rpc_insert_attachment_storage_object(uuid, text, uuid, text, uuid, jsonb) is
  'SECURITY DEFINER insert into storage.objects for tests or clients where Storage RLS blocks upload. Path must match p_tenant_id/p_entity_type/p_entity_id.';

revoke all on function public.rpc_insert_attachment_storage_object(uuid, text, uuid, text, uuid, jsonb) from public;
grant execute on function public.rpc_insert_attachment_storage_object(uuid, text, uuid, text, uuid, jsonb) to authenticated;

-- ============================================================================
-- 12. RPC: register existing file + update metadata
-- ============================================================================

drop function if exists public.rpc_register_work_order_attachment(uuid, uuid, uuid, text, text);

create or replace function public.rpc_register_entity_attachment(
  p_tenant_id uuid,
  p_entity_type text,
  p_entity_id uuid,
  p_file_id uuid,
  p_label text default null,
  p_kind text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_attachment_id uuid;
  v_file_tenant_id uuid;
  v_et text;
begin
  perform util.check_rate_limit('attachment_create', null, 20, 1, auth.uid(), p_tenant_id);

  v_user_id := authz.rpc_setup(p_tenant_id);
  v_et := lower(trim(p_entity_type));

  if not app.entity_attachment_upload_allowed(p_tenant_id, v_et, p_entity_id, v_user_id) then
    raise exception using message = 'Cannot attach file to this entity', errcode = '42501';
  end if;

  select tenant_id into v_file_tenant_id
  from app.files
  where id = p_file_id;

  if not found or v_file_tenant_id <> p_tenant_id then
    raise exception using
      message = format('File %s not found or does not belong to tenant', p_file_id),
      errcode = 'P0001';
  end if;

  insert into app.entity_attachments (
    tenant_id, entity_type, entity_id, file_id, label, kind, created_by
  )
  values (
    p_tenant_id,
    v_et,
    p_entity_id,
    p_file_id,
    p_label,
    p_kind,
    v_user_id
  )
  returning id into v_attachment_id;

  return v_attachment_id;
end;
$$;

comment on function public.rpc_register_entity_attachment(uuid, text, uuid, uuid, text, text) is
  'Links an existing app.files row to any supported entity_type. Enforces the same rules as Storage upload.';

revoke all on function public.rpc_register_entity_attachment(uuid, text, uuid, uuid, text, text) from public;
grant execute on function public.rpc_register_entity_attachment(uuid, text, uuid, uuid, text, text) to authenticated;

drop function if exists public.rpc_update_work_order_attachment_metadata(uuid, text, text);

create or replace function public.rpc_update_entity_attachment_metadata(
  p_attachment_id uuid,
  p_label text default null,
  p_kind text default null,
  p_document_type_key text default null,
  p_is_controlled boolean default null,
  p_effective_date date default null,
  p_revision_label text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant_id uuid;
begin
  select tenant_id into v_tenant_id
  from app.entity_attachments
  where id = p_attachment_id;

  if not found then
    raise exception using
      message = format('Attachment %s not found', p_attachment_id),
      errcode = 'P0001';
  end if;

  if not (select authz.is_current_user_tenant_member(v_tenant_id)) then
    raise exception using message = 'User is not a member of the tenant', errcode = 'P0001';
  end if;

  update app.entity_attachments
  set
    label = coalesce(p_label, label),
    kind = coalesce(p_kind, kind),
    document_type_key = coalesce(p_document_type_key, document_type_key),
    is_controlled = coalesce(p_is_controlled, is_controlled),
    effective_date = coalesce(p_effective_date, effective_date),
    revision_label = coalesce(p_revision_label, revision_label),
    updated_at = pg_catalog.now()
  where id = p_attachment_id
    and (
      created_by = auth.uid()
      or (select authz.is_admin_or_manager(auth.uid(), v_tenant_id))
    );

  if not found then
    raise exception using
      message = 'Attachment not found or user cannot update it',
      errcode = 'P0001';
  end if;
end;
$$;

comment on function public.rpc_update_entity_attachment_metadata(uuid, text, text, text, boolean, date, text) is
  'Updates attachment metadata (nullable args leave existing values unchanged).';

revoke all on function public.rpc_update_entity_attachment_metadata(uuid, text, text, text, boolean, date, text) from public;
grant execute on function public.rpc_update_entity_attachment_metadata(uuid, text, text, text, boolean, date, text) to authenticated;

-- ============================================================================
-- 13. Mobile sync JSON: attachments from entity_attachments
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
        select ea.id, ea.tenant_id, ea.entity_id as work_order_id, ea.file_id, ea.label, ea.kind,
               ea.created_at, ea.updated_at
        from app.entity_attachments ea
        where ea.tenant_id = p_tenant_id
          and ea.entity_type = 'work_order'
          and (p_updated_after is null or ea.updated_at > p_updated_after)
        order by ea.updated_at asc
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
  'Incremental mobile sync payload; attachments are work_order rows from app.entity_attachments.';

revoke all on function public.rpc_mobile_sync(uuid, timestamptz, int, uuid) from public;
grant execute on function public.rpc_mobile_sync(uuid, timestamptz, int, uuid) to authenticated;

-- ============================================================================
-- 14. Comment on app.files (terminology)
-- ============================================================================

comment on table app.files is
  'Metadata for objects in Supabase Storage. Linked from app.entity_attachments via file_id.';
