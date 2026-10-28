-- White labeling (super admins only) and staff management (super admins and
-- barangay administrators). Apply after 202610290001_system_admins.sql.

begin;

-- White-label settings: a single row, readable before sign-in so the login page
-- can show it, and changeable only by system administrators.
create table if not exists public.app_branding (
  id boolean primary key default true check (id),
  app_name text not null default 'Barangay Financial Management System'
    check (char_length(app_name) between 1 and 80),
  organization_name text not null default 'ODC' check (char_length(organization_name) <= 40),
  mark_text text not null default 'ODC' check (char_length(mark_text) between 1 and 4),
  logo_url text not null default ''
    check (logo_url = '' or (logo_url ~ '^https://' and char_length(logo_url) <= 500)),
  accent_color text not null default '#f56618' check (accent_color ~ '^#[0-9a-f]{6}$'),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
insert into public.app_branding (id) values (true) on conflict (id) do nothing;

alter table public.app_branding enable row level security;
revoke all on public.app_branding from anon, authenticated;
grant select on public.app_branding to anon, authenticated;
grant update (app_name, organization_name, mark_text, logo_url, accent_color)
  on public.app_branding to authenticated;

create policy "anyone reads branding" on public.app_branding
  for select to anon, authenticated using (true);
create policy "system administrators update branding" on public.app_branding
  for update to authenticated
  using (public.is_system_admin()) with check (public.is_system_admin());

create or replace function public.stamp_app_branding()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_by := auth.uid();
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists stamp_app_branding on public.app_branding;
create trigger stamp_app_branding before update on public.app_branding
  for each row execute function public.stamp_app_branding();

-- Staff profiles hold the name and email shown in staff management. Rows are
-- created by the server with the secret key when an account is added.
create table if not exists public.staff_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 1 and 120),
  email text not null check (email = lower(email)),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index if not exists staff_profiles_email_idx on public.staff_profiles (email);

alter table public.memberships
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists created_by uuid references auth.users(id) on delete set null
    default auth.uid();

-- Super admins manage every role. Barangay admins manage non-admin roles in
-- their own barangay; only super admins grant or revoke the admin role.
create or replace function public.can_manage_staff(p_barangay_id uuid, p_role text)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_system_admin()
    or (p_role <> 'admin' and public.has_barangay_role(p_barangay_id, array['admin']));
$$;
revoke all on function public.can_manage_staff(uuid, text) from public, anon;
grant execute on function public.can_manage_staff(uuid, text) to authenticated;

alter table public.staff_profiles enable row level security;
revoke all on public.staff_profiles from anon, authenticated;
grant select on public.staff_profiles to authenticated;

create policy "read own staff profile" on public.staff_profiles
  for select to authenticated using (user_id = (select auth.uid()));
create policy "system administrators read staff profiles" on public.staff_profiles
  for select to authenticated using (public.is_system_admin());
create policy "barangay administrators read their staff profiles" on public.staff_profiles
  for select to authenticated using (
    exists (
      select 1 from public.memberships m
      where m.user_id = staff_profiles.user_id
        and public.has_barangay_role(m.barangay_id, array['admin'])
    )
  );

create policy "barangay administrators read memberships" on public.memberships
  for select to authenticated using (public.has_barangay_role(barangay_id, array['admin']));
grant insert (user_id, barangay_id, role, active) on public.memberships to authenticated;
grant update (active) on public.memberships to authenticated;
create policy "staff managers add memberships" on public.memberships
  for insert to authenticated with check (public.can_manage_staff(barangay_id, role));
create policy "staff managers change memberships" on public.memberships
  for update to authenticated
  using (public.can_manage_staff(barangay_id, role))
  with check (public.can_manage_staff(barangay_id, role));

-- System administrators create barangays so they can assign the first admin.
grant insert (name) on public.barangays to authenticated;
create policy "system administrators add barangays" on public.barangays
  for insert to authenticated with check (public.is_system_admin());

-- Record staff access changes made with a signed-in session in the audit trail.
create or replace function public.audit_membership_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_action text;
begin
  if auth.uid() is null then return new; end if;
  if tg_op = 'INSERT' then
    v_action := 'Staff role granted';
  elsif new.active is distinct from old.active then
    v_action := case when new.active then 'Staff access restored' else 'Staff access deactivated' end;
  else
    return new;
  end if;
  insert into public.audit_events (barangay_id, actor_id, action, subject_type, subject_id, detail)
  values (new.barangay_id, auth.uid(), v_action, 'membership', new.user_id,
          jsonb_build_object('role', new.role));
  return new;
end;
$$;
drop trigger if exists audit_membership_change on public.memberships;
create trigger audit_membership_change after insert or update on public.memberships
  for each row execute function public.audit_membership_change();

commit;
