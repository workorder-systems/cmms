-- SPDX-License-Identifier: AGPL-3.0-or-later
--
-- RPC to insert into storage.objects for work-order attachments when the Storage API
-- path fails RLS (e.g. in tests where the API does not set auth context). Caller must
-- be authenticated and pass their own user id; RPC validates membership and work
-- order existence then inserts via SECURITY DEFINER so the trigger still runs.
-- Used by tests as fallback when client.storage.upload fails with RLS.

-- Ensure the migration role can insert into storage.objects (for SECURITY DEFINER).
do $$
begin
  execute format('grant insert on storage.objects to %I', current_user);
exception
  when insufficient_privilege or undefined_object then
    null; -- ignore if storage schema is restricted
end
$$;

create or replace function public.rpc_insert_work_order_attachment_object(
  p_tenant_id uuid,
  p_work_order_id uuid,
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
  v_assigned_to uuid;
begin
  -- Caller must be the owner (prevents passing another user's id).
  if auth.uid() is distinct from p_owner_id then
    raise exception using message = 'Caller must pass their own user id as owner', errcode = '42501';
  end if;
  if not authz.is_tenant_member(p_owner_id, p_tenant_id) then
    raise exception using message = 'User is not a member of this tenant', errcode = '42501';
  end if;
  if not authz.work_order_exists(p_tenant_id, p_work_order_id) then
    raise exception using message = 'Work order not found or does not belong to tenant', errcode = 'P0001';
  end if;

  -- Same rule as trigger and Storage RLS: must be assigned to the work order or have workorder.edit
  select wo.assigned_to into v_assigned_to
  from app.work_orders wo
  where wo.id = p_work_order_id and wo.tenant_id = p_tenant_id;
  if v_assigned_to is distinct from p_owner_id then
    perform authz.validate_permission(p_owner_id, p_tenant_id, 'workorder.edit');
  end if;

  -- Path must match tenant and work order (prevents attaching to a different WO via p_name)
  if array_length(storage.foldername(p_name), 1) <> 2
     or (storage.foldername(p_name))[1]::uuid <> p_tenant_id
     or (storage.foldername(p_name))[2]::uuid <> p_work_order_id then
    raise exception using message = 'Attachment path must be tenant_id/work_order_id/filename and match p_tenant_id and p_work_order_id', errcode = 'P0001';
  end if;

  insert into storage.objects (bucket_id, name, owner_id, metadata)
  values ('attachments', p_name, p_owner_id::text, coalesce(p_metadata, '{}'::jsonb));
end
$$;

comment on function public.rpc_insert_work_order_attachment_object(uuid, uuid, text, uuid, jsonb) is
  'Inserts a work-order attachment row into storage.objects. Enforces same rules as trigger: caller must be owner, tenant member, work order exists, and either assigned to the work order or have workorder.edit. Used as test fallback when Storage API upload fails RLS.';

revoke all on function public.rpc_insert_work_order_attachment_object(uuid, uuid, text, uuid, jsonb) from public;
grant execute on function public.rpc_insert_work_order_attachment_object(uuid, uuid, text, uuid, jsonb) to authenticated;
