-- SPDX-License-Identifier: AGPL-3.0-or-later
--
-- Mobile-first: asset and location attachments, Storage path convention and RLS.
--
-- Purpose: Support attachments (photos, documents, signatures, scans) for assets and
--   locations. Path convention: attachments bucket supports
--   tenant_id/work_order_id/filename (existing), tenant_id/asset/asset_id/filename,
--   tenant_id/location/location_id/filename. Trigger creates app.files and the
--   appropriate attachment row. RLS on storage.objects extended for new paths.
--
-- Affected: app.asset_attachments (new), app.location_attachments (new),
--   app.on_attachment_object_inserted (replace to branch on path),
--   storage.objects policies (extend for asset/location),
--   public.v_asset_attachments, public.v_location_attachments (new).
--
-- Kind values (documented): photo, document, signature, scan, invoice or tenant-defined.

-- ============================================================================
-- 1. app.asset_attachments
-- ============================================================================

create table app.asset_attachments (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  asset_id uuid not null references app.assets(id) on delete cascade,
  file_id uuid not null references app.files(id) on delete cascade,
  label text,
  kind text,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  created_by uuid references auth.users(id) on delete set null,
  constraint asset_attachments_label_length_check check (
    label is null
    or (length(label) >= 1 and length(label) <= 255)
  ),
  constraint asset_attachments_kind_format_check check (
    kind is null
    or (kind ~ '^[a-z0-9_]+$' and length(kind) >= 1 and length(kind) <= 50)
  )
);

comment on table app.asset_attachments is
  'Attachments (photos, documents, signatures, scans) linked to assets. Stores metadata and file_id; actual file in app.files and Supabase Storage. Kind: photo, document, signature, scan, invoice or tenant-defined.';
comment on column app.asset_attachments.file_id is
  'Reference to app.files (single source of truth for CMMS files).';
comment on column app.asset_attachments.label is
  'Optional human-readable label (e.g. "Nameplate photo", "Manual PDF").';
comment on column app.asset_attachments.kind is
  'Optional type: photo, document, signature, scan, invoice. Used for filtering and display.';

create index asset_attachments_asset_idx on app.asset_attachments (asset_id);
create index asset_attachments_tenant_asset_idx on app.asset_attachments (tenant_id, asset_id);
create index asset_attachments_file_id_idx on app.asset_attachments (file_id);
create index asset_attachments_created_at_idx on app.asset_attachments (created_at desc);
create index asset_attachments_tenant_updated_idx on app.asset_attachments (tenant_id, updated_at desc);

create trigger asset_attachments_set_updated_at
  before update on app.asset_attachments
  for each row
  execute function util.set_updated_at();

alter table app.asset_attachments enable row level security;

-- RLS: one policy per operation per role (authenticated, anon)
create policy asset_attachments_select_tenant on app.asset_attachments for select to authenticated
  using (authz.is_current_user_tenant_member(tenant_id));
create policy asset_attachments_select_anon on app.asset_attachments for select to anon
  using (authz.is_current_user_tenant_member(tenant_id));
create policy asset_attachments_insert_tenant on app.asset_attachments for insert to authenticated
  with check (authz.is_current_user_tenant_member(tenant_id));
create policy asset_attachments_insert_anon on app.asset_attachments for insert to anon
  with check (false);
create policy asset_attachments_update_tenant on app.asset_attachments for update to authenticated
  using (
    authz.is_current_user_tenant_member(tenant_id)
    and (created_by = auth.uid() or authz.is_admin_or_manager(auth.uid(), tenant_id))
  )
  with check (authz.is_current_user_tenant_member(tenant_id));
create policy asset_attachments_update_anon on app.asset_attachments for update to anon
  using (false) with check (false);
create policy asset_attachments_delete_tenant on app.asset_attachments for delete to authenticated
  using (
    authz.is_current_user_tenant_member(tenant_id)
    and (created_by = auth.uid() or authz.is_admin_or_manager(auth.uid(), tenant_id))
  );
create policy asset_attachments_delete_anon on app.asset_attachments for delete to anon
  using (false);

comment on policy asset_attachments_select_tenant on app.asset_attachments is
  'Authenticated users can view asset attachments in tenants they are members of.';
comment on policy asset_attachments_select_anon on app.asset_attachments is
  'Anon can view when tenant context permits (e.g. tenant membership).';
comment on policy asset_attachments_insert_tenant on app.asset_attachments is
  'Authenticated users can create asset attachments in their tenants.';
comment on policy asset_attachments_update_tenant on app.asset_attachments is
  'Authenticated users can update their own attachment or admins/managers any attachment.';
comment on policy asset_attachments_delete_tenant on app.asset_attachments is
  'Authenticated users can delete their own attachment or admins/managers any attachment.';

grant select on app.asset_attachments to authenticated, anon;
grant insert, update, delete on app.asset_attachments to authenticated;
alter table app.asset_attachments force row level security;

-- ============================================================================
-- 2. app.location_attachments
-- ============================================================================

create table app.location_attachments (
  id uuid primary key default extensions.gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  location_id uuid not null references app.locations(id) on delete cascade,
  file_id uuid not null references app.files(id) on delete cascade,
  label text,
  kind text,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  created_by uuid references auth.users(id) on delete set null,
  constraint location_attachments_label_length_check check (
    label is null
    or (length(label) >= 1 and length(label) <= 255)
  ),
  constraint location_attachments_kind_format_check check (
    kind is null
    or (kind ~ '^[a-z0-9_]+$' and length(kind) >= 1 and length(kind) <= 50)
  )
);

comment on table app.location_attachments is
  'Attachments (photos, documents, signatures, scans) linked to locations. Stores metadata and file_id; actual file in app.files and Supabase Storage. Kind: photo, document, signature, scan or tenant-defined.';
comment on column app.location_attachments.file_id is
  'Reference to app.files (single source of truth for CMMS files).';
comment on column app.location_attachments.label is
  'Optional human-readable label (e.g. "Floor plan", "Site photo").';
comment on column app.location_attachments.kind is
  'Optional type: photo, document, signature, scan. Used for filtering and display.';

create index location_attachments_location_idx on app.location_attachments (location_id);
create index location_attachments_tenant_location_idx on app.location_attachments (tenant_id, location_id);
create index location_attachments_file_id_idx on app.location_attachments (file_id);
create index location_attachments_created_at_idx on app.location_attachments (created_at desc);
create index location_attachments_tenant_updated_idx on app.location_attachments (tenant_id, updated_at desc);

create trigger location_attachments_set_updated_at
  before update on app.location_attachments
  for each row
  execute function util.set_updated_at();

alter table app.location_attachments enable row level security;

create policy location_attachments_select_tenant on app.location_attachments for select to authenticated
  using (authz.is_current_user_tenant_member(tenant_id));
create policy location_attachments_select_anon on app.location_attachments for select to anon
  using (authz.is_current_user_tenant_member(tenant_id));
create policy location_attachments_insert_tenant on app.location_attachments for insert to authenticated
  with check (authz.is_current_user_tenant_member(tenant_id));
create policy location_attachments_insert_anon on app.location_attachments for insert to anon
  with check (false);
create policy location_attachments_update_tenant on app.location_attachments for update to authenticated
  using (
    authz.is_current_user_tenant_member(tenant_id)
    and (created_by = auth.uid() or authz.is_admin_or_manager(auth.uid(), tenant_id))
  )
  with check (authz.is_current_user_tenant_member(tenant_id));
create policy location_attachments_update_anon on app.location_attachments for update to anon
  using (false) with check (false);
create policy location_attachments_delete_tenant on app.location_attachments for delete to authenticated
  using (
    authz.is_current_user_tenant_member(tenant_id)
    and (created_by = auth.uid() or authz.is_admin_or_manager(auth.uid(), tenant_id))
  );
create policy location_attachments_delete_anon on app.location_attachments for delete to anon
  using (false);

comment on policy location_attachments_select_tenant on app.location_attachments is
  'Authenticated users can view location attachments in tenants they are members of.';
comment on policy location_attachments_select_anon on app.location_attachments is
  'Anon can view when tenant context permits.';
comment on policy location_attachments_insert_tenant on app.location_attachments is
  'Authenticated users can create location attachments in their tenants.';
comment on policy location_attachments_update_tenant on app.location_attachments is
  'Authenticated users can update their own attachment or admins/managers any attachment.';
comment on policy location_attachments_delete_tenant on app.location_attachments is
  'Authenticated users can delete their own attachment or admins/managers any attachment.';

grant select on app.location_attachments to authenticated, anon;
grant insert, update, delete on app.location_attachments to authenticated;
alter table app.location_attachments force row level security;

-- ============================================================================
-- 3. Replace Storage trigger: support work_order (3 segments), asset (4), location (4)
-- Path conventions:
--   tenant_id/work_order_id/filename     -> work order (existing)
--   tenant_id/asset/asset_id/filename  -> asset
--   tenant_id/location/location_id/filename -> location
-- ============================================================================

create or replace function app.on_attachment_object_inserted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant_id uuid;
  v_work_order_id uuid;
  v_asset_id uuid;
  v_location_id uuid;
  v_file_id uuid;
  v_path_tokens text[];
  v_entity_type text;
  v_wo_tenant_id uuid;
  v_wo_assigned_to uuid;
  v_asset_tenant_id uuid;
  v_loc_tenant_id uuid;
begin
  if new.bucket_id <> 'attachments' then
    return new;
  end if;

  v_path_tokens := storage.foldername(new.name);
  v_tenant_id := coalesce(
    (new.metadata->>'tenant_id')::uuid,
    (v_path_tokens[1])::uuid
  );

  -- 3 segments: tenant_id / work_order_id / filename (existing)
  if array_length(v_path_tokens, 1) = 3 then
    v_work_order_id := (v_path_tokens[2])::uuid;
    select wo.tenant_id, wo.assigned_to into v_wo_tenant_id, v_wo_assigned_to
    from app.work_orders wo where wo.id = v_work_order_id;
    if not found or v_wo_tenant_id <> v_tenant_id then
      raise exception using
        message = format('Work order %s not found or does not belong to tenant', v_work_order_id),
        errcode = 'P0001';
    end if;
    if not authz.is_tenant_member((new.owner_id)::uuid, v_tenant_id) then
      raise exception using message = 'Uploader is not a member of the tenant', errcode = 'P0001';
    end if;
    if v_wo_assigned_to is distinct from (new.owner_id)::uuid then
      perform authz.validate_permission((new.owner_id)::uuid, v_tenant_id, 'workorder.edit');
    end if;
    insert into app.files (id, tenant_id, bucket_id, storage_path, filename, content_type, byte_size, created_at)
    values (
      extensions.gen_random_uuid(), v_tenant_id, new.bucket_id, new.name,
      storage.filename(new.name), new.metadata->>'content_type', (new.metadata->>'byte_size')::bigint, pg_catalog.now()
    )
    returning id into v_file_id;
    insert into app.work_order_attachments (tenant_id, work_order_id, file_id, label, kind, created_by)
    values (
      v_tenant_id, v_work_order_id, v_file_id,
      new.metadata->>'label',
      case when new.metadata->>'kind' <> '' and new.metadata->>'kind' is not null then new.metadata->>'kind' else null end,
      (new.owner_id)::uuid
    );
    return new;
  end if;

  -- 4 segments: tenant_id / entity_type / entity_id / filename
  if array_length(v_path_tokens, 1) = 4 then
    v_entity_type := v_path_tokens[2];
    if not authz.is_tenant_member((new.owner_id)::uuid, v_tenant_id) then
      raise exception using message = 'Uploader is not a member of the tenant', errcode = 'P0001';
    end if;
    insert into app.files (id, tenant_id, bucket_id, storage_path, filename, content_type, byte_size, created_at)
    values (
      extensions.gen_random_uuid(), v_tenant_id, new.bucket_id, new.name,
      storage.filename(new.name), new.metadata->>'content_type', (new.metadata->>'byte_size')::bigint, pg_catalog.now()
    )
    returning id into v_file_id;

    if v_entity_type = 'asset' then
      v_asset_id := (v_path_tokens[3])::uuid;
      select tenant_id into v_asset_tenant_id from app.assets where id = v_asset_id;
      if not found or v_asset_tenant_id <> v_tenant_id then
        raise exception using
          message = format('Asset %s not found or does not belong to tenant', v_asset_id),
          errcode = 'P0001';
      end if;
      insert into app.asset_attachments (tenant_id, asset_id, file_id, label, kind, created_by)
      values (
        v_tenant_id, v_asset_id, v_file_id,
        new.metadata->>'label',
        case when new.metadata->>'kind' <> '' and new.metadata->>'kind' is not null then new.metadata->>'kind' else null end,
        (new.owner_id)::uuid
      );
    elsif v_entity_type = 'location' then
      v_location_id := (v_path_tokens[3])::uuid;
      select tenant_id into v_loc_tenant_id from app.locations where id = v_location_id;
      if not found or v_loc_tenant_id <> v_tenant_id then
        raise exception using
          message = format('Location %s not found or does not belong to tenant', v_location_id),
          errcode = 'P0001';
      end if;
      insert into app.location_attachments (tenant_id, location_id, file_id, label, kind, created_by)
      values (
        v_tenant_id, v_location_id, v_file_id,
        new.metadata->>'label',
        case when new.metadata->>'kind' <> '' and new.metadata->>'kind' is not null then new.metadata->>'kind' else null end,
        (new.owner_id)::uuid
      );
    else
      raise exception using
        message = format('Attachment path entity_type must be asset or location, got: %s. Use tenant_id/work_order_id/filename for work orders.', v_entity_type),
        errcode = 'P0001';
    end if;
    return new;
  end if;

  raise exception using
    message = 'Attachment path must be tenant_id/work_order_id/filename (3 parts) or tenant_id/asset|location/entity_id/filename (4 parts)',
    errcode = 'P0001';
end;
$$;

comment on function app.on_attachment_object_inserted() is
  'Trigger: after insert on storage.objects for bucket attachments. Creates app.files and work_order_attachments (path 3 segments), asset_attachments (path tenant_id/asset/asset_id/file), or location_attachments (path tenant_id/location/location_id/file). Validates tenant and entity ownership.';

-- ============================================================================
-- 4. Storage RLS: allow select/update/delete for asset and location attachments
-- ============================================================================

-- Select: extend so objects linked via asset_attachments or location_attachments are visible to tenant members
drop policy if exists attachments_select_authenticated on storage.objects;
drop policy if exists attachments_select_anon on storage.objects;

create policy attachments_select_authenticated on storage.objects for select to authenticated
  using (
    bucket_id = 'attachments'
    and (
      exists (
        select 1 from app.files f
        join app.work_order_attachments woa on woa.file_id = f.id
        join app.work_orders wo on wo.id = woa.work_order_id
        where f.bucket_id = storage.objects.bucket_id and f.storage_path = storage.objects.name
          and (select authz.is_current_user_tenant_member(wo.tenant_id))
      )
      or exists (
        select 1 from app.files f
        join app.asset_attachments aa on aa.file_id = f.id
        where f.bucket_id = storage.objects.bucket_id and f.storage_path = storage.objects.name
          and (select authz.is_current_user_tenant_member(aa.tenant_id))
      )
      or exists (
        select 1 from app.files f
        join app.location_attachments la on la.file_id = f.id
        where f.bucket_id = storage.objects.bucket_id and f.storage_path = storage.objects.name
          and (select authz.is_current_user_tenant_member(la.tenant_id))
      )
    )
  );

create policy attachments_select_anon on storage.objects for select to anon
  using (
    bucket_id = 'attachments'
    and (
      exists (
        select 1 from app.files f
        join app.work_order_attachments woa on woa.file_id = f.id
        join app.work_orders wo on wo.id = woa.work_order_id
        where f.bucket_id = storage.objects.bucket_id and f.storage_path = storage.objects.name
          and (select authz.is_current_user_tenant_member(wo.tenant_id))
      )
      or exists (
        select 1 from app.files f
        join app.asset_attachments aa on aa.file_id = f.id
        where f.bucket_id = storage.objects.bucket_id and f.storage_path = storage.objects.name
          and (select authz.is_current_user_tenant_member(aa.tenant_id))
      )
      or exists (
        select 1 from app.files f
        join app.location_attachments la on la.file_id = f.id
        where f.bucket_id = storage.objects.bucket_id and f.storage_path = storage.objects.name
          and (select authz.is_current_user_tenant_member(la.tenant_id))
      )
    )
  );

-- Insert: allow uploads to asset and location paths (tenant_id/asset/asset_id or tenant_id/location/location_id)
drop policy if exists attachments_insert_authenticated on storage.objects;

create policy attachments_insert_authenticated on storage.objects for insert to authenticated
  with check (
    bucket_id = 'attachments'
    and (select authz.is_current_user_tenant_member((storage.foldername(name))[1]::uuid))
    and (
      -- work order path (3 segments)
      (
        array_length(storage.foldername(name), 1) = 3
        and exists (
          select 1 from app.work_orders wo
          where wo.id = (storage.foldername(name))[2]::uuid
            and wo.tenant_id = (storage.foldername(name))[1]::uuid
            and (wo.assigned_to = auth.uid() or (select authz.has_permission(auth.uid(), wo.tenant_id, 'workorder.edit')))
        )
      )
      or
      -- asset path (4 segments: tenant/asset/asset_id/file)
      (
        array_length(storage.foldername(name), 1) = 4
        and (storage.foldername(name))[2] = 'asset'
        and exists (
          select 1 from app.assets a
          where a.id = (storage.foldername(name))[3]::uuid
            and a.tenant_id = (storage.foldername(name))[1]::uuid
        )
      )
      or
      -- location path (4 segments)
      (
        array_length(storage.foldername(name), 1) = 4
        and (storage.foldername(name))[2] = 'location'
        and exists (
          select 1 from app.locations l
          where l.id = (storage.foldername(name))[3]::uuid
            and l.tenant_id = (storage.foldername(name))[1]::uuid
        )
      )
    )
  );

-- Update/delete: extend to asset_attachments and location_attachments
drop policy if exists attachments_update_authenticated on storage.objects;
drop policy if exists attachments_delete_authenticated on storage.objects;

create policy attachments_update_authenticated on storage.objects for update to authenticated
  using (
    bucket_id = 'attachments'
    and (
      exists (
        select 1 from app.files f
        join app.work_order_attachments woa on woa.file_id = f.id
        where f.bucket_id = storage.objects.bucket_id and f.storage_path = storage.objects.name
          and (select authz.is_current_user_tenant_member(woa.tenant_id))
          and (woa.created_by = auth.uid() or (select authz.is_admin_or_manager(auth.uid(), woa.tenant_id)))
      )
      or exists (
        select 1 from app.files f
        join app.asset_attachments aa on aa.file_id = f.id
        where f.bucket_id = storage.objects.bucket_id and f.storage_path = storage.objects.name
          and (select authz.is_current_user_tenant_member(aa.tenant_id))
          and (aa.created_by = auth.uid() or (select authz.is_admin_or_manager(auth.uid(), aa.tenant_id)))
      )
      or exists (
        select 1 from app.files f
        join app.location_attachments la on la.file_id = f.id
        where f.bucket_id = storage.objects.bucket_id and f.storage_path = storage.objects.name
          and (select authz.is_current_user_tenant_member(la.tenant_id))
          and (la.created_by = auth.uid() or (select authz.is_admin_or_manager(auth.uid(), la.tenant_id)))
      )
    )
  )
  with check (
    bucket_id = 'attachments'
    and (
      exists (
        select 1 from app.files f
        join app.work_order_attachments woa on woa.file_id = f.id
        where f.bucket_id = storage.objects.bucket_id and f.storage_path = storage.objects.name
          and (select authz.is_current_user_tenant_member(woa.tenant_id))
          and (woa.created_by = auth.uid() or (select authz.is_admin_or_manager(auth.uid(), woa.tenant_id)))
      )
      or exists (
        select 1 from app.files f
        join app.asset_attachments aa on aa.file_id = f.id
        where f.bucket_id = storage.objects.bucket_id and f.storage_path = storage.objects.name
          and (select authz.is_current_user_tenant_member(aa.tenant_id))
          and (aa.created_by = auth.uid() or (select authz.is_admin_or_manager(auth.uid(), aa.tenant_id)))
      )
      or exists (
        select 1 from app.files f
        join app.location_attachments la on la.file_id = f.id
        where f.bucket_id = storage.objects.bucket_id and f.storage_path = storage.objects.name
          and (select authz.is_current_user_tenant_member(la.tenant_id))
          and (la.created_by = auth.uid() or (select authz.is_admin_or_manager(auth.uid(), la.tenant_id)))
      )
    )
  );

create policy attachments_delete_authenticated on storage.objects for delete to authenticated
  using (
    bucket_id = 'attachments'
    and (
      exists (
        select 1 from app.files f
        join app.work_order_attachments woa on woa.file_id = f.id
        where f.bucket_id = storage.objects.bucket_id and f.storage_path = storage.objects.name
          and (select authz.is_current_user_tenant_member(woa.tenant_id))
          and (woa.created_by = auth.uid() or (select authz.is_admin_or_manager(auth.uid(), woa.tenant_id)))
      )
      or exists (
        select 1 from app.files f
        join app.asset_attachments aa on aa.file_id = f.id
        where f.bucket_id = storage.objects.bucket_id and f.storage_path = storage.objects.name
          and (select authz.is_current_user_tenant_member(aa.tenant_id))
          and (aa.created_by = auth.uid() or (select authz.is_admin_or_manager(auth.uid(), aa.tenant_id)))
      )
      or exists (
        select 1 from app.files f
        join app.location_attachments la on la.file_id = f.id
        where f.bucket_id = storage.objects.bucket_id and f.storage_path = storage.objects.name
          and (select authz.is_current_user_tenant_member(la.tenant_id))
          and (la.created_by = auth.uid() or (select authz.is_admin_or_manager(auth.uid(), la.tenant_id)))
      )
    )
  );

-- ============================================================================
-- 5. Public views: v_asset_attachments, v_location_attachments
-- ============================================================================

create view public.v_asset_attachments
with (security_invoker = true)
as
select
  aa.id,
  aa.tenant_id,
  aa.asset_id,
  aa.file_id,
  f.bucket_id,
  f.storage_path,
  f.filename,
  f.content_type,
  aa.label,
  aa.kind,
  aa.created_by,
  p_created_by.full_name as created_by_name,
  aa.created_at,
  aa.updated_at
from app.asset_attachments aa
left join app.files f on f.id = aa.file_id
left join app.profiles p_created_by on p_created_by.user_id = aa.created_by and p_created_by.tenant_id = aa.tenant_id
where aa.tenant_id = authz.get_current_tenant_id()
order by aa.created_at desc;

comment on view public.v_asset_attachments is
  'Asset attachments view scoped to the current tenant. Joins app.files for bucket_id/storage_path (signed URLs). Set tenant via rpc_set_tenant_context.';

create view public.v_location_attachments
with (security_invoker = true)
as
select
  la.id,
  la.tenant_id,
  la.location_id,
  la.file_id,
  f.bucket_id,
  f.storage_path,
  f.filename,
  f.content_type,
  la.label,
  la.kind,
  la.created_by,
  p_created_by.full_name as created_by_name,
  la.created_at,
  la.updated_at
from app.location_attachments la
left join app.files f on f.id = la.file_id
left join app.profiles p_created_by on p_created_by.user_id = la.created_by and p_created_by.tenant_id = la.tenant_id
where la.tenant_id = authz.get_current_tenant_id()
order by la.created_at desc;

comment on view public.v_location_attachments is
  'Location attachments view scoped to the current tenant. Joins app.files for bucket_id/storage_path (signed URLs). Set tenant via rpc_set_tenant_context.';

grant select on public.v_asset_attachments to authenticated, anon;
grant select on public.v_location_attachments to authenticated, anon;
