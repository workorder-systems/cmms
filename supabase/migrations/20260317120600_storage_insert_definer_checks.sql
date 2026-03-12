-- SPDX-License-Identifier: AGPL-3.0-or-later
--
-- Storage INSERT policy: use SECURITY DEFINER helpers for work order/asset/location
-- existence checks so they run with definer rights and are not blocked by RLS when
-- the Storage API (authenticated role) evaluates the policy.
-- Affected: authz helpers, storage.objects policy attachments_insert_authenticated.

-- Helper: work order exists in tenant (bypasses RLS for policy evaluation)
create or replace function authz.work_order_exists(
  p_tenant_id uuid,
  p_work_order_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from app.work_orders wo
    where wo.id = p_work_order_id and wo.tenant_id = p_tenant_id
  );
$$;

comment on function authz.work_order_exists(uuid, uuid) is
  'Returns true if a work order exists in the given tenant. Used by storage INSERT policy; SECURITY DEFINER so the check is not blocked by RLS on app.work_orders.';

revoke all on function authz.work_order_exists(uuid, uuid) from public;
grant execute on function authz.work_order_exists(uuid, uuid) to authenticated;
grant execute on function authz.work_order_exists(uuid, uuid) to anon;

-- Helper: asset exists in tenant
create or replace function authz.asset_exists(
  p_tenant_id uuid,
  p_asset_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from app.assets a
    where a.id = p_asset_id and a.tenant_id = p_tenant_id
  );
$$;

comment on function authz.asset_exists(uuid, uuid) is
  'Returns true if an asset exists in the given tenant. Used by storage INSERT policy; SECURITY DEFINER so the check is not blocked by RLS.';

revoke all on function authz.asset_exists(uuid, uuid) from public;
grant execute on function authz.asset_exists(uuid, uuid) to authenticated;
grant execute on function authz.asset_exists(uuid, uuid) to anon;

-- Helper: location exists in tenant
create or replace function authz.location_exists(
  p_tenant_id uuid,
  p_location_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from app.locations l
    where l.id = p_location_id and l.tenant_id = p_tenant_id
  );
$$;

comment on function authz.location_exists(uuid, uuid) is
  'Returns true if a location exists in the given tenant. Used by storage INSERT policy; SECURITY DEFINER so the check is not blocked by RLS.';

revoke all on function authz.location_exists(uuid, uuid) from public;
grant execute on function authz.location_exists(uuid, uuid) to authenticated;
grant execute on function authz.location_exists(uuid, uuid) to anon;

-- Recreate storage INSERT policy using definer helpers for existence checks
drop policy if exists attachments_insert_authenticated on storage.objects;

-- Use coalesce(owner_id, auth.uid(), jwt sub): Storage API may set owner_id after RLS
-- or set JWT in session; auth.uid() can be null in some Storage API code paths.
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
      -- work order path (3 segments)
      (
        array_length(storage.foldername(name), 1) = 3
        and authz.work_order_exists(
          (storage.foldername(name))[1]::uuid,
          (storage.foldername(name))[2]::uuid
        )
      )
      or
      -- asset path (4 segments: tenant/asset/asset_id/file)
      (
        array_length(storage.foldername(name), 1) = 4
        and (storage.foldername(name))[2] = 'asset'
        and authz.asset_exists(
          (storage.foldername(name))[1]::uuid,
          (storage.foldername(name))[3]::uuid
        )
      )
      or
      -- location path (4 segments)
      (
        array_length(storage.foldername(name), 1) = 4
        and (storage.foldername(name))[2] = 'location'
        and authz.location_exists(
          (storage.foldername(name))[1]::uuid,
          (storage.foldername(name))[3]::uuid
        )
      )
    )
  );
