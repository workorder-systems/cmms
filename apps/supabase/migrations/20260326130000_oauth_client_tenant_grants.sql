/*
 * migration: oauth_client_tenant_grants + jwt hook + set_tenant_context
 * purpose: at oauth consent, users choose which tenant(s) a third-party client may access.
 * affected: app.oauth_client_tenant_grants, authz.custom_access_token_hook, authz.set_tenant_context,
 *           public.rpc_replace_oauth_client_tenant_grants
 * notes: oauth access tokens include client_id; hook sets tenant_id + oauth_tenant_ids from grants only
 *        (no fallback to user_metadata tenant for oauth). first-party sessions unchanged.
 */

-- ============================================================================
-- Grants: which tenants each user allowed per OAuth client (set at consent)
-- ============================================================================

create table app.oauth_client_tenant_grants (
  user_id uuid not null references auth.users (id) on delete cascade,
  oauth_client_id text not null,
  tenant_id uuid not null references app.tenants (id) on delete cascade,
  created_at timestamptz not null default pg_catalog.now(),
  constraint oauth_client_tenant_grants_pkey primary key (user_id, oauth_client_id, tenant_id),
  constraint oauth_client_tenant_grants_client_id_format check (
    length(trim(oauth_client_id)) >= 1
    and length(oauth_client_id) <= 128
  )
);

comment on table app.oauth_client_tenant_grants is
  'Tenants a user granted to a specific OAuth 2.1 client at consent. Used by custom_access_token_hook to set tenant_id and oauth_tenant_ids on OAuth access tokens; rpc_set_tenant_context only allows switching among these tenants when JWT has client_id.';

create index oauth_client_tenant_grants_hook_lookup_idx
  on app.oauth_client_tenant_grants (user_id, oauth_client_id);

alter table app.oauth_client_tenant_grants enable row level security;

-- No direct PostgREST access (app schema not exposed); RPC + hook use SECURITY DEFINER.

revoke all on table app.oauth_client_tenant_grants from public;
grant select, insert, delete, update on table app.oauth_client_tenant_grants to postgres;

-- ============================================================================
-- RPC: replace grant rows (called from oauth consent app before Approve)
-- ============================================================================

create or replace function public.rpc_replace_oauth_client_tenant_grants(
  p_oauth_client_id text,
  p_tenant_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_client text;
  v_tid uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception using
      message = 'Unauthorized: User must be authenticated',
      errcode = '28000';
  end if;

  v_client := trim(coalesce(p_oauth_client_id, ''));
  if length(v_client) < 1 then
    raise exception using
      message = 'Invalid OAuth client id',
      errcode = '22023';
  end if;

  delete from app.oauth_client_tenant_grants
  where user_id = v_user_id
    and oauth_client_id = v_client;

  if p_tenant_ids is null or cardinality(p_tenant_ids) = 0 then
    return;
  end if;

  for v_tid in
    select distinct u.x
    from unnest(p_tenant_ids) as u (x)
  loop
    if not authz.is_tenant_member(v_user_id, v_tid) then
      raise exception using
        message = 'Unauthorized: User is not a member of one or more selected tenants',
        errcode = '42501';
    end if;

    insert into app.oauth_client_tenant_grants (user_id, oauth_client_id, tenant_id)
    values (v_user_id, v_client, v_tid);
  end loop;
end;
$$;

comment on function public.rpc_replace_oauth_client_tenant_grants(text, uuid[]) is
  'Replaces tenant grants for the current user and OAuth client. Empty array removes all grants for that client. Each tenant must be a membership of the user. Used by the consent UI before approving authorization.';

revoke all on function public.rpc_replace_oauth_client_tenant_grants(text, uuid[]) from public;
grant execute on function public.rpc_replace_oauth_client_tenant_grants(text, uuid[]) to authenticated;

-- ============================================================================
-- set_tenant_context: OAuth JWTs may only switch into granted tenants
-- ============================================================================

create or replace function authz.set_tenant_context(
  p_tenant_id uuid
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_client_id text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception using
      message = 'Unauthorized: User must be authenticated',
      errcode = '28000';
  end if;

  if not authz.is_tenant_member(v_user_id, p_tenant_id) then
    raise exception using
      message = 'Unauthorized: User is not a member of this tenant',
      errcode = '42501';
  end if;

  begin
    v_client_id := nullif(
      trim(
        coalesce(
          current_setting('request.jwt.claims', true)::json->>'client_id',
          ''
        )
      ),
      ''
    );
  exception
    when others then
      v_client_id := null;
  end;

  if v_client_id is not null then
    if not exists (
      select 1
      from app.oauth_client_tenant_grants g
      where g.user_id = v_user_id
        and g.oauth_client_id = v_client_id
        and g.tenant_id = p_tenant_id
    ) then
      raise exception using
        message = 'Unauthorized: Tenant not allowed for this OAuth client. Re-authorize the app or pick a granted organization.',
        errcode = '42501';
    end if;
  end if;

  update auth.users
  set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) ||
    jsonb_build_object('current_tenant_id', p_tenant_id::text)
  where id = v_user_id;

  perform pg_catalog.set_config('app.current_tenant_id', p_tenant_id::text, true);
end;
$$;

comment on function authz.set_tenant_context(uuid) is
  'Sets tenant context (user metadata + session). For OAuth access tokens (JWT client_id set), p_tenant_id must appear in app.oauth_client_tenant_grants for that user and client.';

-- ============================================================================
-- Custom access token hook: OAuth uses grants; else existing metadata behavior
-- ============================================================================

create or replace function authz.custom_access_token_hook(
  event jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_tenant_id uuid;
  v_claims jsonb;
  v_oauth_client_id text;
  v_grant_tenants uuid[];
  v_oauth_tenant_json jsonb;
begin
  begin
    v_user_id := coalesce(
      (event->'user'->>'id')::uuid,
      (event->>'user_id')::uuid,
      (event->>'sub')::uuid
    );

    if v_user_id is null then
      return event;
    end if;

    v_claims := coalesce(event->'claims', '{}'::jsonb);

    v_oauth_client_id := nullif(trim(coalesce(event->>'client_id', '')), '');

    if v_oauth_client_id is not null then
      select coalesce(
        array_agg(tenant_id order by tenant_id),
        '{}'::uuid[]
      )
      into v_grant_tenants
      from app.oauth_client_tenant_grants
      where user_id = v_user_id
        and oauth_client_id = v_oauth_client_id;

      select coalesce(
        jsonb_agg(tenant_id::text order by tenant_id),
        '[]'::jsonb
      )
      into v_oauth_tenant_json
      from app.oauth_client_tenant_grants
      where user_id = v_user_id
        and oauth_client_id = v_oauth_client_id;

      if v_grant_tenants is not null and cardinality(v_grant_tenants) > 0 then
        v_claims := v_claims
          || jsonb_build_object('tenant_id', v_grant_tenants[1]::text)
          || jsonb_build_object('oauth_tenant_ids', v_oauth_tenant_json);
        event := event || jsonb_build_object('claims', v_claims);
      end if;

      return event;
    end if;

    select (raw_user_meta_data->>'current_tenant_id')::uuid
    into v_tenant_id
    from auth.users
    where id = v_user_id;

    if v_tenant_id is not null then
      if exists (
        select 1
        from app.tenant_memberships
        where user_id = v_user_id
          and tenant_id = v_tenant_id
      ) then
        v_claims := v_claims || jsonb_build_object('tenant_id', v_tenant_id::text);
        event := event || jsonb_build_object('claims', v_claims);
      end if;
    end if;

    return event;
  exception
    when others then
      return event;
  end;
end;
$$;

comment on function authz.custom_access_token_hook(jsonb) is
  'Adds tenant_id to JWT: for OAuth (event.client_id set), from app.oauth_client_tenant_grants plus oauth_tenant_ids array; otherwise from user_metadata current_tenant_id as before.';

alter function authz.custom_access_token_hook(jsonb) owner to postgres;

grant execute on function authz.custom_access_token_hook(jsonb) to supabase_auth_admin;
