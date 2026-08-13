-- ============================================================
-- SERVICE — Milestone 1 · Init
-- Banco: profiles, cities, service_categories, services
-- Regras: ADR-002 (RLS default deny), ADR-010 (compatível p/ frente),
--         ADR-014 (catálogo canônico), spec §2/§49/§50/§63
-- ============================================================

-- Extensões
create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- Catálogo canônico de cidades (ADR-014) — código IBGE como chave
-- ------------------------------------------------------------
create table public.cities (
  id bigint generated always as identity primary key,
  ibge_code text not null unique,
  name text not null check (char_length(name) between 2 and 120),
  state text not null check (state ~ '^[A-Z]{2}$'),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  is_launch boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.cities is 'Catálogo canônico de cidades (código IBGE). Nunca texto livre (ADR-014).';

-- ------------------------------------------------------------
-- Categorias de serviço (spec §50)
-- ------------------------------------------------------------
create table public.service_categories (
  id bigint generated always as identity primary key,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null unique check (char_length(name) between 2 and 80),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.service_categories is 'Categorias canônicas de serviço (slug usado em URLs de SEO, spec §21).';

-- ------------------------------------------------------------
-- Perfis (um por usuário do auth)
-- ------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text check (char_length(full_name) between 2 and 120),
  phone text check (phone is null or phone ~ '^\+?[0-9]{10,15}$'),
  city_id bigint references public.cities (id),
  user_type text not null default 'client'
    check (user_type in ('client', 'professional')),
  avatar_url text check (avatar_url is null or char_length(avatar_url) <= 2048),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Perfil público de usuário. user_type NÃO é alterável pelo próprio usuário (spec §63).';

-- ------------------------------------------------------------
-- Serviços oferecidos por profissionais (spec §50)
-- ------------------------------------------------------------
create table public.services (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.profiles (id) on delete cascade,
  category_id bigint not null references public.service_categories (id),
  title text not null check (char_length(title) between 3 and 120),
  description text check (description is null or char_length(description) between 10 and 2000),
  price_from_cents integer check (price_from_cents is null or price_from_cents >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index services_professional_id_idx on public.services (professional_id);
create index services_category_id_idx on public.services (category_id);
create index services_active_idx on public.services (is_active) where is_active;

-- ------------------------------------------------------------
-- Triggers utilitários
-- ------------------------------------------------------------

-- updated_at automático
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists services_set_updated_at on public.services;
create trigger services_set_updated_at
  before update on public.services
  for each row execute function public.set_updated_at();

drop trigger if exists cities_set_updated_at on public.cities;
create trigger cities_set_updated_at
  before update on public.cities
  for each row execute function public.set_updated_at();

drop trigger if exists service_categories_set_updated_at on public.service_categories;
create trigger service_categories_set_updated_at
  before update on public.service_categories
  for each row execute function public.set_updated_at();

-- Perfil criado automaticamente ao cadastrar (spec §49: cadastro → onboarding)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- RLS — ADR-002: default deny; policy mínima; nada anônimo escreve
-- ============================================================

alter table public.profiles enable row level security;
alter table public.services enable row level security;
alter table public.cities enable row level security;
alter table public.service_categories enable row level security;

-- Cities: catálogo público (leitura); escrita só via migration/backend
create policy "cities_select_public" on public.cities
  for select using (true);

-- Categories: catálogo público (leitura)
create policy "service_categories_select_public" on public.service_categories
  for select using (true);

-- Profiles:
--   - autenticado lê o próprio perfil
--   - perfil profissional é público em dados mínimos (landing/busca — M3);
--     por ora: autenticado lê o próprio; anon não lê nada de profiles
create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using (auth.uid() = id);

--   - usuário edita o próprio perfil, MAS NUNCA user_type (spec §63: usuário
--     não altera próprio role) — user_type é atualizado apenas via
--     backend/migration com service_role
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and user_type = (select user_type from public.profiles where id = auth.uid())
  );

-- Services:
--   - leitura pública (a oferta é pública por natureza)
--   - escrita somente do profissional dono
create policy "services_select_public" on public.services
  for select using (true);

create policy "services_insert_own" on public.services
  for insert to authenticated
  with check (
    professional_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.user_type = 'professional'
    )
  );

create policy "services_update_own" on public.services
  for update to authenticated
  using (professional_id = auth.uid())
  with check (professional_id = auth.uid());

create policy "services_delete_own" on public.services
  for delete to authenticated
  using (professional_id = auth.uid());

-- Revoga escrita anônima por construção: sem policies de insert/update/delete
-- para anon. Nada a fazer além de NÃO criar essas policies (ADR-002).
