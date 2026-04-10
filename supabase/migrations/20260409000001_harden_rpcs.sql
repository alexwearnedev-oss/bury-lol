-- Harden SECURITY DEFINER RPCs created in 20260409000000.
-- 1. Restrict EXECUTE to service_role only — prevents anon key abuse via direct RPC calls.
-- 2. Add SET search_path = public — prevents search_path injection by callers.

revoke execute on function increment_visit_count(text) from public;
revoke execute on function increment_report_count(text) from public;

grant execute on function increment_visit_count(text) to service_role;
grant execute on function increment_report_count(text) to service_role;

-- Recreate both functions with search_path pinned.
create or replace function increment_visit_count(grave_share_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update graves
  set visit_count = visit_count + 1
  where share_token = grave_share_token;
end;
$$;

create or replace function increment_report_count(token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update graves
  set report_count = report_count + 1
  where share_token = token;
end;
$$;
