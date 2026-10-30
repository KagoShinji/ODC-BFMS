-- Run only against an isolated test database after all migrations. Rolls back all fixtures.
begin;

insert into auth.users (id) select ('00000000-0000-0000-0000-' || lpad(i::text,12,'0'))::uuid from generate_series(1,6) i;
insert into public.barangays (id,name,slug) values
  ('10000000-0000-0000-0000-000000000001','Access test A','access-test-a'),
  ('10000000-0000-0000-0000-000000000002','Access test B','access-test-b');
insert into public.system_admins (user_id) values ('00000000-0000-0000-0000-000000000001');
insert into public.memberships (user_id,barangay_id,role) values
  ('00000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','admin'),
  ('00000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','procurement'),
  ('00000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000001','collector'),
  ('00000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000002','admin'),
  ('00000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000002','collector');
insert into public.budget_lines (id,barangay_id,fiscal_year,code,name,category,appropriation) values
  ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001',2026,'TEST','Test','Maintenance & Operations',1000);
insert into public.expense_cases (barangay_id,reference,kind,step,purpose,payee,budget_line_id,amount,created_by) values
  ('10000000-0000-0000-0000-000000000001','TEST-PR','procurement','PR','Test','Test','20000000-0000-0000-0000-000000000001',10,'00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000001','TEST-PAY','payroll','Ready for DV','Test','Test','20000000-0000-0000-0000-000000000001',10,'00000000-0000-0000-0000-000000000001');
insert into public.collections (barangay_id,receipt_number,payer,purpose,revenue_category,amount,created_by) values
  ('10000000-0000-0000-0000-000000000001','TEST-A','Test','Test','Other income',10,'00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000002','TEST-B','Test','Test','Other income',20,'00000000-0000-0000-0000-000000000001');

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
do $$ begin
  if (select count(*) from public.expense_cases) <> 1 then raise exception 'Procurement default leaked another expense type'; end if;
  if (select count(*) from public.collections) <> 1 then raise exception 'Default roles or barangay boundaries failed'; end if;
  if public.account_has_page('10000000-0000-0000-0000-000000000001','payroll') then raise exception 'Procurement has payroll page'; end if;
  begin
    perform public.set_account_page_access('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003',array['audit'],0);
    raise exception 'Staff changed their own access';
  exception when raise_exception then if sqlerrm = 'Staff changed their own access' then raise; end if; end;
end $$;

-- Administrator adds a revenue page to the procurement account; its other barangay is unchanged.
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
select public.set_account_page_access('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003',array['collections'],0);
do $$ begin
  begin
    perform public.set_account_page_access('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003',array['audit'],0);
    raise exception 'Administrator changed another barangay';
  exception when raise_exception then if sqlerrm = 'Administrator changed another barangay' then raise; end if; end;
  begin
    perform public.set_account_page_access('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002',array['collections'],0);
    raise exception 'Administrator changed administrator pages';
  exception when raise_exception then if sqlerrm = 'Administrator changed administrator pages' then raise; end if; end;
  begin
    perform public.set_account_page_access('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003',array['staff'],1);
    raise exception 'Custom pages granted administration';
  exception when raise_exception then if sqlerrm = 'Custom pages granted administration' then raise; end if; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
do $$ begin
  if (select count(*) from public.collections) <> 2 then raise exception 'Custom page did not grant its records'; end if;
  if (select count(*) from public.expense_cases) <> 0 then raise exception 'Override did not remove default expense access'; end if;
  if public.account_has_page('10000000-0000-0000-0000-000000000001','procurement') then raise exception 'Default page survived override'; end if;
  begin
    perform public.issue_collection('10000000-0000-0000-0000-000000000001','Test','Test','Other income',1);
    raise exception 'Custom page escalated collection action role';
  exception when raise_exception then if sqlerrm = 'Custom page escalated collection action role' then raise; end if; end;
end $$;

-- Empty selection, stale-editor protection, role-default reset and direct RPC page enforcement.
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
select public.set_account_page_access('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003','{}',1);
do $$ begin
  begin
    perform public.set_account_page_access('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003',array['audit'],1);
    raise exception 'Stale editor overwrote pages';
  exception when raise_exception then if sqlerrm = 'Stale editor overwrote pages' then raise; end if; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
do $$ begin
  if public.account_has_page('10000000-0000-0000-0000-000000000001','dashboard') then raise exception 'Empty override fell back to defaults'; end if;
  if not public.account_has_page('10000000-0000-0000-0000-000000000001','settings') then raise exception 'Account settings locked out'; end if;
  if (select count(*) from public.collections where barangay_id = '10000000-0000-0000-0000-000000000001') <> 0 then raise exception 'Empty override leaked records'; end if;
  begin
    perform public.create_expense_case('10000000-0000-0000-0000-000000000001','procurement','Test','Test','20000000-0000-0000-0000-000000000001',1);
    raise exception 'RPC bypassed unchecked expense page';
  exception when raise_exception then if sqlerrm <> 'This account cannot access this financial page' then raise; end if; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
select public.set_account_page_access('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003',null,2);
do $$ begin
  begin
    perform public.set_account_page_access('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003',array['audit'],1);
    raise exception 'Reset reused an old access version';
  exception when raise_exception then if sqlerrm <> 'Page access changed. Reload the staff list and try again' then raise; end if; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
do $$ begin
  if (select count(*) from public.expense_cases) <> 1 then raise exception 'Default reset failed'; end if;
end $$;

-- A failed custom selection rolls back the new membership too.
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
do $$ begin
  begin
    perform public.grant_staff_access('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000006','collector',true,array['branding'],0);
    raise exception 'Invalid grant succeeded';
  exception when raise_exception then if sqlerrm = 'Invalid grant succeeded' then raise; end if; end;
  if exists (select 1 from public.memberships where user_id = '00000000-0000-0000-0000-000000000006') then raise exception 'Failed grant left membership behind'; end if;
end $$;
select public.grant_staff_access('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000006','collector',true,array['collections'],0);
update public.memberships set active = false where user_id = '00000000-0000-0000-0000-000000000006';
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000006',true);
do $$ begin
  if public.account_has_page('10000000-0000-0000-0000-000000000001','collections') then raise exception 'Inactive membership retained custom access'; end if;
  if (select count(*) from public.collections) <> 0 then raise exception 'Inactive account read records'; end if;
end $$;

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
do $$ begin
  if not public.account_has_page('10000000-0000-0000-0000-000000000001','branding') then raise exception 'Super admin lost access'; end if;
  -- Super admins also see pre-existing collections. Count only this test's two
  -- barangays so unrelated receipts cannot produce a false access failure.
  if (select count(*) from public.collections where barangay_id in (
    '10000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000002'
  )) <> 2 then raise exception 'Super admin cannot read both test receipts across the fixture barangays'; end if;
  if not exists (select 1 from public.audit_events where action = 'Account pages updated') then raise exception 'Access changes were not audited'; end if;
  if public.valid_page_selection(array['collections','collections']) then raise exception 'Duplicate pages accepted'; end if;
  if public.valid_page_selection(array['collections',null]) then raise exception 'Null page accepted'; end if;
  if not public.valid_page_selection('{}'::text[]) then raise exception 'Empty selection rejected'; end if;
end $$;
rollback;
select 'PASS: Account page access checks completed; test records rolled back.' as result;
