-- ============================================================
-- SERVICE — Milestone 3 · Perfil público, slug e favoritos
-- - profiles.slug (URL amigável /profissionais/<cidade>/<nome>)
-- - contrato público reduzido (ADR-016): anon lê só colunas públicas
--   de profissionais (nunca phone)
-- - favorites (spec §29/§50)
-- ============================================================

-- ------------------------------------------------------------
-- Slug do perfil (gerado do full_name, sem acentos)
-- ------------------------------------------------------------
alter table public.profiles add column slug text unique;

create or replace function public.slugify(p_text text)
returns text
language sql
immutable
as $$
  select coalesce(
    nullif(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            translate(lower(trim(p_text)),
              'áàâãäéèêëíìîïóòôõöúùûüçñ',
              'aaaaaeeeeiiiiooooouuuucn'),
            '[^a-z0-9]+', '-', 'g'),
          '^-+', '', 'g'),
        '-+$', '', 'g'),
      ''),
    'perfil')
$$;

create or replace function public.profiles_set_slug()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  base text;
  candidate text;
  suffix integer := 2;
begin
  if new.user_type = 'professional' and new.full_name is not null then
    base := public.slugify(new.full_name);
    candidate := base;
    while exists (select 1 from public.profiles where slug = candidate and id <> new.id) loop
      candidate := base || '-' || suffix::text;
      suffix := suffix + 1;
    end loop;
    new.slug := candidate;
  else
    new.slug := null;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_slug_trigger on public.profiles;
create trigger profiles_slug_trigger
  before insert or update of full_name, user_type on public.profiles
  for each row execute function public.profiles_set_slug();

-- Backfill dos perfis profissionais existentes
update public.profiles set slug = public.slugify(full_name)
where user_type = 'professional' and full_name is not null and slug is null;

-- ------------------------------------------------------------
-- Contrato público reduzido (ADR-016): anon lê apenas colunas
-- públicas de perfis de profissionais. phone/colunas restantes:
-- somente authenticated (dono) / service_role.
-- ------------------------------------------------------------
create policy "profiles_select_public_professional" on public.profiles
  for select to anon
  using (user_type = 'professional');

revoke select on public.profiles from anon;
grant select (id, full_name, city_id, avatar_url, user_type, slug, created_at, updated_at)
  on public.profiles to anon;

-- ------------------------------------------------------------
-- Favoritos (spec §29/§50)
-- ------------------------------------------------------------
create table public.favorites (
  client_id uuid not null references public.profiles (id) on delete cascade,
  professional_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (client_id, professional_id),
  check (client_id <> professional_id)
);

alter table public.favorites enable row level security;

-- dono gerencia os próprios favoritos; ninguém vê favoritos de terceiros
create policy "favorites_select_own" on public.favorites
  for select to authenticated
  using (client_id = auth.uid());

create policy "favorites_insert_own" on public.favorites
  for insert to authenticated
  with check (client_id = auth.uid());

create policy "favorites_delete_own" on public.favorites
  for delete to authenticated
  using (client_id = auth.uid());
