-- Periodic keepalive heartbeat table written by scheduled automation to prevent
-- free-tier Supabase project pausing due to inactivity. Apply after
-- 202611060001_finance_request_idempotency.sql.
begin;

create table if not exists public.supabase_keepalive (
  id text primary key check (char_length(id) between 1 and 64),
  source text not null default 'github-actions' check (char_length(source) between 1 and 120),
  ping_count bigint not null default 1 check (ping_count >= 1),
  last_ping_at timestamptz not null default now()
);

alter table public.supabase_keepalive enable row level security;
revoke all on public.supabase_keepalive from public, anon, authenticated;
grant all on public.supabase_keepalive to service_role;

commit;
