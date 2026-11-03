-- Isolated database only, after all migrations. Fixtures and postings roll back.
begin;
insert into auth.users(id) values
 ('81000000-0000-0000-0000-000000000001'),
 ('81000000-0000-0000-0000-000000000002'),
 ('81000000-0000-0000-0000-000000000003'),
 ('81000000-0000-0000-0000-000000000004');
insert into public.system_admins(user_id) values
 ('81000000-0000-0000-0000-000000000001'),
 ('81000000-0000-0000-0000-000000000002');
insert into public.barangays(id,name,slug) values
 ('82000000-0000-0000-0000-000000000001','Idempotency A','idempotency-a'),
 ('82000000-0000-0000-0000-000000000002','Idempotency B','idempotency-b');
insert into public.memberships(user_id,barangay_id,role) values
 ('81000000-0000-0000-0000-000000000003','82000000-0000-0000-0000-000000000001','approver'),
 ('81000000-0000-0000-0000-000000000004','82000000-0000-0000-0000-000000000001','treasurer');
set local role authenticated;
select set_config('request.jwt.claim.sub','81000000-0000-0000-0000-000000000001',true);
do $$
declare
 b uuid := '82000000-0000-0000-0000-000000000001';
 other_b uuid := '82000000-0000-0000-0000-000000000002';
 k uuid; a jsonb; first jsonb; again jsonb; budget uuid; c uuid; v uuid;
 receipt uuid; advance uuid; count_before integer;
begin
 a := jsonb_build_object('p_barangay_id',b,'p_code','REPLAY','p_name','Replay test','p_category','Maintenance & Operations','p_appropriation','10000.00');
 k := gen_random_uuid();
 first := public.execute_finance_action(b,k,'add_budget_line',a);
 again := public.execute_finance_action(b,k,'add_budget_line',a);
 if first <> again then raise exception 'Budget replay response changed'; end if;
 budget := (first->>'id')::uuid;
 if (select count(*) from public.budget_lines where barangay_id=b and code='REPLAY') <> 1 then raise exception 'Budget was duplicated'; end if;

 a := jsonb_build_object('p_barangay_id',b,'p_kind','procurement','p_payee','Supplier','p_purpose','Replay source','p_budget_line_id',budget,'p_amount','100.00');
 k := gen_random_uuid();first := public.execute_finance_action(b,k,'create_expense_case',a);
 again := public.execute_finance_action(b,k,'create_expense_case',a);
 if first <> again then raise exception 'Case replay changed'; end if;
 c := (first->>'id')::uuid;
 k := gen_random_uuid();a := jsonb_build_object('p_case_id',c);
 perform public.execute_finance_action(b,k,'advance_expense_case',a);
 perform public.execute_finance_action(b,k,'advance_expense_case',a);
 if (select step from public.expense_cases where id=c) <> 'RFQ' then raise exception 'Replay advanced two stages'; end if;
 if (select count(*) from public.audit_events where subject_id=c and action='procurement_advanced') <> 1 then raise exception 'Replay duplicated stage audit'; end if;
 perform public.advance_expense_case(c);perform public.advance_expense_case(c);perform public.advance_expense_case(c);
 k := gen_random_uuid();first := public.execute_finance_action(b,k,'create_voucher',a);
 again := public.execute_finance_action(b,k,'create_voucher',a);
 if first <> again then raise exception 'Voucher replay changed'; end if;
 v := (first->>'id')::uuid;

 k := gen_random_uuid();a := jsonb_build_object('p_voucher_id',v,'p_expected_version',1);
 perform public.execute_finance_action(b,k,'submit_voucher',a);perform public.execute_finance_action(b,k,'submit_voucher',a);
 if (select version from public.vouchers where id=v) <> 2 then raise exception 'Submission replay changed version'; end if;
 k := gen_random_uuid();a := jsonb_build_object('p_voucher_id',v,'p_expected_version',2);
 perform public.execute_finance_action(b,k,'approve_voucher',a);perform public.execute_finance_action(b,k,'approve_voucher',a);
 if (select version from public.vouchers where id=v) <> 3 then raise exception 'Approval replay changed version'; end if;
 k := gen_random_uuid();a := jsonb_build_object('p_voucher_id',v,'p_expected_version',3,'p_reference','REPLAY-PAYMENT');
 perform public.execute_finance_action(b,k,'record_payment',a);perform public.execute_finance_action(b,k,'record_payment',a);
 if (select count(*) from public.cashbook_entries where source_type='payment' and source_id=v) <> 1 then raise exception 'Payment was duplicated'; end if;
 if (select count(*) from public.audit_events where subject_id=v and action='payment_recorded') <> 1 then raise exception 'Payment audit duplicated'; end if;

 k := '83000000-0000-0000-0000-000000000001';
 a := jsonb_build_object('p_barangay_id',b,'p_payer','Payer','p_purpose','Replay collection','p_category','Other income','p_amount','100.00');
 first := public.execute_finance_action(b,k,'issue_collection',a);
 again := public.execute_finance_action(b,k,'issue_collection',a);
 if first <> again then raise exception 'Receipt replay changed'; end if;
 receipt := (first->>'id')::uuid;
 if (select count(*) from public.cashbook_entries where source_type='collection' and source_id=receipt) <> 1 then raise exception 'Receipt cash was duplicated'; end if;
 begin
   perform public.execute_finance_action(b,k,'issue_collection',a || '{"p_amount":"101.00"}'::jsonb);
   raise exception 'Changed payload reused a request';
 exception when raise_exception then if sqlerrm <> 'This request ID was already used for a different transaction' then raise; end if; end;
 begin
   perform public.execute_finance_action(other_b,k,'issue_collection',a || jsonb_build_object('p_barangay_id',other_b));
   raise exception 'Request replay crossed barangays';
 exception when raise_exception then if sqlerrm <> 'This request ID was already used for a different transaction' then raise; end if; end;
 begin
   perform public.execute_finance_action(other_b,gen_random_uuid(),'create_voucher',jsonb_build_object('p_case_id',c));
   raise exception 'Case ID crossed barangays';
 exception when raise_exception then if sqlerrm <> 'Expense case is unavailable in this barangay' then raise; end if; end;

 k := gen_random_uuid();a := jsonb_build_object('p_barangay_id',b,'p_kind','deposit','p_bank','Test bank','p_reference','REPLAY-DEPOSIT','p_allocations',jsonb_build_array(jsonb_build_object('collection_id',receipt,'amount','60.00')));
 first := public.execute_finance_action(b,k,'confirm_deposit',a);again := public.execute_finance_action(b,k,'confirm_deposit',a);
 if first <> again then raise exception 'Deposit replay changed'; end if;
 if (select sum(amount) from public.deposit_allocations where collection_id=receipt) <> 60 then raise exception 'Allocation duplicated'; end if;

 receipt := public.issue_collection(b,'Void payer','Void replay','Other income',5);
 k := gen_random_uuid();a := jsonb_build_object('p_collection_id',receipt);
 perform public.execute_finance_action(b,k,'void_collection',a);perform public.execute_finance_action(b,k,'void_collection',a);
 if (select count(*) from public.cashbook_entries where source_id=receipt and source_type='collection_void') <> 1 then raise exception 'Void replay duplicated cash movement'; end if;

 c := public.create_expense_case(b,'travel','Advance replay','Traveler',budget,20);
 v := public.create_voucher(c);perform public.submit_voucher(v,1);perform public.approve_voucher(v,2);perform public.record_payment(v,3,'REPLAY-TRAVEL');
 k := gen_random_uuid();a := jsonb_build_object('p_voucher_id',v);
 first := public.execute_finance_action(b,k,'open_cash_advance',a);again := public.execute_finance_action(b,k,'open_cash_advance',a);
 if first <> again then raise exception 'Advance replay changed'; end if;
 advance := (first->>'id')::uuid;
 k := gen_random_uuid();a := jsonb_build_object('p_advance_id',advance,'p_kind','refund','p_description','Refund replay','p_amount','5.00');
 perform public.execute_finance_action(b,k,'record_liquidation',a);perform public.execute_finance_action(b,k,'record_liquidation',a);
 if (select sum(amount) from public.liquidation_entries where advance_id=advance) <> 5 then raise exception 'Refund duplicated'; end if;

 c := public.create_expense_case(b,'recurring','Reject replay','Provider',budget,5);
 v := public.create_voucher(c);perform public.submit_voucher(v,1);
 k := gen_random_uuid();a := jsonb_build_object('p_voucher_id',v,'p_expected_version',2);
 perform public.execute_finance_action(b,k,'reject_voucher',a);perform public.execute_finance_action(b,k,'reject_voucher',a);
 if (select count(*) from public.audit_events where subject_id=v and action='voucher_rejected') <> 1 then raise exception 'Rejection replay duplicated audit'; end if;

 begin
   perform public.execute_finance_action(b,'83000000-0000-0000-0000-000000000099','issue_collection',jsonb_build_object('p_barangay_id',b,'p_payer','','p_purpose','Invalid','p_category','Other income','p_amount','1.00'));
   raise exception 'Invalid collection was accepted';
 exception when raise_exception then if sqlerrm <> 'Invalid collection' then raise; end if; end;
 c := public.create_expense_case(b,'recurring','Staff role test','Provider',budget,2);
 v := public.create_voucher(c);perform public.submit_voucher(v,1);
 perform set_config('test.finance_idempotency_voucher',v::text,true);
 if has_table_privilege('authenticated','public.finance_action_requests','SELECT') then raise exception 'Request receipts are exposed'; end if;
 if has_function_privilege('anon','public.execute_finance_action(uuid,uuid,text,jsonb)','EXECUTE') then raise exception 'Anonymous posting allowed'; end if;
end;
$$;
reset role;
do $$ begin
 if exists (select 1 from public.finance_action_requests where request_id='83000000-0000-0000-0000-000000000099') then raise exception 'A failed posting left a completed request'; end if;
end $$;
-- A different actor may use the same key, without reading/replaying another actor's result.
set local role authenticated;
select set_config('request.jwt.claim.sub','81000000-0000-0000-0000-000000000002',true);
select public.execute_finance_action('82000000-0000-0000-0000-000000000001','83000000-0000-0000-0000-000000000001','issue_collection',jsonb_build_object('p_barangay_id','82000000-0000-0000-0000-000000000001','p_payer','Second actor','p_purpose','Independent request','p_category','Other income','p_amount','1.00'));
reset role;
do $$ begin
 if (select count(*) from public.finance_action_requests where request_id='83000000-0000-0000-0000-000000000001') <> 2 then raise exception 'Actor keys were not independent'; end if;
end $$;
-- Replays must re-check permissions; revoking a role also revokes its old receipts.
delete from public.system_admins where user_id='81000000-0000-0000-0000-000000000002';
set local role authenticated;
select set_config('request.jwt.claim.sub','81000000-0000-0000-0000-000000000002',true);
do $$ begin
 begin
  perform public.execute_finance_action('82000000-0000-0000-0000-000000000001','83000000-0000-0000-0000-000000000001','issue_collection',jsonb_build_object('p_barangay_id','82000000-0000-0000-0000-000000000001','p_payer','Second actor','p_purpose','Independent request','p_category','Other income','p_amount','1.00'));
  raise exception 'Revoked actor replayed a result';
 exception when raise_exception then if sqlerrm <> 'Live records are read-only for your account' then raise; end if; end;
end $$;
-- Existing assigned-role exceptions still work, and their replays re-check access.
select set_config('request.jwt.claim.sub','81000000-0000-0000-0000-000000000003',true);
do $$
declare b uuid := '82000000-0000-0000-0000-000000000001';
 v uuid := current_setting('test.finance_idempotency_voucher')::uuid;
 k uuid := '83000000-0000-0000-0000-000000000003';
 a jsonb;
begin
 a := jsonb_build_object('p_voucher_id',v,'p_expected_version',2);
 perform public.execute_finance_action(b,k,'approve_voucher',a);
 perform public.execute_finance_action(b,k,'approve_voucher',a);
 if (select version from public.vouchers where id=v) <> 3 then raise exception 'Assigned approver replay failed'; end if;
 begin
  perform public.execute_finance_action(b,gen_random_uuid(),'issue_collection',jsonb_build_object('p_barangay_id',b));
  raise exception 'Assigned approver gained general posting';
 exception when raise_exception then if sqlerrm <> 'Live records are read-only for your account' then raise; end if; end;
end $$;
reset role;
update public.memberships set active=false where user_id='81000000-0000-0000-0000-000000000003';
set local role authenticated;
do $$ begin
 begin
  perform public.execute_finance_action('82000000-0000-0000-0000-000000000001','83000000-0000-0000-0000-000000000003','approve_voucher',jsonb_build_object('p_voucher_id',current_setting('test.finance_idempotency_voucher'),'p_expected_version',2));
  raise exception 'Revoked approver replayed approval';
 exception when raise_exception then if sqlerrm <> 'Live records are read-only for your account' then raise; end if; end;
end $$;
select set_config('request.jwt.claim.sub','81000000-0000-0000-0000-000000000004',true);
do $$
declare b uuid := '82000000-0000-0000-0000-000000000001';
 v uuid := current_setting('test.finance_idempotency_voucher')::uuid;
 a jsonb := jsonb_build_object('p_voucher_id',v,'p_expected_version',3,'p_reference','STAFF-REPLAY');
begin
 perform public.execute_finance_action(b,'83000000-0000-0000-0000-000000000004','record_payment',a);
 perform public.execute_finance_action(b,'83000000-0000-0000-0000-000000000004','record_payment',a);
 if (select count(*) from public.cashbook_entries where source_id=v and source_type='payment') <> 1 then raise exception 'Assigned treasurer replay duplicated payment'; end if;
end $$;
reset role;
insert into public.account_page_access(barangay_id,user_id,pages,updated_by) values
 ('82000000-0000-0000-0000-000000000001','81000000-0000-0000-0000-000000000004','{}','81000000-0000-0000-0000-000000000001');
set local role authenticated;
do $$ begin
 begin
  perform public.execute_finance_action('82000000-0000-0000-0000-000000000001','83000000-0000-0000-0000-000000000004','record_payment',jsonb_build_object('p_voucher_id',current_setting('test.finance_idempotency_voucher'),'p_expected_version',3,'p_reference','STAFF-REPLAY'));
  raise exception 'Removed page did not block replay';
 exception when raise_exception then if sqlerrm <> 'This account cannot access this financial page' then raise; end if; end;
end $$;
rollback;
