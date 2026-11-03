-- Replay a confirmed financial submission without posting it twice.
-- Apply after 202611050001_audit_actor_identity.sql.
begin;

create table public.finance_action_requests (
  actor_id uuid not null references auth.users(id),
  request_id uuid not null,
  barangay_id uuid not null references public.barangays(id),
  function_name text not null,
  arguments jsonb not null check (jsonb_typeof(arguments) = 'object'),
  response jsonb,
  created_at timestamptz not null default now(),
  primary key (actor_id, request_id)
);
alter table public.finance_action_requests enable row level security;
revoke all on public.finance_action_requests from public, anon, authenticated;

create or replace function public.execute_finance_action(
  p_barangay_id uuid, p_request_id uuid, p_function text, p_arguments jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_request public.finance_action_requests%rowtype;
  v_kind text;
  v_page text;
  v_id uuid;
  v_response jsonb;
begin
  if v_actor is null or p_request_id is null or p_barangay_id is null
     or p_arguments is null or jsonb_typeof(p_arguments) <> 'object'
  then raise exception 'Invalid financial submission'; end if;
  if p_function is null or p_function not in (
    'add_budget_line','create_expense_case','advance_expense_case','create_voucher',
    'submit_voucher','approve_voucher','reject_voucher','record_payment',
    'issue_collection','void_collection','confirm_deposit','open_cash_advance','record_liquidation'
  ) then raise exception 'Financial action is unavailable'; end if;

  -- Match the existing application's write policy. This migration does not
  -- enable new role workflows or broaden any existing function/page permission.
  if not public.is_system_admin() and not (
    (p_function in ('approve_voucher','reject_voucher') and public.has_barangay_role(p_barangay_id,array['approver']))
    or (p_function = 'record_payment' and public.has_barangay_role(p_barangay_id,array['treasurer']))
  ) then raise exception 'Live records are read-only for your account'; end if;

  -- Bind record IDs and creation arguments to the active barangay. Validate
  -- current permissions even on a replay; an old receipt is not an access grant.
  if p_function in ('add_budget_line','create_expense_case','issue_collection','confirm_deposit') then
    if (p_arguments->>'p_barangay_id')::uuid is distinct from p_barangay_id
    then raise exception 'Financial submission belongs to another barangay'; end if;
    v_kind := p_arguments->>'p_kind';
  elsif p_function in ('advance_expense_case','create_voucher') then
    select kind into v_kind from public.expense_cases
      where id = (p_arguments->>'p_case_id')::uuid and barangay_id = p_barangay_id;
    if not found then raise exception 'Expense case is unavailable in this barangay'; end if;
  elsif p_function in ('submit_voucher','approve_voucher','reject_voucher','record_payment','open_cash_advance') then
    perform 1 from public.vouchers
      where id = (p_arguments->>'p_voucher_id')::uuid and barangay_id = p_barangay_id;
    if not found then raise exception 'Voucher is unavailable in this barangay'; end if;
  elsif p_function = 'void_collection' then
    perform 1 from public.collections
      where id = (p_arguments->>'p_collection_id')::uuid and barangay_id = p_barangay_id;
    if not found then raise exception 'Receipt is unavailable in this barangay'; end if;
  elsif p_function = 'record_liquidation' then
    perform 1 from public.cash_advances
      where id = (p_arguments->>'p_advance_id')::uuid and barangay_id = p_barangay_id;
    if not found then raise exception 'Cash advance is unavailable in this barangay'; end if;
  end if;

  v_page := case
    when p_function = 'add_budget_line' then 'budget'
    when p_function in ('create_expense_case','advance_expense_case') then 'spending'
    when p_function in ('issue_collection','void_collection') then 'collections'
    when p_function = 'confirm_deposit' then 'deposits'
    when p_function in ('open_cash_advance','record_liquidation') then 'advances'
    else 'disbursements' end;
  if not public.account_has_page(p_barangay_id,v_page)
    and not (v_page = 'spending' and public.account_has_page(p_barangay_id,v_kind))
  then raise exception 'This account cannot access this financial page'; end if;
  if p_function in ('submit_voucher','approve_voucher','reject_voucher','record_payment')
    and coalesce(p_arguments->>'p_expected_version','') !~ '^[1-9][0-9]*$'
  then raise exception 'Reload the voucher before performing this action'; end if;

  -- A concurrent insert with the same actor/key waits for the first transaction.
  -- The posting and its response commit together; errors roll both back.
  insert into public.finance_action_requests (actor_id,request_id,barangay_id,function_name,arguments)
  values (v_actor,p_request_id,p_barangay_id,p_function,p_arguments)
  on conflict (actor_id,request_id) do nothing;
  select * into v_request from public.finance_action_requests
    where actor_id = v_actor and request_id = p_request_id for update;
  if v_request.barangay_id <> p_barangay_id or v_request.function_name <> p_function
    or v_request.arguments <> p_arguments
  then raise exception 'This request ID was already used for a different transaction'; end if;
  if v_request.response is not null then return v_request.response; end if;

  case p_function
    when 'add_budget_line' then v_id := public.add_budget_line(p_barangay_id,p_arguments->>'p_code',p_arguments->>'p_name',p_arguments->>'p_category',(p_arguments->>'p_appropriation')::numeric);
    when 'create_expense_case' then v_id := public.create_expense_case(p_barangay_id,p_arguments->>'p_kind',p_arguments->>'p_purpose',p_arguments->>'p_payee',(p_arguments->>'p_budget_line_id')::uuid,(p_arguments->>'p_amount')::numeric);
    when 'advance_expense_case' then perform public.advance_expense_case((p_arguments->>'p_case_id')::uuid);
    when 'create_voucher' then v_id := public.create_voucher((p_arguments->>'p_case_id')::uuid);
    when 'submit_voucher' then perform public.submit_voucher((p_arguments->>'p_voucher_id')::uuid,(p_arguments->>'p_expected_version')::integer);
    when 'approve_voucher' then perform public.approve_voucher((p_arguments->>'p_voucher_id')::uuid,(p_arguments->>'p_expected_version')::integer);
    when 'reject_voucher' then perform public.reject_voucher((p_arguments->>'p_voucher_id')::uuid,(p_arguments->>'p_expected_version')::integer);
    when 'record_payment' then perform public.record_payment((p_arguments->>'p_voucher_id')::uuid,(p_arguments->>'p_expected_version')::integer,p_arguments->>'p_reference');
    when 'issue_collection' then v_id := public.issue_collection(p_barangay_id,p_arguments->>'p_payer',p_arguments->>'p_purpose',p_arguments->>'p_category',(p_arguments->>'p_amount')::numeric);
    when 'void_collection' then perform public.void_collection((p_arguments->>'p_collection_id')::uuid);
    when 'confirm_deposit' then v_id := public.confirm_deposit(p_barangay_id,p_arguments->>'p_bank',p_arguments->>'p_reference',p_arguments->'p_allocations',p_arguments->>'p_kind');
    when 'open_cash_advance' then v_id := public.open_cash_advance((p_arguments->>'p_voucher_id')::uuid);
    when 'record_liquidation' then v_id := public.record_liquidation((p_arguments->>'p_advance_id')::uuid,p_arguments->>'p_kind',p_arguments->>'p_description',(p_arguments->>'p_amount')::numeric);
  end case;
  v_response := jsonb_build_object('ok',true,'id',v_id);
  update public.finance_action_requests set response = v_response
    where actor_id = v_actor and request_id = p_request_id;
  return v_response;
end;
$$;
revoke all on function public.execute_finance_action(uuid,uuid,text,jsonb) from public, anon;
grant execute on function public.execute_finance_action(uuid,uuid,text,jsonb) to authenticated;
commit;
