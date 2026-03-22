-- SPDX-License-Identifier: AGPL-3.0-or-later
--
-- Purpose: Harden polymorphic attachments for production best practices:
--   1) When a parent domain row is deleted, remove matching entity_attachments (restores
--      FK-like cascade behavior lost in the unified table).
--   2) After an entity_attachment row is removed, delete the Storage object and app.files
--      row when no other attachment row references that file_id (uses
--      set_config('storage.allow_delete_query','true',true) so storage.protect_delete allows it).
--   3) v_work_order_attachments INSTEAD OF UPDATE may only change metadata columns — not
--      work_order_id, file_id, or created_by (keeps object path and DB row aligned).
--   4) Optional document_type_key must reference cfg.document_types (tenant_id, key).
--
-- Affected: app.entity_attachments (triggers), app.work_orders, app.assets, app.locations,
--   app.purchase_orders, app.purchase_requisitions, app.parts, app.suppliers, app.incidents,
--   app.inspection_runs, app.shift_handovers; public.handle_v_work_order_attachments_update.

-- ============================================================================
-- 1. Validate document_type_key against tenant catalog (when non-null)
-- ============================================================================

create or replace function app.entity_attachments_validate_document_type_key()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.document_type_key is null then
    return new;
  end if;
  if not exists (
    select 1
    from cfg.document_types dt
    where dt.tenant_id = new.tenant_id
      and dt.key = new.document_type_key
  ) then
    raise exception using
      message = format(
        'document_type_key %s is not defined for this tenant (cfg.document_types)',
        new.document_type_key
      ),
      errcode = '23503';
  end if;
  return new;
end;
$$;

comment on function app.entity_attachments_validate_document_type_key() is
  'Rejects entity_attachments rows whose document_type_key does not exist in cfg.document_types for the same tenant.';

revoke all on function app.entity_attachments_validate_document_type_key() from public;
grant execute on function app.entity_attachments_validate_document_type_key() to postgres;

drop trigger if exists entity_attachments_validate_document_type_key_trigger on app.entity_attachments;

create trigger entity_attachments_validate_document_type_key_trigger
  before insert or update of document_type_key, tenant_id on app.entity_attachments
  for each row
  execute function app.entity_attachments_validate_document_type_key();

-- ============================================================================
-- 2. Prune Storage + app.files when the last entity_attachment row for a file_id is gone
-- ============================================================================

create or replace function app.entity_attachments_after_delete_prune_unreferenced_file()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_remain bigint;
  v_bucket text;
  v_path text;
begin
  select count(*) into v_remain
  from app.entity_attachments
  where file_id = old.file_id;

  if v_remain > 0 then
    return old;
  end if;

  select f.bucket_id, f.storage_path into v_bucket, v_path
  from app.files f
  where f.id = old.file_id;

  if not found then
    return old;
  end if;

  /*
   * Supabase installs storage.protect_delete (BEFORE DELETE on storage.objects), which raises
   * 42501 unless storage.allow_delete_query is set for this transaction. Server-side refcount
   * cleanup is intentional: delete the object row, then remove app.files (see Storage docs:
   * prefer the API for app code; this path is a controlled SECURITY DEFINER maintenance hook).
   */
  perform set_config('storage.allow_delete_query', 'true', true);

  delete from storage.objects
  where bucket_id = v_bucket
    and name = v_path;

  delete from app.files where id = old.file_id;

  return old;
end;
$$;

comment on function app.entity_attachments_after_delete_prune_unreferenced_file() is
  'AFTER DELETE on entity_attachments: deletes storage.objects + app.files when file_id is no longer referenced. Sets storage.allow_delete_query for the storage.objects delete (Supabase protect_delete bypass).';

revoke all on function app.entity_attachments_after_delete_prune_unreferenced_file() from public;
grant execute on function app.entity_attachments_after_delete_prune_unreferenced_file() to postgres;

drop trigger if exists entity_attachments_after_delete_prune_file on app.entity_attachments;

create trigger entity_attachments_after_delete_prune_file
  after delete on app.entity_attachments
  for each row
  execute function app.entity_attachments_after_delete_prune_unreferenced_file();

-- Allow migration role to delete storage rows owned by the bucket (same pattern as insert RPC).
do $grant_storage$
begin
  execute format('grant delete on storage.objects to %I', current_user);
exception
  when insufficient_privilege or undefined_object then
    null;
end
$grant_storage$;

/*
 * Allow the invoker (same user who removed the last entity_attachment link) to delete the
 * Storage row once app.files no longer has any entity_attachments referencing it. ORs with
 * existing attachments_delete_authenticated (creator/admin) for the pre-delete case.
 */
drop policy if exists attachments_delete_authenticated_orphan_file on storage.objects;

create policy attachments_delete_authenticated_orphan_file on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'attachments'
    and not exists (
      select 1
      from app.entity_attachments ea
      join app.files f on f.id = ea.file_id
      where f.bucket_id = storage.objects.bucket_id
        and f.storage_path = storage.objects.name
    )
    and exists (
      select 1
      from app.files f2
      where f2.bucket_id = storage.objects.bucket_id
        and f2.storage_path = storage.objects.name
        and authz.is_current_user_tenant_member(f2.tenant_id)
    )
  );

-- ============================================================================
-- 3. Cascade: delete attachment rows when parent entity row is deleted
-- ============================================================================

create or replace function app.trigger_cascade_entity_attachments_on_parent_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_entity_type text;
begin
  v_entity_type := case tg_table_name::text
    when 'work_orders' then 'work_order'
    when 'assets' then 'asset'
    when 'locations' then 'location'
    when 'purchase_orders' then 'purchase_order'
    when 'purchase_requisitions' then 'purchase_requisition'
    when 'parts' then 'part'
    when 'suppliers' then 'supplier'
    when 'incidents' then 'incident'
    when 'inspection_runs' then 'inspection_run'
    when 'shift_handovers' then 'shift_handover'
    else null
  end;

  if v_entity_type is null then
    raise exception using
      message = format(
        'trigger_cascade_entity_attachments_on_parent_delete: unmapped table %s',
        tg_table_name
      ),
      errcode = 'P0001';
  end if;

  delete from app.entity_attachments
  where entity_type = v_entity_type
    and entity_id = old.id;

  return old;
end;
$$;

comment on function app.trigger_cascade_entity_attachments_on_parent_delete() is
  'AFTER DELETE on domain tables: removes entity_attachments for the deleted row (entity_type derived from TG_TABLE_NAME).';

revoke all on function app.trigger_cascade_entity_attachments_on_parent_delete() from public;
grant execute on function app.trigger_cascade_entity_attachments_on_parent_delete() to postgres;

drop trigger if exists cascade_entity_attachments_after_delete on app.work_orders;
create trigger cascade_entity_attachments_after_delete
  after delete on app.work_orders
  for each row
  execute function app.trigger_cascade_entity_attachments_on_parent_delete();

drop trigger if exists cascade_entity_attachments_after_delete on app.assets;
create trigger cascade_entity_attachments_after_delete
  after delete on app.assets
  for each row
  execute function app.trigger_cascade_entity_attachments_on_parent_delete();

drop trigger if exists cascade_entity_attachments_after_delete on app.locations;
create trigger cascade_entity_attachments_after_delete
  after delete on app.locations
  for each row
  execute function app.trigger_cascade_entity_attachments_on_parent_delete();

drop trigger if exists cascade_entity_attachments_after_delete on app.purchase_orders;
create trigger cascade_entity_attachments_after_delete
  after delete on app.purchase_orders
  for each row
  execute function app.trigger_cascade_entity_attachments_on_parent_delete();

drop trigger if exists cascade_entity_attachments_after_delete on app.purchase_requisitions;
create trigger cascade_entity_attachments_after_delete
  after delete on app.purchase_requisitions
  for each row
  execute function app.trigger_cascade_entity_attachments_on_parent_delete();

drop trigger if exists cascade_entity_attachments_after_delete on app.parts;
create trigger cascade_entity_attachments_after_delete
  after delete on app.parts
  for each row
  execute function app.trigger_cascade_entity_attachments_on_parent_delete();

drop trigger if exists cascade_entity_attachments_after_delete on app.suppliers;
create trigger cascade_entity_attachments_after_delete
  after delete on app.suppliers
  for each row
  execute function app.trigger_cascade_entity_attachments_on_parent_delete();

drop trigger if exists cascade_entity_attachments_after_delete on app.incidents;
create trigger cascade_entity_attachments_after_delete
  after delete on app.incidents
  for each row
  execute function app.trigger_cascade_entity_attachments_on_parent_delete();

drop trigger if exists cascade_entity_attachments_after_delete on app.inspection_runs;
create trigger cascade_entity_attachments_after_delete
  after delete on app.inspection_runs
  for each row
  execute function app.trigger_cascade_entity_attachments_on_parent_delete();

drop trigger if exists cascade_entity_attachments_after_delete on app.shift_handovers;
create trigger cascade_entity_attachments_after_delete
  after delete on app.shift_handovers
  for each row
  execute function app.trigger_cascade_entity_attachments_on_parent_delete();

-- ============================================================================
-- 4. Work order attachment view: metadata-only updates
-- ============================================================================

create or replace function public.handle_v_work_order_attachments_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  /*
   * Immutable link columns: changing them would desync Storage path from DB. Joined columns
   * (bucket_id, filename, …) are derived from app.files and must not be written via this view.
   */
  if new.id is distinct from old.id
     or new.tenant_id is distinct from old.tenant_id
     or new.work_order_id is distinct from old.work_order_id
     or new.file_id is distinct from old.file_id
     or new.created_by is distinct from old.created_by
  then
    raise exception using
      message = 'Only label, kind, and document metadata fields may be updated via v_work_order_attachments; re-upload to change file or work order',
      errcode = 'P0001';
  end if;

  update app.entity_attachments
  set
    label = new.label,
    kind = new.kind,
    document_type_key = new.document_type_key,
    is_controlled = new.is_controlled,
    effective_date = new.effective_date,
    revision_label = new.revision_label,
    updated_at = pg_catalog.now()
  where id = old.id
    and entity_type = 'work_order';

  return new;
end;
$$;

comment on function public.handle_v_work_order_attachments_update() is
  'INSTEAD OF UPDATE: only label, kind, document_type_key, is_controlled, effective_date, revision_label (immutable link + file identity).';
