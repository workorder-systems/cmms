-- SPDX-License-Identifier: AGPL-3.0-or-later
--
-- Fix attachment trigger: storage.foldername() returns path segments *excluding*
-- the filename, so tenant_id/work_order_id/filename yields 2 segments, and
-- tenant_id/entity_type/entity_id/filename yields 3 segments. The trigger was
-- checking for 3 and 4; update to 2 (work order) and 3 (asset/location).

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

  -- storage.foldername() returns path segments excluding the filename
  -- e.g. tenant_id/work_order_id/filename -> 2 segments; tenant_id/asset/asset_id/file -> 3 segments
  v_path_tokens := storage.foldername(new.name);
  v_tenant_id := coalesce(
    (new.metadata->>'tenant_id')::uuid,
    (v_path_tokens[1])::uuid
  );

  -- 2 segments from foldername: tenant_id / work_order_id (path is tenant_id/work_order_id/filename)
  if array_length(v_path_tokens, 1) = 2 then
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

  -- 3 segments from foldername: tenant_id / entity_type / entity_id (path is tenant_id/entity_type/entity_id/filename)
  if array_length(v_path_tokens, 1) = 3 then
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
  'Trigger: after insert on storage.objects for bucket attachments. Uses storage.foldername (excludes filename): 2 segments = work order path, 3 segments = asset/location path. Creates app.files and work_order_attachments, asset_attachments, or location_attachments. Validates tenant and entity ownership.';

-- Storage INSERT policy: foldername returns segments excluding filename, so work order = 2, asset/location = 3
drop policy if exists attachments_insert_authenticated on storage.objects;

create policy attachments_insert_authenticated on storage.objects for insert to authenticated
  with check (
    bucket_id = 'attachments'
    and (
      owner_id is not null
      or auth.uid() is not null
      or (coalesce(auth.jwt(), '{}'::jsonb)->>'sub') is not null
    )
    and (
      select authz.is_tenant_member(
        coalesce(
          owner_id::uuid,
          auth.uid(),
          (coalesce(auth.jwt(), '{}'::jsonb)->>'sub')::uuid
        ),
        (storage.foldername(name))[1]::uuid
      )
    )
    and (
      -- work order path (2 segments from foldername: tenant_id/work_order_id/filename)
      (
        array_length(storage.foldername(name), 1) = 2
        and authz.work_order_exists(
          (storage.foldername(name))[1]::uuid,
          (storage.foldername(name))[2]::uuid
        )
      )
      or
      -- asset path (3 segments: tenant/asset/asset_id/file)
      (
        array_length(storage.foldername(name), 1) = 3
        and (storage.foldername(name))[2] = 'asset'
        and authz.asset_exists(
          (storage.foldername(name))[1]::uuid,
          (storage.foldername(name))[3]::uuid
        )
      )
      or
      -- location path (3 segments)
      (
        array_length(storage.foldername(name), 1) = 3
        and (storage.foldername(name))[2] = 'location'
        and authz.location_exists(
          (storage.foldername(name))[1]::uuid,
          (storage.foldername(name))[3]::uuid
        )
      )
    )
  );
