-- Cash advances and their liquidation (expenses and refunds) for live records.
-- An advance is opened from a paid travel voucher; expenses and refunds settle
-- it and may not exceed the amount advanced. Refunds return cash.
-- Apply after 202611010001_superadmin_posting.sql.

begin;

create table if not exists public.cash_advances (
  id uuid primary key default gen_random_uuid(),
  barangay_id uuid not null references public.barangays(id),
  voucher_id uuid not null,
  accountable_person text not null,
  amount numeric(18,2) not null check (amount > 0),
  opened_at date not null default (now() at time zone 'Asia/Manila')::date,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (id, barangay_id),
  unique (voucher_id),
  foreign key (voucher_id, barangay_id) references public.vouchers(id, barangay_id)
);
create index if not exists cash_advances_barangay_idx on public.cash_advances (barangay_id, opened_at desc);

create table if not exists public.liquidation_entries (
  id uuid primary key default gen_random_uuid(),
  barangay_id uuid not null,
  advance_id uuid not null,
  kind text not null check (kind in ('expense','refund')),
  description text not null check (char_length(description) between 1 and 200),
  amount numeric(18,2) not null check (amount > 0),
  business_date date not null default (now() at time zone 'Asia/Manila')::date,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  foreign key (advance_id, barangay_id) references public.cash_advances(id, barangay_id)
);
create index if not exists liquidation_entries_advance_idx on public.liquidation_entries (advance_id);

alter table public.cash_advances enable row level security;
alter table public.liquidation_entries enable row level security;
revoke all on public.cash_advances, public.liquidation_entries from anon, authenticated;
grant select on public.cash_advances, public.liquidation_entries to authenticated;

-- Same readers as vouchers. Writes go through the functions below only.
create policy "read assigned cash advances" on public.cash_advances
  for select to authenticated
  using (public.has_barangay_role(barangay_id, array['admin','encoder','budget','approver','treasurer','auditor']));
create policy "read assigned liquidations" on public.liquidation_entries
  for select to authenticated
  using (public.has_barangay_role(barangay_id, array['admin','encoder','budget','approver','treasurer','auditor']));

-- Refunds put cash back in the cashbook.
alter table public.cashbook_entries drop constraint if exists cashbook_entries_source_type_check;
alter table public.cashbook_entries add constraint cashbook_entries_source_type_check
  check (source_type in ('collection','deposit','payment','collection_void','advance_refund'));

create or replace function public.open_cash_advance(p_voucher_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_voucher public.vouchers%rowtype; v_id uuid;
begin
  select * into v_voucher from public.vouchers where id = p_voucher_id for update;
  if not found then raise exception 'Voucher not found'; end if;
  if not public.has_barangay_role(v_voucher.barangay_id, array['treasurer']) then raise exception 'Not authorized'; end if;
  if v_voucher.status <> 'paid' or v_voucher.kind <> 'travel'
  then raise exception 'Choose a paid travel voucher to open a cash advance'; end if;
  if exists (select 1 from public.cash_advances where voucher_id = p_voucher_id)
  then raise exception 'A cash advance is already linked to this voucher'; end if;
  insert into public.cash_advances (barangay_id, voucher_id, accountable_person, amount, created_by)
  values (v_voucher.barangay_id, v_voucher.id, v_voucher.payee, v_voucher.amount, auth.uid())
  returning id into v_id;
  insert into public.audit_events (barangay_id, actor_id, action, subject_type, subject_id, detail)
  values (v_voucher.barangay_id, auth.uid(), 'cash_advance_opened', 'cash_advance', v_id,
          jsonb_build_object('voucher', v_voucher.number, 'accountable', v_voucher.payee));
  return v_id;
end;
$$;

create or replace function public.record_liquidation(
  p_advance_id uuid, p_kind text, p_description text, p_amount numeric
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_advance public.cash_advances%rowtype; v_used numeric(18,2); v_id uuid;
  v_date date := (now() at time zone 'Asia/Manila')::date;
begin
  select * into v_advance from public.cash_advances where id = p_advance_id for update;
  if not found then raise exception 'Cash advance not found'; end if;
  if not public.has_barangay_role(v_advance.barangay_id, array['treasurer']) then raise exception 'Not authorized'; end if;
  if p_kind not in ('expense','refund') or nullif(trim(p_description),'') is null
     or char_length(trim(p_description)) > 200
     or p_amount is null or p_amount <= 0 or p_amount <> round(p_amount,2)
  then raise exception 'Enter a description and valid amount'; end if;
  select coalesce(sum(amount),0) into v_used from public.liquidation_entries where advance_id = p_advance_id;
  if v_used + p_amount > v_advance.amount
  then raise exception 'This entry exceeds the remaining advance balance'; end if;
  insert into public.liquidation_entries (barangay_id, advance_id, kind, description, amount, created_by)
  values (v_advance.barangay_id, p_advance_id, p_kind, trim(p_description), p_amount, auth.uid())
  returning id into v_id;
  if p_kind = 'refund' then
    insert into public.cashbook_entries (barangay_id, business_date, source_type, source_id, account, amount)
    values (v_advance.barangay_id, v_date, 'advance_refund', v_id, 'cash', p_amount);
  end if;
  insert into public.audit_events (barangay_id, actor_id, action, subject_type, subject_id, detail)
  values (v_advance.barangay_id, auth.uid(),
          case when p_kind = 'refund' then 'advance_refund_recorded' else 'liquidation_expense_recorded' end,
          'cash_advance', p_advance_id, jsonb_build_object('description', trim(p_description)));
  return v_id;
end;
$$;

revoke all on function public.open_cash_advance(uuid), public.record_liquidation(uuid,text,text,numeric)
  from public, anon;
grant execute on function public.open_cash_advance(uuid), public.record_liquidation(uuid,text,text,numeric)
  to authenticated;

commit;
