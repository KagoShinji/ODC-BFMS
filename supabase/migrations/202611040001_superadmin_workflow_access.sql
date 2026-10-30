-- Super admins can run the complete supported workflow with one account for
-- support and testing. Every action remains audited; normal approvers retain
-- the rule against approving a voucher they created.
-- Apply after 202611030001_account_page_access.sql.
begin;

-- Keep the global role independent of barangay memberships or custom pages.
create or replace function public.has_barangay_role(p_barangay_id uuid, p_roles text[])
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_system_admin() or exists (
    select 1 from public.memberships m
    where m.user_id = (select auth.uid())
      and m.barangay_id = p_barangay_id and m.active and m.role = any(p_roles)
  );
$$;

-- Add the actor's global access level to all new Super admin audit events,
-- including submissions, rejections, payments, treasury and access changes.
create or replace function public.tag_superadmin_audit_event()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.actor_id = auth.uid() and public.is_system_admin() then
    new.detail := coalesce(new.detail, '{}'::jsonb)
      || jsonb_build_object('actor_access_level', 'superadmin');
  end if;
  return new;
end;
$$;
create trigger tag_superadmin_audit_event before insert on public.audit_events
  for each row execute function public.tag_superadmin_audit_event();

create or replace function public.approve_voucher(p_voucher_id uuid, p_expected_version integer)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_voucher public.vouchers%rowtype;
  v_superadmin boolean := public.is_system_admin();
  v_self_approval boolean;
begin
  select * into v_voucher from public.vouchers where id = p_voucher_id for update;
  if not found then raise exception 'Voucher not found'; end if;
  v_self_approval := v_voucher.created_by = auth.uid();
  if not public.has_barangay_role(v_voucher.barangay_id, array['approver'])
    or (v_self_approval and not v_superadmin)
  then raise exception 'Approval is not authorized'; end if;
  if p_expected_version is null or v_voucher.status <> 'submitted'
    or v_voucher.version <> p_expected_version
  then raise exception 'Voucher state or version changed'; end if;

  update public.vouchers set status = 'approved', approved_by = auth.uid(), version = version + 1
    where id = p_voucher_id;
  insert into public.audit_events (barangay_id, actor_id, action, subject_type, subject_id, detail)
  values (v_voucher.barangay_id, auth.uid(), 'voucher_approved', 'voucher', p_voucher_id,
    jsonb_build_object(
      'created_by', v_voucher.created_by,
      'self_approval', v_self_approval,
      'superadmin_override', v_superadmin and v_self_approval,
      'previous_version', v_voucher.version,
      'version', v_voucher.version + 1
    ));
end;
$$;

revoke all on function public.has_barangay_role(uuid,text[]),
  public.approve_voucher(uuid,integer), public.tag_superadmin_audit_event() from public, anon;
grant execute on function public.has_barangay_role(uuid,text[]), public.approve_voucher(uuid,integer)
  to authenticated;
commit;
