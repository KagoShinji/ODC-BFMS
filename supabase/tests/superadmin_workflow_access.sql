-- Isolated database only, after all migrations. All fixtures and actions roll back.
begin;

insert into auth.users (id) values
  ('70000000-0000-0000-0000-000000000001'),
  ('70000000-0000-0000-0000-000000000002'),
  ('70000000-0000-0000-0000-000000000003');
insert into public.system_admins (user_id) values ('70000000-0000-0000-0000-000000000001');
insert into public.barangays (id,name,slug) values
  ('71000000-0000-0000-0000-000000000001','Super admin workflow A','superadmin-workflow-a'),
  ('71000000-0000-0000-0000-000000000002','Super admin workflow B','superadmin-workflow-b');
insert into public.memberships (user_id,barangay_id,role) values
  ('70000000-0000-0000-0000-000000000002','71000000-0000-0000-0000-000000000001','encoder'),
  ('70000000-0000-0000-0000-000000000002','71000000-0000-0000-0000-000000000001','approver'),
  ('70000000-0000-0000-0000-000000000003','71000000-0000-0000-0000-000000000001','approver');
-- Deliberately restrict custom pages: the global Super admin role must override these.
insert into public.account_page_access (barangay_id,user_id,pages,updated_by) values
  ('71000000-0000-0000-0000-000000000001','70000000-0000-0000-0000-000000000001','{}','70000000-0000-0000-0000-000000000001'),
  ('71000000-0000-0000-0000-000000000002','70000000-0000-0000-0000-000000000001','{}','70000000-0000-0000-0000-000000000001');

set local role authenticated;
select set_config('request.jwt.claim.sub','70000000-0000-0000-0000-000000000001',true);
do $$
declare
  v_superadmin uuid := '70000000-0000-0000-0000-000000000001';
  v_barangay uuid; v_budget uuid; v_case uuid; v_voucher uuid; v_advance uuid;
  v_receipt uuid; v_void_receipt uuid; v_kind text; v_page text; v_action text;
  v_staff_voucher uuid; v_count integer; v_table text; v_minimum integer;
begin
  if exists (select 1 from public.memberships where user_id = v_superadmin)
  then raise exception 'Fixture super admin must have no barangay memberships'; end if;

  foreach v_barangay in array array['71000000-0000-0000-0000-000000000001','71000000-0000-0000-0000-000000000002']::uuid[] loop
    foreach v_page in array array['dashboard','budget','spending','procurement','payroll','recurring','travel','transfer','disbursements','advances','collections','deposits','reports','audit','staff','settings','branding'] loop
      if not public.account_has_page(v_barangay,v_page) then raise exception 'Super admin page blocked: %',v_page; end if;
    end loop;
    foreach v_kind in array array['admin','encoder','procurement','budget','approver','treasurer','collector','auditor'] loop
      if not public.has_barangay_role(v_barangay,array[v_kind]) then raise exception 'Super admin action role blocked: %',v_kind; end if;
    end loop;

    v_budget := public.add_budget_line(v_barangay,'SA-WORKFLOW','Super admin test','Maintenance & Operations',1000);
    v_case := public.create_expense_case(v_barangay,'procurement','Super admin purchase','Test supplier',v_budget,10);
    perform public.advance_expense_case(v_case);
    perform public.advance_expense_case(v_case);
    perform public.advance_expense_case(v_case);
    perform public.advance_expense_case(v_case);
    v_voucher := public.create_voucher(v_case);
    perform public.submit_voucher(v_voucher,1);
    begin
      perform public.approve_voucher(v_voucher,1);
      raise exception 'Super admin bypassed version check';
    exception when raise_exception then
      if sqlerrm <> 'Voucher state or version changed' then raise; end if;
    end;
    begin
      perform public.approve_voucher(v_voucher,null);
      raise exception 'Super admin bypassed null-version check';
    exception when raise_exception then
      if sqlerrm <> 'Voucher state or version changed' then raise; end if;
    end;
    perform public.approve_voucher(v_voucher,2);
    perform public.record_payment(v_voucher,3,'SA-TEST-PURCHASE');
    if not exists (select 1 from public.vouchers where id = v_voucher and status = 'paid'
      and created_by = v_superadmin and approved_by = v_superadmin and paid_by = v_superadmin)
    then raise exception 'Single-account purchase workflow failed'; end if;
    if not exists (select 1 from public.audit_events where subject_id = v_voucher and action = 'voucher_approved'
      and actor_id = v_superadmin and detail @> '{"self_approval":true,"superadmin_override":true,"actor_access_level":"superadmin"}'::jsonb)
    then raise exception 'Self-approval override was not traceable'; end if;
    begin
      perform public.record_payment(v_voucher,4,'SA-TEST-DUPLICATE');
      raise exception 'Super admin paid a voucher twice';
    exception when raise_exception then if sqlerrm <> 'Invalid payment request' then raise; end if; end;

    v_case := public.create_expense_case(v_barangay,'recurring','Reject test','Test provider',v_budget,5);
    v_voucher := public.create_voucher(v_case);
    perform public.submit_voucher(v_voucher,1);
    perform public.reject_voucher(v_voucher,2);
    if not exists (select 1 from public.vouchers where id = v_voucher and status = 'rejected')
    then raise exception 'Super admin could not reject own voucher'; end if;
    begin
      perform public.approve_voucher(v_voucher,3);
      raise exception 'Super admin approved a rejected voucher';
    exception when raise_exception then if sqlerrm <> 'Voucher state or version changed' then raise; end if; end;

    v_case := public.create_expense_case(v_barangay,'travel','Travel advance test','Test traveler',v_budget,20);
    v_voucher := public.create_voucher(v_case);
    perform public.submit_voucher(v_voucher,1);
    perform public.approve_voucher(v_voucher,2);
    perform public.record_payment(v_voucher,3,'SA-TEST-TRAVEL');
    v_advance := public.open_cash_advance(v_voucher);
    perform public.record_liquidation(v_advance,'expense','Test expense receipt',15);
    perform public.record_liquidation(v_advance,'refund','Test cash returned',5);
    if (select sum(amount) from public.liquidation_entries where advance_id = v_advance) <> 20
    then raise exception 'Super admin could not settle travel advance'; end if;

    foreach v_kind in array array['payroll','transfer'] loop
      v_case := public.create_expense_case(v_barangay,v_kind,'Other source test','Test recipient',v_budget,1);
      v_voucher := public.create_voucher(v_case);
      perform public.submit_voucher(v_voucher,1);
      perform public.approve_voucher(v_voucher,2);
      perform public.record_payment(v_voucher,3,'SA-TEST-' || v_kind);
    end loop;

    v_receipt := public.issue_collection(v_barangay,'Test payer','Treasury test','Other income',100);
    perform public.confirm_deposit(v_barangay,'Test bank','SA-TEST-DEPOSIT',jsonb_build_array(jsonb_build_object('collection_id',v_receipt,'amount',60)),'deposit');
    perform public.confirm_deposit(v_barangay,'Test treasury','SA-TEST-REMITTANCE',jsonb_build_array(jsonb_build_object('collection_id',v_receipt,'amount',40)),'remittance');
    v_void_receipt := public.issue_collection(v_barangay,'Void test payer','Void test','Other income',7);
    perform public.void_collection(v_void_receipt);
    if not exists (select 1 from public.collections where id = v_void_receipt and status = 'voided')
    then raise exception 'Super admin could not void a receipt'; end if;
    if (select sum(amount) from public.cashbook_entries where barangay_id = v_barangay and account = 'cash') <> 5
      or (select sum(amount) from public.cashbook_entries where barangay_id = v_barangay and account = 'bank') <> 28
    then raise exception 'Super admin workflow cashbook did not reconcile'; end if;

    foreach v_action in array array['budget_line_added','expense_case_created','procurement_advanced','voucher_created','voucher_submitted','voucher_approved','voucher_rejected','payment_recorded','receipt_issued','receipt_voided','deposit_confirmed','remittance_confirmed','cash_advance_opened','liquidation_expense_recorded','advance_refund_recorded'] loop
      if not exists (select 1 from public.audit_events where barangay_id = v_barangay and actor_id = v_superadmin
        and action = v_action and detail->>'actor_access_level' = 'superadmin')
      then raise exception 'Missing Super admin audit event: %',v_action; end if;
    end loop;
  end loop;

  -- Administration, staff, page settings and branding also remain available.
  perform public.grant_staff_access('71000000-0000-0000-0000-000000000002','70000000-0000-0000-0000-000000000003','collector',true,array['collections'],0);
  perform public.set_account_page_access('71000000-0000-0000-0000-000000000002','70000000-0000-0000-0000-000000000003','{}',1);
  perform public.set_account_page_access('71000000-0000-0000-0000-000000000002','70000000-0000-0000-0000-000000000003',null,2);
  update public.memberships set active = false where barangay_id = '71000000-0000-0000-0000-000000000002' and user_id = '70000000-0000-0000-0000-000000000003';
  get diagnostics v_count = row_count;
  if v_count <> 1 then raise exception 'Super admin could not deactivate staff'; end if;
  update public.memberships set active = true where barangay_id = '71000000-0000-0000-0000-000000000002' and user_id = '70000000-0000-0000-0000-000000000003';
  if not exists (select 1 from public.get_staff_page_access('71000000-0000-0000-0000-000000000002'))
  then raise exception 'Super admin could not read staff page settings'; end if;
  update public.app_branding set organization_name = 'Workflow test' where id = true;
  get diagnostics v_count = row_count;
  if v_count <> 1 then raise exception 'Super admin could not update branding'; end if;

  -- The exception is exclusive to Super admins: ordinary approvers still need another creator.
  perform set_config('request.jwt.claim.sub','70000000-0000-0000-0000-000000000002',true);
  select id into v_budget from public.budget_lines where barangay_id = '71000000-0000-0000-0000-000000000001' and code = 'SA-WORKFLOW';
  v_case := public.create_expense_case('71000000-0000-0000-0000-000000000001','payroll','Ordinary self-approval check','Test recipient',v_budget,1);
  v_staff_voucher := public.create_voucher(v_case);
  perform public.submit_voucher(v_staff_voucher,1);
  begin
    perform public.approve_voucher(v_staff_voucher,2);
    raise exception 'Ordinary creator approved own voucher';
  exception when raise_exception then if sqlerrm <> 'Approval is not authorized' then raise; end if; end;
  perform set_config('request.jwt.claim.sub','70000000-0000-0000-0000-000000000003',true);
  perform public.approve_voucher(v_staff_voucher,2);
  perform set_config('request.jwt.claim.sub',v_superadmin::text,true);
  if not exists (select 1 from public.vouchers where id = v_staff_voucher and status = 'approved')
  then raise exception 'Super admin could not read another creator''s voucher'; end if;
  if not exists (select 1 from public.audit_events where subject_id = v_staff_voucher and action = 'voucher_approved'
    and detail @> '{"self_approval":false,"superadmin_override":false}'::jsonb
    and not (detail ? 'actor_access_level'))
  then raise exception 'Ordinary approval was incorrectly tagged as a Super admin override'; end if;

  -- Exercise actual SELECT policies, not only security-definer mutation functions.
  for v_table, v_minimum in select * from (values
    ('budget_lines',2),('expense_cases',11),('vouchers',11),('collections',4),
    ('deposits',4),('deposit_allocations',4),('cash_advances',2),
    ('liquidation_entries',4),('cashbook_entries',22),('audit_events',30)
  ) expected(table_name, minimum_rows) loop
    execute format('select count(*) from public.%I where barangay_id in ($1,$2)',v_table)
      into v_count using '71000000-0000-0000-0000-000000000001'::uuid,'71000000-0000-0000-0000-000000000002'::uuid;
    if v_count < v_minimum then raise exception 'Super admin read access incomplete for %: saw %, expected at least %',v_table,v_count,v_minimum; end if;
  end loop;
end;
$$;
rollback;
select 'PASS: Super admin workflow, read/write permissions and audit checks completed; test records rolled back.' as result;
