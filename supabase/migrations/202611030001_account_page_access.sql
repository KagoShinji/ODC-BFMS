-- Role-based pages with one optional override per account and barangay.
-- Apply after 202611020001_cash_advances.sql. Financial action roles are unchanged.
begin;

create or replace function public.valid_page_selection(p_pages text[])
returns boolean language sql immutable set search_path = '' as $$
  select p_pages is not null
    and array_ndims(p_pages) is not distinct from case when cardinality(p_pages) = 0 then null else 1 end
    and cardinality(p_pages) <= 14
    and array_position(p_pages, null) is null
    and p_pages <@ array['dashboard','budget','spending','procurement','payroll','recurring',
      'travel','transfer','disbursements','advances','collections','deposits','reports','audit']::text[]
    and cardinality(p_pages) = (select count(distinct page) from unnest(p_pages) page);
$$;

create table public.account_page_access (
  barangay_id uuid not null references public.barangays(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  pages text[] check (pages is null or public.valid_page_selection(pages)),
  version integer not null default 1 check (version > 0),
  updated_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now(),
  primary key (barangay_id, user_id)
);

create or replace function public.default_pages_for_roles(p_roles text[])
returns text[] language sql immutable set search_path = '' as $$
  select coalesce(array_agg(distinct page), '{}'::text[]) from (
    select unnest(case role
      when 'admin' then array['dashboard','budget','spending','procurement','payroll','recurring','travel','transfer','disbursements','advances','collections','deposits','reports','audit']
      when 'encoder' then array['dashboard','budget','spending','procurement','payroll','recurring','travel','transfer','disbursements','advances','reports']
      when 'procurement' then array['dashboard','budget','procurement','reports']
      when 'budget' then array['dashboard','budget','spending','disbursements','advances','reports']
      when 'approver' then array['dashboard','budget','spending','disbursements','advances','reports']
      when 'treasurer' then array['dashboard','budget','spending','procurement','payroll','recurring','travel','transfer','disbursements','advances','collections','deposits','reports']
      when 'collector' then array['dashboard','collections','deposits','reports']
      when 'auditor' then array['dashboard','budget','spending','procurement','payroll','recurring','travel','transfer','disbursements','advances','collections','deposits','reports','audit']
      else '{}'::text[] end) page
    from unnest(p_roles) role
  ) selected;
$$;

/** Membership is always required; an override never outlives active access. */
create or replace function public.account_has_page(p_barangay_id uuid, p_page text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare v_roles text[]; v_pages text[];
begin
  if public.is_system_admin() then return true; end if;
  select array_agg(role) into v_roles from public.memberships
    where barangay_id = p_barangay_id and user_id = auth.uid() and active;
  if v_roles is null then return false; end if;
  if p_page = 'settings' then return true; end if;
  if p_page = 'staff' then return 'admin' = any(v_roles); end if;
  if p_page = 'branding' then return false; end if;
  select pages into v_pages from public.account_page_access
    where barangay_id = p_barangay_id and user_id = auth.uid();
  return p_page = any(coalesce(v_pages, public.default_pages_for_roles(v_roles)));
end;
$$;

create or replace function public.account_has_any_page(p_barangay_id uuid, p_pages text[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from unnest(p_pages) page where public.account_has_page(p_barangay_id, page));
$$;

alter table public.account_page_access enable row level security;
revoke all on public.account_page_access from anon, authenticated;
grant select on public.account_page_access to authenticated;
create policy "read own or managed page access" on public.account_page_access
  for select to authenticated using (
    user_id = (select auth.uid()) or public.has_barangay_role(barangay_id, array['admin'])
  );

/** Only super admins may change an administrator's pages; nobody customizes a super admin. */
create or replace function public.can_manage_account_pages(p_barangay_id uuid, p_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select not exists (select 1 from public.system_admins where user_id = p_user_id)
    and exists (select 1 from public.memberships where barangay_id = p_barangay_id and user_id = p_user_id and active)
    and (public.is_system_admin() or (
      public.has_barangay_role(p_barangay_id, array['admin'])
      and not exists (select 1 from public.memberships where barangay_id = p_barangay_id
        and user_id = p_user_id and role = 'admin' and active)
    ));
$$;

create or replace function public.get_staff_page_access(p_barangay_id uuid)
returns table (user_id uuid, pages text[], version integer, is_system_admin boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.has_barangay_role(p_barangay_id, array['admin']) then raise exception 'Not authorized'; end if;
  return query select members.user_id, access.pages, coalesce(access.version, 0),
      exists (select 1 from public.system_admins admins where admins.user_id = members.user_id)
    from (select distinct m.user_id from public.memberships m where m.barangay_id = p_barangay_id) members
    left join public.account_page_access access on access.barangay_id = p_barangay_id and access.user_id = members.user_id;
end;
$$;

/** null restores role defaults; [] explicitly allows only always-available account pages. */
create or replace function public.set_account_page_access(
  p_barangay_id uuid, p_user_id uuid, p_pages text[], p_expected_version integer
) returns void language plpgsql security definer set search_path = '' as $$
declare v_old public.account_page_access%rowtype;
begin
  if not public.can_manage_account_pages(p_barangay_id, p_user_id)
  then raise exception 'You are not allowed to customize pages for this account'; end if;
  if p_pages is not null and not public.valid_page_selection(p_pages)
  then raise exception 'Choose valid pages without duplicates'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_barangay_id::text || ':' || p_user_id::text, 0));
  select * into v_old from public.account_page_access where barangay_id = p_barangay_id and user_id = p_user_id;
  if p_expected_version is null or coalesce(v_old.version, 0) <> p_expected_version
  then raise exception 'Page access changed. Reload the staff list and try again'; end if;
  -- Keep default resets as versioned rows so an old editor cannot overwrite a later reset.
  insert into public.account_page_access (barangay_id, user_id, pages, version, updated_by)
    values (p_barangay_id, p_user_id, p_pages, coalesce(v_old.version, 0) + 1, auth.uid())
    on conflict (barangay_id, user_id) do update set pages = excluded.pages,
      version = excluded.version, updated_by = excluded.updated_by, updated_at = now();
  insert into public.audit_events (barangay_id, actor_id, action, subject_type, subject_id, detail)
  values (p_barangay_id, auth.uid(), 'Account pages updated', 'account_page_access', p_user_id,
    jsonb_build_object('previous_pages', v_old.pages, 'pages', p_pages, 'role_defaults', p_pages is null));
end;
$$;

/** Grant membership and optional custom pages together, so failed page saves roll back the grant. */
create or replace function public.grant_staff_access(
  p_barangay_id uuid, p_user_id uuid, p_role text,
  p_set_pages boolean default false, p_pages text[] default null, p_expected_page_version integer default 0
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.can_manage_staff(p_barangay_id, p_role) then raise exception 'Not authorized to assign this role'; end if;
  insert into public.memberships (barangay_id, user_id, role, active, created_by)
    values (p_barangay_id, p_user_id, p_role, true, auth.uid());
  if p_set_pages then
    perform public.set_account_page_access(p_barangay_id, p_user_id, p_pages, p_expected_page_version);
  end if;
end;
$$;

-- RLS uses page permissions as well as the barangay boundary. Read dependencies
-- support forms/matching without granting their parent page or financial actions.
drop policy "read assigned budget" on public.budget_lines;
create policy "read assigned budget" on public.budget_lines for select to authenticated using (
  public.account_has_any_page(barangay_id, array['budget','spending','procurement','payroll','recurring','travel','transfer','disbursements'])
);
drop policy "read assigned cases" on public.expense_cases;
create policy "read assigned cases" on public.expense_cases for select to authenticated using (
  public.account_has_page(barangay_id, 'spending') or public.account_has_page(barangay_id, kind)
  or public.account_has_page(barangay_id, 'disbursements')
);
drop policy "read assigned vouchers" on public.vouchers;
create policy "read assigned vouchers" on public.vouchers for select to authenticated using (
  public.account_has_page(barangay_id, 'disbursements')
  or (kind = 'travel' and status = 'paid' and public.account_has_page(barangay_id, 'advances'))
);
drop policy "read assigned collections" on public.collections;
create policy "read assigned collections" on public.collections for select to authenticated using (
  public.account_has_any_page(barangay_id, array['collections','deposits'])
);
drop policy "read assigned deposits" on public.deposits;
create policy "read assigned deposits" on public.deposits for select to authenticated using (
  public.account_has_any_page(barangay_id, array['collections','deposits'])
);
drop policy "read assigned allocations" on public.deposit_allocations;
create policy "read assigned allocations" on public.deposit_allocations for select to authenticated using (
  public.account_has_any_page(barangay_id, array['collections','deposits'])
);
drop policy "read assigned cash advances" on public.cash_advances;
create policy "read assigned cash advances" on public.cash_advances for select to authenticated using (
  public.account_has_page(barangay_id, 'advances')
);
drop policy "read assigned liquidations" on public.liquidation_entries;
create policy "read assigned liquidations" on public.liquidation_entries for select to authenticated using (
  public.account_has_page(barangay_id, 'advances')
);
drop policy "read assigned cashbook" on public.cashbook_entries;
create policy "read assigned cashbook" on public.cashbook_entries for select to authenticated using (
  public.account_has_any_page(barangay_id, array['collections','deposits','disbursements','advances'])
);
drop policy "read assigned audit" on public.audit_events;
create policy "read assigned audit" on public.audit_events for select to authenticated using (
  public.account_has_page(barangay_id, 'audit')
);

-- Existing financial RPCs retain their role checks, with an additional page gate
-- on the records they mutate. Calling an RPC directly cannot bypass an unchecked page.
create or replace function public.enforce_finance_page_access()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_allowed boolean;
begin
  if auth.uid() is null then return new; end if;
  if tg_table_name = 'budget_lines' then v_allowed := public.account_has_page(new.barangay_id, 'budget');
  elsif tg_table_name = 'expense_cases' then
    v_allowed := public.account_has_page(new.barangay_id, 'spending') or public.account_has_page(new.barangay_id, new.kind);
  elsif tg_table_name = 'vouchers' then v_allowed := public.account_has_page(new.barangay_id, 'disbursements');
  elsif tg_table_name in ('cash_advances','liquidation_entries') then v_allowed := public.account_has_page(new.barangay_id, 'advances');
  elsif tg_table_name = 'collections' then v_allowed := public.account_has_page(new.barangay_id, 'collections');
  elsif tg_table_name in ('deposits','deposit_allocations') then v_allowed := public.account_has_page(new.barangay_id, 'deposits');
  else v_allowed := false;
  end if;
  if not coalesce(v_allowed, false) then raise exception 'This account cannot access this financial page'; end if;
  return new;
end;
$$;

do $$
declare v_table text;
begin
  foreach v_table in array array['budget_lines','expense_cases','vouchers','cash_advances','liquidation_entries','collections','deposits','deposit_allocations']
  loop
    execute format('create trigger enforce_finance_page_access before insert or update on public.%I for each row execute function public.enforce_finance_page_access()', v_table);
  end loop;
end;
$$;

revoke all on function public.valid_page_selection(text[]), public.default_pages_for_roles(text[]),
  public.account_has_page(uuid,text), public.account_has_any_page(uuid,text[]),
  public.can_manage_account_pages(uuid,uuid), public.get_staff_page_access(uuid),
  public.set_account_page_access(uuid,uuid,text[],integer), public.grant_staff_access(uuid,uuid,text,boolean,text[],integer),
  public.enforce_finance_page_access() from public, anon;
grant execute on function public.valid_page_selection(text[]), public.default_pages_for_roles(text[]),
  public.account_has_page(uuid,text), public.account_has_any_page(uuid,text[]),
  public.can_manage_account_pages(uuid,uuid), public.get_staff_page_access(uuid),
  public.set_account_page_access(uuid,uuid,text[],integer), public.grant_staff_access(uuid,uuid,text,boolean,text[],integer)
  to authenticated;

commit;
