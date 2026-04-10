-- Migration: add icon and visit_count columns + atomic RPC functions
-- These columns/functions are referenced by app code but were absent from
-- the original schema, causing potential runtime failures on grave pages,
-- the stats page, and the report endpoint.

-- 1. Add missing columns
alter table graves
  add column if not exists icon text,
  add column if not exists visit_count integer not null default 0;

-- Existing rows automatically receive: icon = NULL, visit_count = 0.
-- No manual backfill required.

-- 2. Index for leaderboard query (stats page ORDER BY visit_count DESC)
create index if not exists graves_visit_count_idx on graves(visit_count desc);

-- 3. RPC: increment_visit_count
--    Called fire-and-forget by /grave/[shareToken] on each page view.
--    SECURITY DEFINER allows the update to bypass RLS regardless of caller role.
create or replace function increment_visit_count(grave_share_token text)
returns void
language plpgsql
security definer
as $$
begin
  update graves
  set visit_count = visit_count + 1
  where share_token = grave_share_token;
end;
$$;

-- 4. RPC: increment_report_count
--    Called by /api/report to atomically increment report_count.
--    Replaces the read-modify-write fallback in the route handler.
create or replace function increment_report_count(token text)
returns void
language plpgsql
security definer
as $$
begin
  update graves
  set report_count = report_count + 1
  where share_token = token;
end;
$$;
