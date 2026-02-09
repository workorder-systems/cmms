-- =============================================================================
-- Migration: File attachments (app.files, storage, view, RPC)
-- =============================================================================
-- Purpose: Secure work order attachments with app.files as single source of
--          truth. Client uploads to Storage with path tenant_id/work_order_id/...;
--          trigger creates app.files and app.work_order_attachments. RLS on
--          storage.objects; view exposes bucket_id/storage_path for signed URLs.
-- Affected: app.files (new), app.work_order_attachments (file_id, drop file_ref),
--          storage.buckets, storage.objects (trigger + RLS), v_work_order_attachments,
--          rpc_add_work_order_attachment (dropped), rpc_update_work_order_attachment_metadata (new).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. app.files: single source of truth for all CMMS files
-- -----------------------------------------------------------------------------

create table app.files (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  bucket_id text not null,
  storage_path text not null,
  filename text,
  content_type text,
  byte_size bigint,
  created_at timestamptz not null default pg_catalog.now(),
  constraint files_bucket_id_length_check check (length(bucket_id) >= 1 and length(bucket_id) <= 255),
  constraint files_storage_path_length_check check (length(storage_path) >= 1 and length(storage_path) <= 1024)
);

comment on table app.files is
  'Single source of truth for all files in the CMMS. Stores metadata for objects in Supabase Storage. Referenced by work_order_attachments (and future asset/location attachments) via file_id.';

comment on column app.files.id is
  'Primary key. Used as reference from work_order_attachments and other attachment tables.';
comment on column app.files.tenant_id is
  'Tenant that owns the file. Enables tenant-scoped RLS and path conventions.';
comment on column app.files.bucket_id is
  'Supabase Storage bucket id (e.g. attachments).';
comment on column app.files.storage_path is
  'Object path/name within the bucket. Used with bucket_id for createSignedUrl and RLS on storage.objects.';
comment on column app.files.filename is
  'Original or display filename. Optional; can be derived from storage_path.';
comment on column app.files.content_type is
  'MIME type of the file. Optional.';
comment on column app.files.byte_size is
  'File size in bytes. Optional.';
comment on column app.files.created_at is
  'When the file record was created (e.g. by trigger on storage.objects insert).';

create index files_tenant_id_idx on app.files (tenant_id);
create index files_bucket_storage_path_idx on app.files (bucket_id, storage_path);
create unique index files_bucket_storage_path_tenant_uniq on app.files (tenant_id, bucket_id, storage_path);

alter table app.files enable row level security;
alter table app.files force row level security;

create policy files_select_tenant on app.files for select to authenticated
  using (authz.is_current_user_tenant_member(tenant_id));
create policy files_select_anon on app.files for select to anon
  using (authz.is_current_user_tenant_member(tenant_id));
create policy files_insert_tenant on app.files for insert to authenticated
  with check (authz.is_current_user_tenant_member(tenant_id));
create policy files_insert_anon on app.files for insert to anon with check (false);
create policy files_update_tenant on app.files for update to authenticated
  using (authz.is_current_user_tenant_member(tenant_id))
  with check (authz.is_current_user_tenant_member(tenant_id));
create policy files_update_anon on app.files for update to anon using (false) with check (false);
create policy files_delete_tenant on app.files for delete to authenticated
  using (authz.is_current_user_tenant_member(tenant_id));
create policy files_delete_anon on app.files for delete to anon using (false);

comment on policy files_select_tenant on app.files is
  'Allows authenticated users to view files in tenants they are members of.';
comment on policy files_select_anon on app.files is
  'Allows anonymous to view files only when tenant context permits (e.g. via tenant membership).';
comment on policy files_insert_tenant on app.files is
  'Allows authenticated users to create file records in tenants they are members of (e.g. via trigger).';
comment on policy files_insert_anon on app.files is
  'Anonymous cannot insert file records.';
comment on policy files_update_tenant on app.files is
  'Allows authenticated users to update files in tenants they are members of.';
comment on policy files_update_anon on app.files is
  'Anonymous cannot update files.';
comment on policy files_delete_tenant on app.files is
  'Allows authenticated users to delete files in tenants they are members of.';
comment on policy files_delete_anon on app.files is
  'Anonymous cannot delete files.';

grant select on app.files to authenticated;
grant select on app.files to anon;
grant insert on app.files to authenticated;
grant update on app.files to authenticated;
grant delete on app.files to authenticated;

-- -----------------------------------------------------------------------------
-- 2. app.work_order_attachments: add file_id -> app.files (drop file_ref after view update)
-- -----------------------------------------------------------------------------

alter table app.work_order_attachments
  add column file_id uuid references app.files(id) on delete cascade;

comment on column app.work_order_attachments.file_id is
  'Reference to the file in app.files (single source of truth for CMMS files).';

create index work_order_attachments_file_id_idx on app.work_order_attachments (file_id);

-- -----------------------------------------------------------------------------
-- 3. Storage bucket "attachments" and trigger on storage.objects
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do update set public = excluded.public;

create or replace function app.on_attachment_object_inserted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant_id uuid;
  v_work_order_id uuid;
  v_file_id uuid;
  v_work_order_tenant_id uuid;
  v_work_order_assigned_to uuid;
  v_path_tokens text[];
begin
  if new.bucket_id <> 'attachments' then
    return new;
  end if;

  v_path_tokens := storage.foldername(new.name);
  v_tenant_id := coalesce(
    (new.metadata->>'tenant_id')::uuid,
    (v_path_tokens[1])::uuid
  );
  v_work_order_id := coalesce(
    (new.metadata->>'work_order_id')::uuid,
    (v_path_tokens[2])::uuid
  );

  if v_tenant_id is null or v_work_order_id is null then
    raise exception using
      message = 'Attachment path or metadata must include tenant_id and work_order_id (e.g. path: tenant_id/work_order_id/filename)',
      errcode = 'P0001';
  end if;

  select wo.tenant_id, wo.assigned_to
  into v_work_order_tenant_id, v_work_order_assigned_to
  from app.work_orders wo
  where wo.id = v_work_order_id;

  if not found or v_work_order_tenant_id <> v_tenant_id then
    raise exception using
      message = format('Work order %s not found or does not belong to tenant', v_work_order_id),
      errcode = 'P0001';
  end if;

  if not authz.is_tenant_member((new.owner_id)::uuid, v_tenant_id) then
    raise exception using
      message = 'Uploader is not a member of the tenant',
      errcode = 'P0001';
  end if;
  if v_work_order_assigned_to is distinct from (new.owner_id)::uuid then
    perform authz.validate_permission((new.owner_id)::uuid, v_tenant_id, 'workorder.edit');
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

  insert into app.work_order_attachments (
    tenant_id, work_order_id, file_id, label, kind, created_by
  )
  values (
    v_tenant_id,
    v_work_order_id,
    v_file_id,
    new.metadata->>'label',
    case
      when new.metadata->>'kind' <> '' and new.metadata->>'kind' is not null
      then new.metadata->>'kind'
      else null
    end,
    (new.owner_id)::uuid
  );

  return new;
end;
$$;

comment on function app.on_attachment_object_inserted() is
  'Trigger: after insert on storage.objects for bucket attachments. Creates app.files then app.work_order_attachments. Parses tenant_id and work_order_id from path or metadata. Validates uploader can attach to work order.';

revoke all on function app.on_attachment_object_inserted() from public;
grant execute on function app.on_attachment_object_inserted() to authenticated;
grant execute on function app.on_attachment_object_inserted() to service_role;

create trigger on_attachment_object_inserted
  after insert on storage.objects
  for each row
  when (new.bucket_id = 'attachments')
  execute function app.on_attachment_object_inserted();

-- -----------------------------------------------------------------------------
-- 4. RLS policies on storage.objects for attachments bucket
-- -----------------------------------------------------------------------------
-- RLS is already enabled on storage.objects by Supabase; we only add policies.
-- These control who can SELECT (signed URLs), INSERT (upload), UPDATE, DELETE.

create policy attachments_select_authenticated on storage.objects for select to authenticated
  using (
    bucket_id = 'attachments'
    and exists (
      select 1
      from app.files f
      join app.work_order_attachments woa on woa.file_id = f.id
      join app.work_orders wo on wo.id = woa.work_order_id
      where f.bucket_id = storage.objects.bucket_id
        and f.storage_path = storage.objects.name
        and (select authz.is_current_user_tenant_member(wo.tenant_id))
    )
  );

create policy attachments_select_anon on storage.objects for select to anon
  using (
    bucket_id = 'attachments'
    and exists (
      select 1
      from app.files f
      join app.work_order_attachments woa on woa.file_id = f.id
      join app.work_orders wo on wo.id = woa.work_order_id
      where f.bucket_id = storage.objects.bucket_id
        and f.storage_path = storage.objects.name
        and (select authz.is_current_user_tenant_member(wo.tenant_id))
    )
  );

create policy attachments_insert_authenticated on storage.objects for insert to authenticated
  with check (
    bucket_id = 'attachments'
    and (select authz.is_current_user_tenant_member((storage.foldername(name))[1]::uuid))
    and exists (
      select 1
      from app.work_orders wo
      where wo.id = (storage.foldername(name))[2]::uuid
        and wo.tenant_id = (storage.foldername(name))[1]::uuid
        and (
          wo.assigned_to = auth.uid()
          or (select authz.has_permission(auth.uid(), wo.tenant_id, 'workorder.edit'))
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
      join app.work_order_attachments woa on woa.file_id = f.id
      where f.bucket_id = storage.objects.bucket_id
        and f.storage_path = storage.objects.name
        and (select authz.is_current_user_tenant_member(woa.tenant_id))
        and (
          woa.created_by = auth.uid()
          or (select authz.is_admin_or_manager(auth.uid(), woa.tenant_id))
        )
    )
  )
  with check (
    bucket_id = 'attachments'
    and exists (
      select 1
      from app.files f
      join app.work_order_attachments woa on woa.file_id = f.id
      where f.bucket_id = storage.objects.bucket_id
        and f.storage_path = storage.objects.name
        and (select authz.is_current_user_tenant_member(woa.tenant_id))
        and (
          woa.created_by = auth.uid()
          or (select authz.is_admin_or_manager(auth.uid(), woa.tenant_id))
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
      join app.work_order_attachments woa on woa.file_id = f.id
      where f.bucket_id = storage.objects.bucket_id
        and f.storage_path = storage.objects.name
        and (select authz.is_current_user_tenant_member(woa.tenant_id))
        and (
          woa.created_by = auth.uid()
          or (select authz.is_admin_or_manager(auth.uid(), woa.tenant_id))
        )
    )
  );

create policy attachments_delete_anon on storage.objects for delete to anon using (false);

-- Policy comments on storage.objects are omitted: migration role is not owner of storage.objects.

-- -----------------------------------------------------------------------------
-- 5. v_work_order_attachments: join app.files, expose bucket_id/storage_path
-- -----------------------------------------------------------------------------
-- Column set changes (file_ref -> file_id, plus bucket_id, storage_path, etc.),
-- so we must drop the view and recreate it; CREATE OR REPLACE cannot rename columns.

drop view if exists public.v_work_order_attachments cascade;

create view public.v_work_order_attachments
with (security_invoker = true)
as
select
  woa.id,
  woa.tenant_id,
  woa.work_order_id,
  woa.file_id,
  f.bucket_id,
  f.storage_path,
  f.filename,
  f.content_type,
  woa.label,
  woa.kind,
  woa.created_by,
  p_created_by.full_name as created_by_name,
  woa.created_at,
  woa.updated_at
from app.work_order_attachments woa
left join app.files f on f.id = woa.file_id
left join app.profiles p_created_by on p_created_by.user_id = woa.created_by and p_created_by.tenant_id = woa.tenant_id
where woa.tenant_id = authz.get_current_tenant_id()
order by woa.created_at desc;

comment on view public.v_work_order_attachments is
  'Work order attachments view scoped to the current tenant context. Joins app.files for bucket_id and storage_path (for createSignedUrl). Uses SECURITY INVOKER to enforce RLS. Clients must set tenant context via rpc_set_tenant_context. Ordered by created_at desc.';

grant select on public.v_work_order_attachments to authenticated;
grant select on public.v_work_order_attachments to anon;
grant update on public.v_work_order_attachments to authenticated;
grant delete on public.v_work_order_attachments to authenticated;

create or replace function public.handle_v_work_order_attachments_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update app.work_order_attachments
  set
    work_order_id = new.work_order_id,
    file_id = new.file_id,
    label = new.label,
    kind = new.kind,
    created_by = new.created_by,
    updated_at = pg_catalog.now()
  where id = old.id;

  return new;
end;
$$;

comment on function public.handle_v_work_order_attachments_update() is
  'INSTEAD OF trigger for v_work_order_attachments UPDATE. Routes updates to app.work_order_attachments (file_id, label, kind, etc.); ignores joined bucket_id, storage_path, created_by_name.';

create trigger v_work_order_attachments_instead_of_update
  instead of update on public.v_work_order_attachments
  for each row
  execute function public.handle_v_work_order_attachments_update();

create trigger v_work_order_attachments_instead_of_delete
  instead of delete on public.v_work_order_attachments
  for each row
  execute function public.handle_v_work_order_attachments_delete();

-- Drop file_ref only after view no longer depends on it
alter table app.work_order_attachments
  drop constraint if exists work_order_attachments_file_ref_length_check;
alter table app.work_order_attachments
  drop column file_ref;

-- -----------------------------------------------------------------------------
-- 6. RPC: drop rpc_add_work_order_attachment, add rpc_update_work_order_attachment_metadata
-- -----------------------------------------------------------------------------

drop function if exists public.rpc_add_work_order_attachment(uuid, uuid, text, text, text);

create or replace function public.rpc_update_work_order_attachment_metadata(
  p_attachment_id uuid,
  p_label text default null,
  p_kind text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant_id uuid;
begin
  select woa.tenant_id into v_tenant_id
  from app.work_order_attachments woa
  where woa.id = p_attachment_id;

  if not found then
    raise exception using
      message = format('Attachment %s not found', p_attachment_id),
      errcode = 'P0001';
  end if;

  if not (select authz.is_current_user_tenant_member(v_tenant_id)) then
    raise exception using
      message = 'User is not a member of the tenant',
      errcode = 'P0001';
  end if;

  update app.work_order_attachments
  set
    label = coalesce(p_label, label),
    kind = coalesce(p_kind, kind),
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

comment on function public.rpc_update_work_order_attachment_metadata(uuid, text, text) is
  'Updates label and kind for a work order attachment. User must be tenant member and (attachment creator or admin/manager). Create is via storage upload + trigger; use this to set label/kind after upload.';

revoke all on function public.rpc_update_work_order_attachment_metadata(uuid, text, text) from public;
grant execute on function public.rpc_update_work_order_attachment_metadata(uuid, text, text) to authenticated;
