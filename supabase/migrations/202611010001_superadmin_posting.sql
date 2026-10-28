-- Super admins can record transactions in any barangay (for support, testing
-- and fixes), and the remaining workspace actions get database functions.
-- Apply after 202610310001_barangay_branding.sql.

begin;

-- System administrators hold every barangay role. Segregation of duties still
-- applies: approve_voucher refuses the person who created the voucher.
create or replace function public.has_barangay_role(p_barangay_id uuid, p_roles text[])
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_system_admin() or exists (
    select 1 from public.memberships m
    where m.user_id = (select auth.uid())
      and m.barangay_id = p_barangay_id
      and m.active
      and m.role = any(p_roles)
  );
$$;

-- Receipt voids reverse the cash entry with their own source type.
alter table public.cashbook_entries drop constraint if exists cashbook_entries_source_type_check;
alter table public.cashbook_entries add constraint cashbook_entries_source_type_check
  check (source_type in ('collection','deposit','payment','collection_void'));

create or replace function public.add_budget_line(
  p_barangay_id uuid, p_code text, p_name text, p_category text, p_appropriation numeric
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_year integer := extract(year from now() at time zone 'Asia/Manila')::integer;
begin
  if not public.has_barangay_role(p_barangay_id, array['budget']) then raise exception 'Not authorized to add a budget line'; end if;
  if nullif(trim(p_code),'') is null or nullif(trim(p_name),'') is null
     or p_category not in ('Personnel Services','Maintenance & Operations','Capital Outlay','Transfers')
     or p_appropriation is null or p_appropriation <= 0 or p_appropriation <> round(p_appropriation,2)
  then raise exception 'Invalid budget line'; end if;
  if exists (select 1 from public.budget_lines where barangay_id = p_barangay_id and fiscal_year = v_year and lower(code) = lower(trim(p_code)))
  then raise exception 'This budget code already exists'; end if;
  insert into public.budget_lines (barangay_id, fiscal_year, code, name, category, appropriation)
  values (p_barangay_id, v_year, trim(p_code), trim(p_name), p_category, p_appropriation) returning id into v_id;
  insert into public.audit_events (barangay_id, actor_id, action, subject_type, subject_id, detail)
  values (p_barangay_id, auth.uid(), 'budget_line_added', 'budget_line', v_id, jsonb_build_object('code', trim(p_code)));
  return v_id;
end;
$$;

create or replace function public.advance_expense_case(p_case_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare v_case public.expense_cases%rowtype; v_next text;
begin
  select * into v_case from public.expense_cases where id = p_case_id for update;
  if not found then raise exception 'Expense case not found'; end if;
  if not public.has_barangay_role(v_case.barangay_id, array['encoder','procurement']) then raise exception 'Not authorized'; end if;
  if v_case.kind <> 'procurement' or exists (select 1 from public.vouchers where source_case_id = p_case_id)
  then raise exception 'This procurement record cannot advance'; end if;
  v_next := case v_case.step when 'PR' then 'RFQ' when 'RFQ' then 'PO' when 'PO' then 'AIR' when 'AIR' then 'Ready for DV' end;
  if v_next is null then raise exception 'This procurement record is ready for a voucher'; end if;
  update public.expense_cases set step = v_next where id = p_case_id;
  insert into public.audit_events (barangay_id, actor_id, action, subject_type, subject_id, detail)
  values (v_case.barangay_id, auth.uid(), 'procurement_advanced', 'expense_case', p_case_id,
          jsonb_build_object('from', v_case.step, 'to', v_next));
  return v_next;
end;
$$;

create or replace function public.reject_voucher(p_voucher_id uuid, p_expected_version integer)
returns void language plpgsql security definer set search_path = '' as $$
declare v_voucher public.vouchers%rowtype;
begin
  select * into v_voucher from public.vouchers where id = p_voucher_id for update;
  if not found then raise exception 'Voucher not found'; end if;
  if not public.has_barangay_role(v_voucher.barangay_id, array['approver']) then raise exception 'Not authorized'; end if;
  if v_voucher.status <> 'submitted' or v_voucher.version <> p_expected_version then raise exception 'Voucher state or version changed'; end if;
  update public.vouchers set status = 'rejected', version = version + 1 where id = p_voucher_id;
  insert into public.audit_events (barangay_id, actor_id, action, subject_type, subject_id)
  values (v_voucher.barangay_id, auth.uid(), 'voucher_rejected', 'voucher', p_voucher_id);
end;
$$;

create or replace function public.void_collection(p_collection_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_collection public.collections%rowtype; v_date date := (now() at time zone 'Asia/Manila')::date;
begin
  select * into v_collection from public.collections where id = p_collection_id for update;
  if not found then raise exception 'Receipt not found'; end if;
  if not public.has_barangay_role(v_collection.barangay_id, array['collector','treasurer']) then raise exception 'Not authorized'; end if;
  if v_collection.status <> 'issued' then raise exception 'This receipt cannot be voided'; end if;
  if exists (select 1 from public.deposit_allocations where collection_id = p_collection_id)
  then raise exception 'This receipt is linked to a deposit and cannot be voided'; end if;
  update public.collections set status = 'voided' where id = p_collection_id;
  insert into public.cashbook_entries (barangay_id, business_date, source_type, source_id, account, amount)
  values (v_collection.barangay_id, v_date, 'collection_void', p_collection_id, 'cash', -v_collection.amount);
  insert into public.audit_events (barangay_id, actor_id, action, subject_type, subject_id)
  values (v_collection.barangay_id, auth.uid(), 'receipt_voided', 'collection', p_collection_id);
end;
$$;

revoke all on function public.add_budget_line(uuid,text,text,text,numeric), public.advance_expense_case(uuid),
  public.reject_voucher(uuid,integer), public.void_collection(uuid) from public, anon;
grant execute on function public.add_budget_line(uuid,text,text,text,numeric), public.advance_expense_case(uuid),
  public.reject_voucher(uuid,integer), public.void_collection(uuid) to authenticated;

commit;
