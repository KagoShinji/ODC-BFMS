-- Global system administrators can inspect all barangays. They do not gain
-- financial posting or approval permissions.

begin;

create table if not exists public.system_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.system_admins enable row level security;
revoke all on public.system_admins from anon, authenticated;
grant select on public.system_admins to authenticated;

create policy "read own system administrator status" on public.system_admins
  for select to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.is_system_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.system_admins
    where user_id = (select auth.uid())
  );
$$;
revoke all on function public.is_system_admin() from public, anon;
grant execute on function public.is_system_admin() to authenticated;

-- Read access is global for system administrators. Financial writes still use
-- the barangay role checks in the original migration.
create policy "system administrators read barangays" on public.barangays
  for select to authenticated using (public.is_system_admin());
create policy "system administrators read memberships" on public.memberships
  for select to authenticated using (public.is_system_admin());
create policy "system administrators read budget lines" on public.budget_lines
  for select to authenticated using (public.is_system_admin());
create policy "system administrators read expense cases" on public.expense_cases
  for select to authenticated using (public.is_system_admin());
create policy "system administrators read vouchers" on public.vouchers
  for select to authenticated using (public.is_system_admin());
create policy "system administrators read collections" on public.collections
  for select to authenticated using (public.is_system_admin());
create policy "system administrators read deposits" on public.deposits
  for select to authenticated using (public.is_system_admin());
create policy "system administrators read deposit allocations" on public.deposit_allocations
  for select to authenticated using (public.is_system_admin());
create policy "system administrators read cashbook" on public.cashbook_entries
  for select to authenticated using (public.is_system_admin());
create policy "system administrators read audit" on public.audit_events
  for select to authenticated using (public.is_system_admin());

create policy "system administrators read finance evidence" on storage.objects
  for select to authenticated
  using (bucket_id = 'finance-evidence' and public.is_system_admin());

commit;
