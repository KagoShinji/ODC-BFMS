-- Barangay Financial Management System by ODC
-- Initial live schema for the budget -> voucher -> payment and receipt -> deposit slices.
-- Apply to an isolated Supabase project and run role/transaction checks before use.

create table if not exists public.barangays (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.memberships (
  user_id uuid not null references auth.users(id) on delete cascade,
  barangay_id uuid not null references public.barangays(id) on delete cascade,
  role text not null check (role in ('admin','encoder','procurement','budget','approver','treasurer','collector','auditor')),
  active boolean not null default true,
  primary key (user_id, barangay_id, role)
);
create index if not exists memberships_barangay_active_idx on public.memberships (barangay_id, active);

create table if not exists public.budget_lines (
  id uuid primary key default gen_random_uuid(),
  barangay_id uuid not null references public.barangays(id),
  fiscal_year integer not null check (fiscal_year between 2000 and 2100),
  fund text not null default 'General Fund',
  code text not null,
  name text not null,
  category text not null,
  appropriation numeric(18,2) not null check (appropriation >= 0),
  created_at timestamptz not null default now(),
  unique (id, barangay_id),
  unique (barangay_id, fiscal_year, fund, code)
);

create table if not exists public.document_sequences (
  barangay_id uuid not null references public.barangays(id),
  fiscal_year integer not null,
  kind text not null,
  last_value integer not null check (last_value > 0),
  primary key (barangay_id, fiscal_year, kind)
);

create table if not exists public.expense_cases (
  id uuid primary key default gen_random_uuid(),
  barangay_id uuid not null references public.barangays(id),
  reference text not null,
  kind text not null check (kind in ('procurement','payroll','recurring','travel','transfer')),
  step text not null check (step in ('PR','RFQ','PO','AIR','Ready for DV')),
  purpose text not null,
  payee text not null,
  budget_line_id uuid not null,
  amount numeric(18,2) not null check (amount > 0),
  business_date date not null default (now() at time zone 'Asia/Manila')::date,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (id, barangay_id),
  unique (barangay_id, reference),
  foreign key (budget_line_id, barangay_id) references public.budget_lines(id, barangay_id)
);

create table if not exists public.vouchers (
  id uuid primary key default gen_random_uuid(),
  barangay_id uuid not null references public.barangays(id),
  number text not null,
  source_case_id uuid not null,
  kind text not null,
  payee text not null,
  purpose text not null,
  budget_line_id uuid not null,
  amount numeric(18,2) not null check (amount > 0),
  status text not null default 'draft' check (status in ('draft','submitted','approved','paid','rejected')),
  business_date date not null default (now() at time zone 'Asia/Manila')::date,
  created_by uuid not null references auth.users(id),
  approved_by uuid references auth.users(id),
  paid_by uuid references auth.users(id),
  payment_reference text,
  paid_at timestamptz,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  unique (id, barangay_id),
  unique (barangay_id, number),
  unique (barangay_id, source_case_id),
  foreign key (source_case_id, barangay_id) references public.expense_cases(id, barangay_id),
  foreign key (budget_line_id, barangay_id) references public.budget_lines(id, barangay_id)
);
create unique index if not exists vouchers_payment_reference_unique on public.vouchers (barangay_id, payment_reference) where payment_reference is not null;
create index if not exists vouchers_barangay_status_date_idx on public.vouchers (barangay_id, status, business_date desc);

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  barangay_id uuid not null references public.barangays(id),
  receipt_number text not null,
  payer text not null,
  purpose text not null,
  revenue_category text not null,
  amount numeric(18,2) not null check (amount > 0),
  business_date date not null default (now() at time zone 'Asia/Manila')::date,
  status text not null default 'issued' check (status in ('issued','voided')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (id, barangay_id),
  unique (barangay_id, receipt_number)
);
create index if not exists collections_barangay_date_idx on public.collections (barangay_id, business_date desc);

create table if not exists public.deposits (
  id uuid primary key default gen_random_uuid(),
  barangay_id uuid not null references public.barangays(id),
  number text not null,
  kind text not null default 'deposit' check (kind in ('deposit','remittance')),
  bank text not null,
  reference text not null,
  amount numeric(18,2) not null check (amount > 0),
  business_date date not null default (now() at time zone 'Asia/Manila')::date,
  status text not null default 'confirmed' check (status in ('confirmed')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (id, barangay_id),
  unique (barangay_id, number),
  unique (barangay_id, reference)
);

create table if not exists public.deposit_allocations (
  deposit_id uuid not null,
  collection_id uuid not null,
  barangay_id uuid not null,
  amount numeric(18,2) not null check (amount > 0),
  primary key (deposit_id, collection_id),
  foreign key (deposit_id, barangay_id) references public.deposits(id, barangay_id),
  foreign key (collection_id, barangay_id) references public.collections(id, barangay_id)
);
create index if not exists deposit_allocations_collection_idx on public.deposit_allocations (collection_id);

create table if not exists public.cashbook_entries (
  id uuid primary key default gen_random_uuid(),
  barangay_id uuid not null references public.barangays(id),
  business_date date not null,
  source_type text not null check (source_type in ('collection','deposit','payment')),
  source_id uuid not null,
  account text not null check (account in ('cash','bank')),
  amount numeric(18,2) not null check (amount <> 0),
  created_at timestamptz not null default now(),
  unique (source_type, source_id, account)
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  barangay_id uuid not null references public.barangays(id),
  actor_id uuid not null references auth.users(id),
  action text not null,
  subject_type text not null,
  subject_id uuid not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_events_barangay_created_idx on public.audit_events (barangay_id, created_at desc);

create or replace function public.has_barangay_role(p_barangay_id uuid, p_roles text[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    where m.user_id = (select auth.uid())
      and m.barangay_id = p_barangay_id
      and m.active
      and m.role = any(p_roles)
  );
$$;
revoke all on function public.has_barangay_role(uuid, text[]) from public;
grant execute on function public.has_barangay_role(uuid, text[]) to authenticated;

alter table public.barangays enable row level security;
alter table public.memberships enable row level security;
alter table public.budget_lines enable row level security;
alter table public.document_sequences enable row level security;
alter table public.expense_cases enable row level security;
alter table public.vouchers enable row level security;
alter table public.collections enable row level security;
alter table public.deposits enable row level security;
alter table public.deposit_allocations enable row level security;
alter table public.cashbook_entries enable row level security;
alter table public.audit_events enable row level security;

create policy "read assigned barangays" on public.barangays for select to authenticated using (public.has_barangay_role(id, array['admin','encoder','procurement','budget','approver','treasurer','collector','auditor']));
create policy "read own memberships" on public.memberships for select to authenticated using (user_id = (select auth.uid()));
create policy "read assigned budget" on public.budget_lines for select to authenticated using (public.has_barangay_role(barangay_id, array['admin','encoder','procurement','budget','approver','treasurer','collector','auditor']));
create policy "read assigned cases" on public.expense_cases for select to authenticated using (public.has_barangay_role(barangay_id, array['admin','encoder','procurement','budget','approver','treasurer','auditor']));
create policy "read assigned vouchers" on public.vouchers for select to authenticated using (public.has_barangay_role(barangay_id, array['admin','encoder','budget','approver','treasurer','auditor']));
create policy "read assigned collections" on public.collections for select to authenticated using (public.has_barangay_role(barangay_id, array['admin','collector','treasurer','auditor']));
create policy "read assigned deposits" on public.deposits for select to authenticated using (public.has_barangay_role(barangay_id, array['admin','collector','treasurer','auditor']));
create policy "read assigned allocations" on public.deposit_allocations for select to authenticated using (public.has_barangay_role(barangay_id, array['admin','collector','treasurer','auditor']));
create policy "read assigned cashbook" on public.cashbook_entries for select to authenticated using (public.has_barangay_role(barangay_id, array['admin','budget','treasurer','auditor']));
create policy "read assigned audit" on public.audit_events for select to authenticated using (public.has_barangay_role(barangay_id, array['admin','auditor']));

revoke all on public.barangays, public.memberships, public.budget_lines, public.document_sequences, public.expense_cases, public.vouchers, public.collections, public.deposits, public.deposit_allocations, public.cashbook_entries, public.audit_events from anon, authenticated;
grant select on public.barangays, public.memberships, public.budget_lines, public.expense_cases, public.vouchers, public.collections, public.deposits, public.deposit_allocations, public.cashbook_entries, public.audit_events to authenticated;

create or replace function public.next_document_number(p_barangay_id uuid, p_kind text, p_year integer)
returns text language plpgsql security definer set search_path = '' as $$
declare v_next integer;
begin
  insert into public.document_sequences (barangay_id, fiscal_year, kind, last_value)
  values (p_barangay_id, p_year, p_kind, 1)
  on conflict (barangay_id, fiscal_year, kind)
  do update set last_value = public.document_sequences.last_value + 1
  returning last_value into v_next;
  return p_kind || '-' || p_year::text || '-' || lpad(v_next::text, 3, '0');
end;
$$;
revoke all on function public.next_document_number(uuid, text, integer) from public, anon, authenticated;

create or replace function public.create_expense_case(
  p_barangay_id uuid, p_kind text, p_purpose text, p_payee text, p_budget_line_id uuid, p_amount numeric
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_reference text; v_year integer := extract(year from now() at time zone 'Asia/Manila')::integer; v_prefix text;
begin
  if not public.has_barangay_role(p_barangay_id, array['encoder','procurement','treasurer']) then raise exception 'Not authorized to create an expense case'; end if;
  if p_kind not in ('procurement','payroll','recurring','travel','transfer') or p_amount is null or p_amount <= 0 or p_amount <> round(p_amount,2) or nullif(trim(p_purpose),'') is null or nullif(trim(p_payee),'') is null then raise exception 'Invalid expense case'; end if;
  if not exists (select 1 from public.budget_lines where id = p_budget_line_id and barangay_id = p_barangay_id and fiscal_year = v_year) then raise exception 'Budget line is unavailable'; end if;
  v_prefix := case p_kind when 'procurement' then 'PR' when 'payroll' then 'PAY' when 'recurring' then 'BILL' when 'travel' then 'TO' else 'SK' end;
  v_reference := public.next_document_number(p_barangay_id, v_prefix, v_year);
  insert into public.expense_cases (barangay_id, reference, kind, step, purpose, payee, budget_line_id, amount, created_by)
  values (p_barangay_id, v_reference, p_kind, case when p_kind = 'procurement' then 'PR' else 'Ready for DV' end, trim(p_purpose), trim(p_payee), p_budget_line_id, p_amount, auth.uid()) returning id into v_id;
  insert into public.audit_events (barangay_id, actor_id, action, subject_type, subject_id) values (p_barangay_id, auth.uid(), 'expense_case_created', 'expense_case', v_id);
  return v_id;
end;
$$;

create or replace function public.create_voucher(p_case_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_case public.expense_cases%rowtype; v_id uuid; v_number text;
begin
  select * into v_case from public.expense_cases where id = p_case_id for update;
  if not found then raise exception 'Expense case not found'; end if;
  if not public.has_barangay_role(v_case.barangay_id, array['encoder','procurement','treasurer']) then raise exception 'Not authorized'; end if;
  if v_case.step <> 'Ready for DV' then raise exception 'Source documents are incomplete'; end if;
  if exists (select 1 from public.vouchers where source_case_id = p_case_id) then raise exception 'A voucher already exists for this source'; end if;
  v_number := public.next_document_number(v_case.barangay_id, 'DV', extract(year from v_case.business_date)::integer);
  insert into public.vouchers (barangay_id, number, source_case_id, kind, payee, purpose, budget_line_id, amount, created_by)
  values (v_case.barangay_id, v_number, v_case.id, v_case.kind, v_case.payee, v_case.purpose, v_case.budget_line_id, v_case.amount, auth.uid()) returning id into v_id;
  insert into public.audit_events (barangay_id, actor_id, action, subject_type, subject_id) values (v_case.barangay_id, auth.uid(), 'voucher_created', 'voucher', v_id);
  return v_id;
end;
$$;

create or replace function public.submit_voucher(p_voucher_id uuid, p_expected_version integer)
returns void language plpgsql security definer set search_path = '' as $$
declare v_voucher public.vouchers%rowtype; v_budget public.budget_lines%rowtype; v_committed numeric(18,2);
begin
  select * into v_voucher from public.vouchers where id = p_voucher_id for update;
  if not found then raise exception 'Voucher not found'; end if;
  if not public.has_barangay_role(v_voucher.barangay_id, array['encoder','treasurer']) then raise exception 'Not authorized'; end if;
  if v_voucher.status <> 'draft' or v_voucher.version <> p_expected_version then raise exception 'Voucher state or version changed'; end if;
  select * into v_budget from public.budget_lines where id = v_voucher.budget_line_id for update;
  select coalesce(sum(amount),0) into v_committed from public.vouchers
    where budget_line_id = v_budget.id and status in ('submitted','approved','paid');
  if v_committed + v_voucher.amount > v_budget.appropriation then raise exception 'Insufficient appropriation'; end if;
  update public.vouchers set status = 'submitted', version = version + 1 where id = p_voucher_id;
  insert into public.audit_events (barangay_id, actor_id, action, subject_type, subject_id) values (v_voucher.barangay_id, auth.uid(), 'voucher_submitted', 'voucher', p_voucher_id);
end;
$$;

create or replace function public.approve_voucher(p_voucher_id uuid, p_expected_version integer)
returns void language plpgsql security definer set search_path = '' as $$
declare v_voucher public.vouchers%rowtype;
begin
  select * into v_voucher from public.vouchers where id = p_voucher_id for update;
  if not found then raise exception 'Voucher not found'; end if;
  if not public.has_barangay_role(v_voucher.barangay_id, array['approver']) or v_voucher.created_by = auth.uid() then raise exception 'Approval is not authorized'; end if;
  if v_voucher.status <> 'submitted' or v_voucher.version <> p_expected_version then raise exception 'Voucher state or version changed'; end if;
  update public.vouchers set status = 'approved', approved_by = auth.uid(), version = version + 1 where id = p_voucher_id;
  insert into public.audit_events (barangay_id, actor_id, action, subject_type, subject_id) values (v_voucher.barangay_id, auth.uid(), 'voucher_approved', 'voucher', p_voucher_id);
end;
$$;

create or replace function public.record_payment(p_voucher_id uuid, p_expected_version integer, p_reference text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_voucher public.vouchers%rowtype; v_date date := (now() at time zone 'Asia/Manila')::date;
begin
  select * into v_voucher from public.vouchers where id = p_voucher_id for update;
  if not found then raise exception 'Voucher not found'; end if;
  if not public.has_barangay_role(v_voucher.barangay_id, array['treasurer']) then raise exception 'Not authorized'; end if;
  if v_voucher.status <> 'approved' or v_voucher.version <> p_expected_version or nullif(trim(p_reference),'') is null then raise exception 'Invalid payment request'; end if;
  update public.vouchers set status = 'paid', paid_by = auth.uid(), paid_at = now(), payment_reference = trim(p_reference), version = version + 1 where id = p_voucher_id;
  insert into public.cashbook_entries (barangay_id, business_date, source_type, source_id, account, amount)
  values (v_voucher.barangay_id, v_date, 'payment', p_voucher_id, 'bank', -v_voucher.amount);
  insert into public.audit_events (barangay_id, actor_id, action, subject_type, subject_id, detail) values (v_voucher.barangay_id, auth.uid(), 'payment_recorded', 'voucher', p_voucher_id, jsonb_build_object('reference', trim(p_reference)));
end;
$$;

create or replace function public.issue_collection(p_barangay_id uuid, p_payer text, p_purpose text, p_category text, p_amount numeric)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_number text; v_date date := (now() at time zone 'Asia/Manila')::date;
begin
  if not public.has_barangay_role(p_barangay_id, array['collector','treasurer']) then raise exception 'Not authorized'; end if;
  if nullif(trim(p_payer),'') is null or nullif(trim(p_purpose),'') is null or nullif(trim(p_category),'') is null or p_amount is null or p_amount <= 0 or p_amount <> round(p_amount,2) then raise exception 'Invalid collection'; end if;
  v_number := public.next_document_number(p_barangay_id, 'OR', extract(year from v_date)::integer);
  insert into public.collections (barangay_id, receipt_number, payer, purpose, revenue_category, amount, created_by)
  values (p_barangay_id, v_number, trim(p_payer), trim(p_purpose), trim(p_category), p_amount, auth.uid()) returning id into v_id;
  insert into public.cashbook_entries (barangay_id, business_date, source_type, source_id, account, amount)
  values (p_barangay_id, v_date, 'collection', v_id, 'cash', p_amount);
  insert into public.audit_events (barangay_id, actor_id, action, subject_type, subject_id) values (p_barangay_id, auth.uid(), 'receipt_issued', 'collection', v_id);
  return v_id;
end;
$$;

create or replace function public.confirm_deposit(p_barangay_id uuid, p_bank text, p_reference text, p_allocations jsonb, p_kind text default 'deposit')
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_number text; v_total numeric(18,2) := 0; v_item jsonb; v_collection public.collections%rowtype; v_amount numeric(18,2); v_allocated numeric(18,2); v_seen uuid[] := '{}'; v_date date := (now() at time zone 'Asia/Manila')::date;
begin
  if not public.has_barangay_role(p_barangay_id, array['treasurer']) then raise exception 'Not authorized'; end if;
  if p_kind not in ('deposit','remittance') or nullif(trim(p_bank),'') is null or nullif(trim(p_reference),'') is null or jsonb_typeof(p_allocations) <> 'array' or jsonb_array_length(p_allocations) = 0 then raise exception 'Invalid deposit or remittance'; end if;
  -- Lock receipts in input order; callers should supply sorted IDs to reduce deadlock retries.
  for v_item in select value from jsonb_array_elements(p_allocations) loop
    select * into v_collection from public.collections where id = (v_item->>'collection_id')::uuid and barangay_id = p_barangay_id for update;
    if not found or v_collection.status <> 'issued' then raise exception 'Receipt unavailable'; end if;
    if v_collection.id = any(v_seen) then raise exception 'Duplicate receipt allocation'; end if;
    v_seen := array_append(v_seen, v_collection.id);
    v_amount := (v_item->>'amount')::numeric;
    if v_amount is null or v_amount <= 0 or v_amount <> round(v_amount,2) then raise exception 'Invalid allocation amount'; end if;
    select coalesce(sum(amount),0) into v_allocated from public.deposit_allocations where collection_id = v_collection.id;
    if v_allocated + v_amount > v_collection.amount then raise exception 'Allocation exceeds remaining receipt balance'; end if;
    v_total := v_total + v_amount;
  end loop;
  v_number := public.next_document_number(p_barangay_id, case when p_kind = 'deposit' then 'DEP' else 'REM' end, extract(year from v_date)::integer);
  insert into public.deposits (barangay_id, number, kind, bank, reference, amount, created_by)
  values (p_barangay_id, v_number, p_kind, trim(p_bank), trim(p_reference), v_total, auth.uid()) returning id into v_id;
  for v_item in select value from jsonb_array_elements(p_allocations) loop
    insert into public.deposit_allocations (deposit_id, collection_id, barangay_id, amount)
    values (v_id, (v_item->>'collection_id')::uuid, p_barangay_id, (v_item->>'amount')::numeric);
  end loop;
  insert into public.cashbook_entries (barangay_id, business_date, source_type, source_id, account, amount)
  values (p_barangay_id, v_date, 'deposit', v_id, 'cash', -v_total);
  if p_kind = 'deposit' then
    insert into public.cashbook_entries (barangay_id, business_date, source_type, source_id, account, amount)
    values (p_barangay_id, v_date, 'deposit', v_id, 'bank', v_total);
  end if;
  insert into public.audit_events (barangay_id, actor_id, action, subject_type, subject_id) values (p_barangay_id, auth.uid(), case when p_kind = 'deposit' then 'deposit_confirmed' else 'remittance_confirmed' end, 'deposit', v_id);
  return v_id;
end;
$$;

revoke all on function public.create_expense_case(uuid,text,text,text,uuid,numeric), public.create_voucher(uuid), public.submit_voucher(uuid,integer), public.approve_voucher(uuid,integer), public.record_payment(uuid,integer,text), public.issue_collection(uuid,text,text,text,numeric), public.confirm_deposit(uuid,text,text,jsonb,text) from public, anon;
grant execute on function public.create_expense_case(uuid,text,text,text,uuid,numeric), public.create_voucher(uuid), public.submit_voucher(uuid,integer), public.approve_voucher(uuid,integer), public.record_payment(uuid,integer,text), public.issue_collection(uuid,text,text,text,numeric), public.confirm_deposit(uuid,text,text,jsonb,text) to authenticated;

insert into storage.buckets (id, name, public) values ('finance-evidence', 'finance-evidence', false)
on conflict (id) do nothing;
create policy "read authorized finance evidence" on storage.objects for select to authenticated
using (bucket_id = 'finance-evidence' and public.has_barangay_role((split_part(name, '/', 1))::uuid, array['admin','budget','approver','treasurer','auditor']));
create policy "upload authorized finance evidence" on storage.objects for insert to authenticated
with check (bucket_id = 'finance-evidence' and public.has_barangay_role((split_part(name, '/', 1))::uuid, array['admin','encoder','procurement','treasurer','collector']));
