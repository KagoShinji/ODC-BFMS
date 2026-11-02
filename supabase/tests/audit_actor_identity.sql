-- Isolated test database only, after all migrations. Fixtures roll back.
begin;
insert into auth.users(id,email) values
 ('a1000000-0000-0000-0000-000000000001','super@example.test'),
 ('a1000000-0000-0000-0000-000000000002','performer@example.test'),
 ('a1000000-0000-0000-0000-000000000003','auditor@example.test');
insert into public.system_admins(user_id) values ('a1000000-0000-0000-0000-000000000001');
insert into public.staff_profiles(user_id,full_name,email) values
 ('a1000000-0000-0000-0000-000000000002','Original Performer','old-profile@example.test');
insert into public.barangays(id,name,slug) values
 ('a2000000-0000-0000-0000-000000000001','Audit identity A','audit-identity-a'),
 ('a2000000-0000-0000-0000-000000000002','Audit identity B','audit-identity-b');
insert into public.memberships(user_id,barangay_id,role) values
 ('a1000000-0000-0000-0000-000000000002','a2000000-0000-0000-0000-000000000001','encoder'),
 ('a1000000-0000-0000-0000-000000000003','a2000000-0000-0000-0000-000000000001','auditor');
insert into public.audit_events(id,barangay_id,actor_id,actor_name,actor_email,action,subject_type,subject_id) values
 ('a3000000-0000-0000-0000-000000000001','a2000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000002','Spoofed','spoofed@example.test','test_action','voucher','a3000000-0000-0000-0000-000000000001'),
 ('a3000000-0000-0000-0000-000000000002','a2000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000001',null,null,'test_action','voucher','a3000000-0000-0000-0000-000000000002'),
 ('a3000000-0000-0000-0000-000000000003','a2000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000002',null,null,'legacy_action','voucher','a3000000-0000-0000-0000-000000000003');
-- Simulate an older event, recorded before identity columns existed.
update public.audit_events set actor_name=null,actor_email=null where id='a3000000-0000-0000-0000-000000000003';
update public.staff_profiles set full_name='Current Performer',email='current-profile@example.test' where user_id='a1000000-0000-0000-0000-000000000002';
update auth.users set email='current-auth@example.test' where id='a1000000-0000-0000-0000-000000000002';

set local role authenticated;
select set_config('request.jwt.claim.sub','a1000000-0000-0000-0000-000000000003',true);
do $$
declare v_row record;
begin
 if exists(select 1 from public.staff_profiles where user_id='a1000000-0000-0000-0000-000000000002') then raise exception 'Auditor must not gain staff-directory access'; end if;
 select * into v_row from public.get_audit_events('a2000000-0000-0000-0000-000000000001') where id='a3000000-0000-0000-0000-000000000001';
 if v_row.actor_name is distinct from 'Original Performer' or v_row.actor_email is distinct from 'performer@example.test' then raise exception 'Snapshot changed or accepted spoofed identity'; end if;
 select * into v_row from public.get_audit_events('a2000000-0000-0000-0000-000000000001') where id='a3000000-0000-0000-0000-000000000003';
 if v_row.actor_name is distinct from 'Current Performer' or v_row.actor_email is distinct from 'current-auth@example.test' then raise exception 'Legacy account lookup failed'; end if;
 if exists(select 1 from public.get_audit_events('a2000000-0000-0000-0000-000000000002')) then raise exception 'Cross-barangay identity leak'; end if;
 if (select count(*) from public.get_audit_events('a2000000-0000-0000-0000-000000000001',1)) <> 1 then raise exception 'Limit was not applied'; end if;
 begin
  insert into public.audit_events(barangay_id,actor_id,action,subject_type,subject_id) values ('a2000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000002','spoof','voucher','a3000000-0000-0000-0000-000000000001');
  raise exception 'Client could insert a forged audit event';
 exception when insufficient_privilege then null; end;
end $$;

select set_config('request.jwt.claim.sub','a1000000-0000-0000-0000-000000000002',true);
do $$ begin
 if exists(select 1 from public.get_audit_events('a2000000-0000-0000-0000-000000000001')) then raise exception 'Non-audit role could read account identities'; end if;
end $$;

select set_config('request.jwt.claim.sub','a1000000-0000-0000-0000-000000000001',true);
do $$ declare v_row record; begin
 select * into v_row from public.get_audit_events('a2000000-0000-0000-0000-000000000002');
 if v_row.actor_email is distinct from 'super@example.test' then raise exception 'Super admin without profile was not identified'; end if;
end $$;

reset role;
update public.memberships set active=false where user_id='a1000000-0000-0000-0000-000000000003';
set local role authenticated;
select set_config('request.jwt.claim.sub','a1000000-0000-0000-0000-000000000003',true);
do $$ begin
 if exists(select 1 from public.get_audit_events('a2000000-0000-0000-0000-000000000001')) then raise exception 'Deactivated auditor retained identity access'; end if;
 if has_function_privilege('anon','public.get_audit_events(uuid,integer)','EXECUTE') then raise exception 'Anonymous execute privilege'; end if;
end $$;
rollback;
select 'PASS: audit identity snapshots, legacy lookup, anti-spoofing, role and barangay isolation' as result;
