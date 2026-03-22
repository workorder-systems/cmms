-- 20260210163000_19_similar_past_fixes_rate_limit.sql
--
-- Purpose
-- -------
-- Add a dedicated rate-limiting RPC for Similar Past Fixes search so that
-- the Edge Function can enforce per-tenant/user limits before calling
-- OpenAI. Uses util.check_rate_limit under the hood with sensible defaults.
--
-- This RPC is a thin wrapper that delegates to util.check_rate_limit_with_config
-- with a fixed operation_type key. Tenant and user are derived from auth
-- context by default parameters.

set check_function_bodies = off;

create or replace function public.rpc_check_similar_past_fixes_rate_limit(
  p_operation_key text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ok boolean;
begin
  /*
    util.check_rate_limit(
      p_operation_type text,
      p_operation_key  text default null,
      p_max_requests   integer default 60,
      p_window_minutes integer default 1,
      p_user_id        uuid default auth.uid(),
      p_tenant_id      uuid default authz.get_current_tenant_id()
    );

    We use fixed defaults here so that Similar Past Fixes search has a
    working rate limit even if no cfg.rate_limit_configs rows have been
    created yet. The function raises an exception when the limit is
    exceeded, so we simply call it and let errors propagate to the caller
    (Edge Function).
  */
  v_ok := util.check_rate_limit(
    'similar_past_fixes_search',
    p_operation_key,
    30, -- max_requests
    1   -- window_minutes
  );
  -- When within limits, v_ok is true and we just return.
  return;
end;
$$;

comment on function public.rpc_check_similar_past_fixes_rate_limit(text) is
  'Rate-limit guard for Similar Past Fixes search. Delegates to util.check_rate_limit using operation_type \"similar_past_fixes_search\" and derives user/tenant from auth context. Raises an error when limits are exceeded.';

revoke all on function public.rpc_check_similar_past_fixes_rate_limit(text) from public;
grant execute on function public.rpc_check_similar_past_fixes_rate_limit(text) to authenticated;

