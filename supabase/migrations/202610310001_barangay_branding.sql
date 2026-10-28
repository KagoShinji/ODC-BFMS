-- Per-barangay white labeling, managed by super admins: each barangay gets a
-- sign-in address (/b/<slug>) and optional branding with an uploaded logo.
-- Apply after 202610300001_staff_and_branding.sql.

begin;

alter table public.barangays add column if not exists slug text;
update public.barangays
set slug = coalesce(
    nullif(trim(both '-' from left(regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g'), 50)), ''),
    'barangay'
  ) || '-' || left(id::text, 4)
where slug is null;
alter table public.barangays alter column slug set not null;
alter table public.barangays add constraint barangays_slug_format
  check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60);
create unique index if not exists barangays_slug_idx on public.barangays (slug);

grant insert (name, slug) on public.barangays to authenticated;
grant update (name, slug) on public.barangays to authenticated;
create policy "system administrators update barangays" on public.barangays
  for update to authenticated
  using (public.is_system_admin()) with check (public.is_system_admin());

-- A barangay without a row here uses the system branding in app_branding.
create table if not exists public.barangay_branding (
  barangay_id uuid primary key references public.barangays(id) on delete cascade,
  app_name text not null check (char_length(app_name) between 1 and 80),
  organization_name text not null default '' check (char_length(organization_name) <= 40),
  mark_text text not null check (char_length(mark_text) between 1 and 4),
  logo_url text not null default ''
    check (logo_url = '' or (logo_url ~ '^https://' and char_length(logo_url) <= 500)),
  accent_color text not null check (accent_color ~ '^#[0-9a-f]{6}$'),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.barangay_branding enable row level security;
revoke all on public.barangay_branding from anon, authenticated;
grant select, delete on public.barangay_branding to authenticated;
grant insert (barangay_id, app_name, organization_name, mark_text, logo_url, accent_color)
  on public.barangay_branding to authenticated;
grant update (app_name, organization_name, mark_text, logo_url, accent_color)
  on public.barangay_branding to authenticated;

create policy "members read their barangay branding" on public.barangay_branding
  for select to authenticated using (
    public.is_system_admin()
    or public.has_barangay_role(barangay_id, array['admin','encoder','procurement','budget','approver','treasurer','collector','auditor'])
  );
create policy "system administrators add barangay branding" on public.barangay_branding
  for insert to authenticated with check (public.is_system_admin());
create policy "system administrators change barangay branding" on public.barangay_branding
  for update to authenticated
  using (public.is_system_admin()) with check (public.is_system_admin());
create policy "system administrators remove barangay branding" on public.barangay_branding
  for delete to authenticated using (public.is_system_admin());

drop trigger if exists stamp_barangay_branding on public.barangay_branding;
create trigger stamp_barangay_branding before insert or update on public.barangay_branding
  for each row execute function public.stamp_app_branding();

-- The sign-in page runs before authentication, so it looks up one barangay's
-- public branding by slug instead of reading the tables.
create or replace function public.barangay_branding_for_slug(p_slug text)
returns table (
  barangay_name text,
  app_name text,
  organization_name text,
  mark_text text,
  logo_url text,
  accent_color text
)
language sql stable security definer set search_path = '' as $$
  select b.name, bb.app_name, bb.organization_name, bb.mark_text, bb.logo_url, bb.accent_color
  from public.barangays b
  left join public.barangay_branding bb on bb.barangay_id = b.id
  where b.slug = lower(p_slug);
$$;
revoke all on function public.barangay_branding_for_slug(text) from public;
grant execute on function public.barangay_branding_for_slug(text) to anon, authenticated;

-- Logos are public images (they appear on sign-in pages). Only system
-- administrators upload, replace, or remove them.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('brand-assets', 'brand-assets', true, 1048576, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "system administrators read brand assets" on storage.objects
  for select to authenticated
  using (bucket_id = 'brand-assets' and public.is_system_admin());
create policy "system administrators upload brand assets" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'brand-assets' and public.is_system_admin());
create policy "system administrators remove brand assets" on storage.objects
  for delete to authenticated
  using (bucket_id = 'brand-assets' and public.is_system_admin());

commit;
