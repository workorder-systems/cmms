-- SPDX-License-Identifier: AGPL-3.0-or-later
--
-- Storage INSERT policy: allow auth.uid() fallback when owner_id is not set.
-- In some test/edge environments Storage may not populate owner_id before RLS
-- runs; coalesce(owner_id, auth.uid()) ensures the membership check still works.
-- Affected: storage.objects policy attachments_insert_authenticated.

drop policy if exists attachments_insert_authenticated on storage.objects;

create policy attachments_insert_authenticated on storage.objects for insert to authenticated
  with check (
    bucket_id = 'attachments'
    and (owner_id is not null or auth.uid() is not null)
    and (
      select authz.is_tenant_member(
        coalesce(owner_id::uuid, auth.uid()),
        (storage.foldername(name))[1]::uuid
      )
    )
    and (
      -- work order path (3 segments)
      (
        array_length(storage.foldername(name), 1) = 3
        and exists (
          select 1 from app.work_orders wo
          where wo.id = (storage.foldername(name))[2]::uuid
            and wo.tenant_id = (storage.foldername(name))[1]::uuid
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
