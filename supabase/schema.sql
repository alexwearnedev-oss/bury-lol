-- bury.lol database schema
-- Run this in the Supabase SQL editor to set up the database.

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- Graves table
create table graves (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),

  -- What is being buried
  subject text not null check (char_length(subject) <= 50),
  epitaph text check (char_length(epitaph) <= 80),
  buried_by text default 'Anonymous' check (char_length(buried_by) <= 30),

  -- Tier
  tier integer not null default 2 check (tier in (1, 2, 3, 4)),
  -- 1 = Shallow ($1), 2 = Proper ($2), 3 = Deluxe ($5), 4 = Mausoleum ($50)

  -- Payment
  stripe_session_id text unique,
  amount_paid integer not null, -- in cents
  paid_at timestamp with time zone,

  -- Moderation
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  moderated_at timestamp with time zone,
  rejection_reason text,

  -- Canvas position (assigned on approval)
  grid_x integer,
  grid_y integer,

  -- Metadata
  ip_hash text,
  share_token text unique default encode(gen_random_bytes(6), 'hex'),

  -- Reporting
  report_count integer default 0
);

-- Stats table (materialised counters — updated via triggers for performance)
create table stats (
  id integer primary key default 1 check (id = 1), -- single-row table
  total_approved integer default 0,
  total_revenue_cents integer default 0,
  last_updated timestamp with time zone default now()
);

insert into stats (id) values (1);

-- Trigger: update stats on grave approval
create or replace function update_stats()
returns trigger as $$
begin
  if NEW.status = 'approved' and OLD.status != 'approved' then
    update stats set
      total_approved = total_approved + 1,
      total_revenue_cents = total_revenue_cents + NEW.amount_paid,
      last_updated = now()
    where id = 1;
  end if;
  return NEW;
end;
$$ language plpgsql;

create trigger on_grave_approved
  after update on graves
  for each row execute function update_stats();

-- Indexes
create index graves_status_idx on graves(status);
create index graves_position_idx on graves(grid_x, grid_y);
create index graves_tier_idx on graves(tier);
create index graves_created_idx on graves(created_at desc);

-- Row Level Security
alter table graves enable row level security;
alter table stats enable row level security;

create policy "Public can read approved graves"
  on graves for select
  using (status = 'approved');

create policy "Public can read stats"
  on stats for select
  using (true);

-- No public writes — all writes via service role in API routes only
