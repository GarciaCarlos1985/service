-- Somente PostgreSQL isolado (PGlite), nunca executar no projeto Supabase ativo.
create role anon;
create role authenticated;
create role service_role bypassrls;
create schema auth;
create table auth.users(
 id uuid primary key,email text,email_confirmed_at timestamptz default now(),
 raw_user_meta_data jsonb default '{}',raw_app_meta_data jsonb default '{}',created_at timestamptz default now(),
 banned_until timestamptz,deleted_at timestamptz
);
create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id) on delete cascade,not_after timestamptz,created_at timestamptz default now(),updated_at timestamptz default now());
create table auth.mfa_factors(id uuid primary key,user_id uuid references auth.users(id) on delete cascade,status text,factor_type text,friendly_name text,secret text,created_at timestamptz default now(),updated_at timestamptz default now());
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
grant usage on schema auth,public to anon,authenticated;
create publication supabase_realtime;
create schema storage;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text,owner_id text,metadata jsonb default '{}');
alter table storage.objects enable row level security;
grant usage on schema storage to authenticated;
grant select,insert,delete on storage.objects to authenticated;
