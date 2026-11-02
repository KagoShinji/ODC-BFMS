-- Keep the actor's account identity with new audit events. Apply after
-- 202611040001_superadmin_workflow_access.sql. Existing events resolve their
-- current account details on read; they are not rewritten as historical snapshots.
begin;

alter table public.audit_events add column if not exists actor_name text,
  add column if not exists actor_email text;

create or replace function public.stamp_audit_actor_identity()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- Never accept display identity supplied by an event payload. Audit insertion
  -- remains restricted to trusted database functions; actor_id is the account key.
  select p.full_name, coalesce(u.email, p.email)
    into new.actor_name, new.actor_email
    from auth.users u left join public.staff_profiles p on p.user_id = u.id
    where u.id = new.actor_id;
  return new;
end;
$$;
create trigger stamp_audit_actor_identity before insert on public.audit_events
  for each row execute function public.stamp_audit_actor_identity();

-- Auditors may read identities of actors in their permitted audit events, without
-- receiving staff-directory access or unrestricted access to auth.users.
create or replace function public.get_audit_events(p_barangay_id uuid, p_limit integer default 200)
returns table(id uuid, actor_id uuid, actor_name text, actor_email text, action text,
  subject_type text, subject_id uuid, detail jsonb, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.account_has_page(p_barangay_id, 'audit') then return; end if;
  return query
    select e.id, e.actor_id, coalesce(e.actor_name,p.full_name),
      coalesce(e.actor_email,u.email,p.email), e.action, e.subject_type,
      e.subject_id, e.detail, e.created_at
    from public.audit_events e
    left join public.staff_profiles p on p.user_id = e.actor_id
    left join auth.users u on u.id = e.actor_id
    where e.barangay_id = p_barangay_id
    order by e.created_at desc, e.id desc
    limit least(200,greatest(1,coalesce(p_limit,200)));
end;
$$;
revoke all on function public.stamp_audit_actor_identity(), public.get_audit_events(uuid,integer)
  from public, anon, authenticated;
grant execute on function public.get_audit_events(uuid,integer) to authenticated;
commit;
