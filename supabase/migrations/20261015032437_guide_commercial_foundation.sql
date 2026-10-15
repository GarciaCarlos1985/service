-- Service Guide: additive commercial domain. Review before applying to the active project.
-- Legacy services, favorites, bookings, reviews and conversations retain their contracts.
create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;
create schema if not exists guide_private;
revoke all on schema guide_private from public, anon, authenticated;

-- Same trigger contract; store the optional phone submitted by the new registration form.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.profiles(id,full_name,phone) values(new.id,nullif(trim(coalesce(new.raw_user_meta_data->>'full_name','')),''),
    case when coalesce(new.raw_user_meta_data->>'phone','') ~ '^[+]?[0-9]{10,15}$' then new.raw_user_meta_data->>'phone' end);
  return new;
end;
$$;

create function guide_private.normalize(value text) returns text language sql immutable strict
set search_path = '' as $$
  select lower(translate(value, 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç', 'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc'));
$$;

create table public.guide_categories (
  id uuid primary key default gen_random_uuid(), slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (length(name) between 2 and 80), icon text not null default 'Store'
    check (icon in ('Scissors','House','Laptop','Car','Utensils','Wrench','Store')),
  is_active boolean not null default true, sort_order integer not null default 0
);
create table public.guide_neighborhoods (
  id uuid primary key default gen_random_uuid(), city_id bigint not null references public.cities(id),
  name text not null check(length(name) between 2 and 100), unique(city_id,name)
);
create index guide_neighborhoods_city_idx on public.guide_neighborhoods(city_id);
create table public.plans (
  id uuid primary key default gen_random_uuid(), name text not null unique check(length(name) between 2 and 50),
  limits jsonb not null check(jsonb_typeof(limits)='object'), features jsonb not null check(jsonb_typeof(features)='object'),
  is_active boolean not null default true,
  check ((limits->>'items')::integer between 0 and 500 and (limits->>'media')::integer between 0 and 100)
);
create table public.companies (
  id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 2 and 100),
  slug text not null check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'), description text not null check(length(description) between 10 and 2000),
  category_id uuid not null references public.guide_categories(id), city_id bigint not null references public.cities(id),
  neighborhood_id uuid references public.guide_neighborhoods(id), street text not null default '' check(length(street)<=160),
  address_number text not null default '' check(length(address_number)<=20), postal_code text not null default '' check(postal_code ~ '^([0-9]{8})?$'),
  phone text not null default '' check(phone ~ '^([+]?[0-9]{10,15})?$'), whatsapp text not null default '' check(whatsapp ~ '^([0-9]{10,15})?$'),
  website text not null default '' check(website='' or website ~ '^https://[^/@[:space:]]+([/?#]|$)'),
  hours text not null default '' check(length(hours)<=300), status text not null default 'inactive' check(status in ('active','inactive','blocked')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(city_id,slug),
  search_text text generated always as (guide_private.normalize(name || ' ' || description)) stored,
  search_vector tsvector generated always as (to_tsvector('portuguese'::regconfig,name || ' ' || description)) stored,
  check(status<>'active' or (phone<>'' or whatsapp<>'' or website<>''))
);
create index companies_category_status_idx on public.companies(category_id,status);
create index companies_city_idx on public.companies(city_id);
create index companies_neighborhood_idx on public.companies(neighborhood_id);
create index companies_search_idx on public.companies using gin(search_vector);
create index companies_trgm_idx on public.companies using gin(search_text extensions.gin_trgm_ops);
create table public.company_subscriptions (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id), plan_id uuid not null references public.plans(id),
  origin text not null default 'manual' check(origin='manual'), starts_at timestamptz not null default now(), ends_at timestamptz,
  created_by uuid not null references auth.users(id), check(ends_at is null or ends_at>starts_at)
);
create unique index company_subscriptions_current_idx on public.company_subscriptions(company_id) where ends_at is null;
create index company_subscriptions_plan_idx on public.company_subscriptions(plan_id);
create index company_subscriptions_actor_idx on public.company_subscriptions(created_by);
create table public.products (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id), category_id uuid not null references public.guide_categories(id),
  name text not null check(length(name) between 2 and 100), description text not null check(length(description) between 2 and 2000),
  price_cents integer check(price_cents between 0 and 1000000000), available boolean not null default true,
  search_text text generated always as (guide_private.normalize(name || ' ' || description)) stored,
  search_vector tsvector generated always as (to_tsvector('portuguese'::regconfig,name || ' ' || description)) stored
);
create table public.company_services (like public.products including defaults including generated including constraints);
alter table public.company_services add primary key(id);
alter table public.company_services add foreign key(company_id) references public.companies(id);
alter table public.company_services add foreign key(category_id) references public.guide_categories(id);
create index products_company_idx on public.products(company_id);
create index products_category_idx on public.products(category_id);
create index products_search_idx on public.products using gin(search_vector);
create index products_trgm_idx on public.products using gin(search_text extensions.gin_trgm_ops);
create index company_services_company_idx on public.company_services(company_id);
create index company_services_category_idx on public.company_services(category_id);
create index company_services_search_idx on public.company_services using gin(search_vector);
create index company_services_trgm_idx on public.company_services using gin(search_text extensions.gin_trgm_ops);
create table public.company_media (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id),
  url text not null check(length(url)<=2048 and url ~ '^https://[^/@[:space:]]+([/?#]|$)'),
  alt text not null check(length(alt) between 2 and 200), sort_order integer not null default 0, created_at timestamptz not null default now()
);
create index company_media_company_idx on public.company_media(company_id,sort_order,id);
create table public.company_members (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id), user_id uuid not null references auth.users(id),
  role text not null check(role in ('owner','manager','employee')), unique(company_id,user_id)
);
create index company_members_user_idx on public.company_members(user_id);
create table public.company_favorites (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id), company_id uuid not null references public.companies(id),
  created_at timestamptz not null default now(), unique(user_id,company_id)
);
create index company_favorites_company_idx on public.company_favorites(company_id);
create table public.company_reviews (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id), company_id uuid not null references public.companies(id),
  rating smallint not null check(rating between 1 and 5), comment text not null check(length(comment) between 10 and 1200),
  status text not null default 'pending' check(status in ('pending','published','hidden')), created_at timestamptz not null default now(),
  unique(user_id,company_id)
);
create index company_reviews_company_status_idx on public.company_reviews(company_id,status);
create table public.company_review_reports (
  id uuid primary key default gen_random_uuid(), review_id uuid not null references public.company_reviews(id), user_id uuid not null references auth.users(id),
  reason text not null check(length(reason) between 10 and 1200), status text not null default 'new' check(status in ('new','handled')),
  created_at timestamptz not null default now(), unique(review_id,user_id)
);
create index company_review_reports_user_idx on public.company_review_reports(user_id);
create table public.company_contacts (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id), company_id uuid not null references public.companies(id),
  message text not null check(length(message) between 10 and 1200), status text not null default 'new' check(status in ('new','handled')),
  created_at timestamptz not null default now()
);
create index company_contacts_company_idx on public.company_contacts(company_id);
create index company_contacts_user_idx on public.company_contacts(user_id);
create table public.guide_support_requests (
  id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 2 and 100),
  email text not null check(length(email)<=254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'),
  phone text not null default '' check(length(phone)<=25), kind text not null check(kind in ('business','help','privacy')),
  message text not null check(length(message) between 10 and 2000), status text not null default 'new' check(status in ('new','in_progress','resolved')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index guide_support_status_idx on public.guide_support_requests(status,created_at desc);
create table public.guide_user_status (
  user_id uuid primary key references auth.users(id), blocked boolean not null default false
);
create table public.analytics_events (
  id uuid primary key default gen_random_uuid(), type text not null check(type in ('page_view','search','company_view','product_view','service_view','favorite','contact_start','whatsapp_click','phone_click','website_click','review_created','share','ui_click','web_vital')),
  company_id uuid references public.companies(id), item_id uuid, session_id uuid not null,
  query text not null default '' check(length(query)<=150), route text not null check(length(route)<=200 and route like '/%'),
  target text not null default '' check(length(target)<=100), value numeric check(value between 0 and 1000000),
  created_at timestamptz not null default now()
);
create index analytics_created_idx on public.analytics_events(created_at desc);
create index analytics_company_type_idx on public.analytics_events(company_id,type,created_at desc);
create table public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(), actor_id uuid not null references auth.users(id), action text not null,
  entity_id uuid, before_value jsonb, after_value jsonb, created_at timestamptz not null default now()
);
create index admin_audit_created_idx on public.admin_audit_logs(created_at desc);
create index admin_audit_actor_idx on public.admin_audit_logs(actor_id);
create table public.platform_settings (key text primary key, value jsonb not null);
create table guide_private.rate_limits (key text primary key, window_start timestamptz not null, count integer not null);

create function guide_private.append_only() returns trigger language plpgsql set search_path='' as $$
begin raise exception 'Este registro é imutável.' using errcode='42501'; end;
$$;
create trigger analytics_append_only before update or delete on public.analytics_events for each row execute function guide_private.append_only();
create trigger audit_append_only before update or delete on public.admin_audit_logs for each row execute function guide_private.append_only();

do $$ declare tab text; begin
  foreach tab in array array['guide_categories','guide_neighborhoods','plans','companies','company_subscriptions','products','company_services','company_media','company_members','company_favorites','company_reviews','company_review_reports','company_contacts','guide_support_requests','guide_user_status','analytics_events','admin_audit_logs','platform_settings'] loop
    execute format('alter table public.%I enable row level security',tab);
    execute format('revoke all on table public.%I from public,anon,authenticated',tab);
  end loop;
end $$;

create function guide_private.require_user(admin_only boolean default false) returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid := auth.uid(); begin
  if uid is null or exists(select 1 from public.guide_user_status where user_id=uid and blocked)
     or (admin_only and not public._is_admin()) then
    raise exception 'Acesso não autorizado.' using errcode='42501';
  end if;
  return uid;
end;
$$;
create function guide_private.throttle(action text, max_count integer) returns void language plpgsql security definer set search_path='' as $$
declare current_count integer; begin
  -- Anonymous limits are deliberately shared; add a gateway challenge if public traffic requires finer controls.
  insert into guide_private.rate_limits(key,window_start,count)
  values(action || ':' || coalesce(auth.uid()::text,'anonymous'),date_trunc('minute',now()),1)
  on conflict(key) do update set window_start=excluded.window_start,
    count=case when rate_limits.window_start=excluded.window_start then rate_limits.count+1 else 1 end
  returning count into current_count;
  if current_count>max_count then raise exception 'Muitas tentativas. Aguarde um minuto.'; end if;
end;
$$;
create function guide_private.audit(action text, entity uuid, previous jsonb, current_value jsonb) returns void language sql security definer set search_path='' as $$
  insert into public.admin_audit_logs(actor_id,action,entity_id,before_value,after_value) values(auth.uid(),action,entity,previous,current_value);
$$;

create view guide_private.company_rows as
select c.*, n.name as neighborhood, ct.name as city, ct.slug as city_slug,
  coalesce(s.plan_id,(select id from public.plans where is_active order by (features->>'featured')::boolean,name limit 1)) as plan_id,
  coalesce((select url from public.company_media m where m.company_id=c.id order by sort_order,id limit 1),'') as image,
  coalesce(r.average,0) as rating_average, coalesce(r.count,0) as rating_count
from public.companies c join public.cities ct on ct.id=c.city_id
left join public.guide_neighborhoods n on n.id=c.neighborhood_id
left join lateral (select plan_id from public.company_subscriptions where company_id=c.id and starts_at<=now() and (ends_at is null or ends_at>now()) order by starts_at desc limit 1) s on true
left join lateral (select avg(rating)::numeric as average,count(*) as count from public.company_reviews where company_id=c.id and status='published') r on true;

create view guide_private.item_rows as
select id,company_id,category_id,name,description,price_cents,available,search_text,search_vector,'product'::text as type from public.products
union all
select id,company_id,category_id,name,description,price_cents,available,search_text,search_vector,'service'::text as type from public.company_services;

create function guide_private.catalog(ids uuid[], administrative boolean default false) returns jsonb language sql stable security definer set search_path='' as $$
select jsonb_build_object(
  'source','supabase',
  'categories',coalesce((select jsonb_agg(to_jsonb(t) order by t.sort_order,t.name) from public.guide_categories t where administrative or t.is_active),'[]'::jsonb),
  'plans',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'max_items',(limits->>'items')::integer,'max_media',(limits->>'media')::integer,'featured',case when (features->>'featured')::boolean then 1 else 0 end) order by name) from public.plans where is_active),'[]'::jsonb),
  'companies',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'slug',c.slug,'description',c.description,'category_id',c.category_id,'city_id',c.city_id,'city',c.city,'city_slug',c.city_slug,'neighborhood_id',c.neighborhood_id,'neighborhood',coalesce(c.neighborhood,''),'street',c.street,'address_number',c.address_number,'postal_code',c.postal_code,'address',concat_ws(', ',nullif(c.street,''),nullif(c.address_number,''),c.neighborhood),'phone',case when (administrative or coalesce((select (p.features->>'direct_contact')::boolean from public.plans p where p.id=c.plan_id),false)) then c.phone else '' end,'whatsapp',case when (administrative or coalesce((select (p.features->>'direct_contact')::boolean from public.plans p where p.id=c.plan_id),false)) then c.whatsapp else '' end,'website',case when (administrative or coalesce((select (p.features->>'direct_contact')::boolean from public.plans p where p.id=c.plan_id),false)) then c.website else '' end,'hours',c.hours,'status',c.status,'plan_id',c.plan_id,'image',c.image,'demo',0) order by array_position(ids,c.id)) from guide_private.company_rows c where c.id=any(ids)),'[]'::jsonb),
  'items',coalesce((select jsonb_agg(jsonb_build_object('id',id,'company_id',company_id,'name',name,'description',description,'category_id',category_id,'type',type) order by name,id) from guide_private.item_rows where company_id=any(ids)),'[]'::jsonb),
  'offerings',coalesce((select jsonb_agg(jsonb_build_object('id',id,'company_id',company_id,'product_id',case when type='product' then id end,'service_id',case when type='service' then id end,'price',price_cents/100.0,'available',case when available then 1 else 0 end)) from guide_private.item_rows where company_id=any(ids)),'[]'::jsonb),
  'reviews',coalesce((select jsonb_agg(to_jsonb(t)) from (select r.id,''::text as user_id,r.company_id,r.rating,r.comment,r.status,r.created_at,coalesce(p.full_name,'Cliente') as author from public.company_reviews r left join public.profiles p on p.id=r.user_id where r.company_id=any(ids) and (administrative or r.status='published') order by r.created_at desc limit 120) t),'[]'::jsonb),
  'media',coalesce((select jsonb_agg(jsonb_build_object('id',id,'company_id',company_id,'url',url,'alt',alt) order by sort_order,id) from public.company_media where company_id=any(ids)),'[]'::jsonb),
  'rating_summary',coalesce((select jsonb_object_agg(id::text,jsonb_build_object('average',rating_average,'count',rating_count)) from guide_private.company_rows where id=any(ids)),'{}'::jsonb)
);
$$;

create function guide_private.search_matches(filters jsonb) returns table(id uuid, name text, featured boolean, rating numeric)
language sql stable security definer set search_path='' as $$
with options as (
  select trim(coalesce(filters->>'q','')) as term,coalesce(filters->>'kind','all') as kind,
    nullif(filters->>'itemId','')::uuid as item_id
), selected_item as (
  select i.name,i.category_id,i.type from guide_private.item_rows i join public.companies c on c.id=i.company_id
  where i.id=(select item_id from options) and c.status='active'
)
select c.id,c.name,coalesce((p.features->>'featured')::boolean,false),c.rating_average
from guide_private.company_rows c join public.guide_categories cat on cat.id=c.category_id join public.plans p on p.id=c.plan_id cross join options o
where c.status='active' and cat.is_active
  and (nullif(filters->>'category','') is null or c.category_id=(filters->>'category')::uuid)
  and (nullif(filters->>'companyId','') is null or c.id=(filters->>'companyId')::uuid)
  and (nullif(filters->>'neighborhood','') is null or c.neighborhood=filters->>'neighborhood')
  and (not coalesce((filters->>'featured')::boolean,false) or coalesce((p.features->>'featured')::boolean,false))
  and c.rating_average>=coalesce((filters->>'rating')::numeric,0)
  and (not coalesce((filters->>'favorites')::boolean,false) or exists(select 1 from public.company_favorites f where f.company_id=c.id and f.user_id=auth.uid()))
  and (o.term='' or c.search_vector @@ websearch_to_tsquery('portuguese'::regconfig,o.term)
    or c.search_text operator(extensions.%) guide_private.normalize(o.term)
    or exists(select 1 from guide_private.item_rows i where i.company_id=c.id
      and (o.kind='all' or i.type=o.kind)
      and (not coalesce((filters->>'available')::boolean,false) or i.available)
      and (nullif(filters->>'maxPrice','') is null or i.price_cents<=(filters->>'maxPrice')::numeric*100)
      and (i.search_vector @@ websearch_to_tsquery('portuguese'::regconfig,o.term) or i.search_text operator(extensions.%) guide_private.normalize(o.term))))
  and ((o.kind='all' and not coalesce((filters->>'available')::boolean,false) and nullif(filters->>'maxPrice','') is null and o.item_id is null)
    or exists(select 1 from guide_private.item_rows i where i.company_id=c.id and (o.kind='all' or i.type=o.kind)
      and (not coalesce((filters->>'available')::boolean,false) or i.available)
      and (nullif(filters->>'maxPrice','') is null or i.price_cents<=(filters->>'maxPrice')::numeric*100)
      and (o.item_id is null or exists(select 1 from selected_item si where guide_private.normalize(i.name)=guide_private.normalize(si.name) and i.category_id=si.category_id and i.type=si.type))))
$$;

create function public.guide_search(filters jsonb default '{}'::jsonb) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare page_number integer:=greatest(1,least(100000,coalesce((filters->>'page')::integer,1)));
  page_size integer:=greatest(1,least(24,coalesce((filters->>'pageSize')::integer,12)));
  total_count integer; ids uuid[]; begin
  if length(coalesce(filters->>'q',''))>150 or coalesce(filters->>'kind','all') not in ('all','product','service') or coalesce(filters->>'sort','relevance') not in ('relevance','name','rating') then raise exception 'Confira os filtros da pesquisa.'; end if;
  if coalesce((filters->>'favorites')::boolean,false) then perform guide_private.require_user(); end if;
  select count(*)::integer into total_count from guide_private.search_matches(filters);
  page_number:=least(page_number,greatest(1,ceil(total_count::numeric/page_size)::integer));
  select coalesce(array_agg(id),'{}'::uuid[]) into ids from (
    select m.id from guide_private.search_matches(filters) m
    order by case when coalesce(filters->>'sort','relevance')='rating' then m.rating end desc nulls last,
      case when coalesce(filters->>'sort','relevance')='relevance' then m.featured::integer end desc nulls last,
      m.name,m.id limit page_size offset (page_number-1)*page_size
  ) sorted;
  return guide_private.catalog(ids) || jsonb_build_object('pagination',jsonb_build_object('page',page_number,'pageSize',page_size,'total',total_count,'pages',greatest(1,ceil(total_count::numeric/page_size)::integer)),
    'neighborhoods',coalesce((select jsonb_agg(name order by name) from public.guide_neighborhoods),'[]'::jsonb),'containsExamples',false);
end;
$$;

create function public.guide_company_by_slug(p_city_slug text,p_company_slug text) returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object('id',c.id) from public.companies c join public.cities ct on ct.id=c.city_id where ct.slug=p_city_slug and c.slug=p_company_slug and c.status='active';
$$;
create function public.guide_me() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=auth.uid(); begin
  if uid is null or exists(select 1 from public.guide_user_status where user_id=uid and blocked) then return null; end if;
  return (select jsonb_build_object('id',p.id,'name',coalesce(p.full_name,'Consumidor'),'email',coalesce(auth.jwt()->>'email',''),'phone',coalesce(p.phone,''),'admin',public._is_admin(),
    'favorites',coalesce((select jsonb_agg(company_id) from public.company_favorites where user_id=uid),'[]'::jsonb)) from public.profiles p where p.id=uid);
end;
$$;
create function public.guide_update_profile(payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=guide_private.require_user(); begin
  if payload->>'name' is null or length(trim(payload->>'name')) not between 2 and 120 then raise exception 'Informe seu nome completo.'; end if;
  update public.profiles set full_name=trim(payload->>'name'),phone=nullif(regexp_replace(payload->>'phone','[^+0-9]','','g'),'') where id=uid;
  return jsonb_build_object('ok',true);
end;
$$;
create function public.guide_toggle_favorite(payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=guide_private.require_user(); cid uuid:=(payload->>'company_id')::uuid; saved boolean; begin
  perform guide_private.throttle('favorite',60);
  if not exists(select 1 from public.companies where id=cid and status='active') then raise exception 'Empresa indisponível.'; end if;
  perform 1 from public.profiles where id=uid for update;
  if exists(select 1 from public.company_favorites where user_id=uid and company_id=cid) then
    delete from public.company_favorites where user_id=uid and company_id=cid; saved:=false;
  else insert into public.company_favorites(user_id,company_id) values(uid,cid); saved:=true; end if;
  return jsonb_build_object('saved',saved);
end;
$$;
create function public.guide_review(payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=guide_private.require_user(); cid uuid; begin
  perform guide_private.throttle('review',6);
  if payload ? 'review_id' then
    if not exists(select 1 from public.company_reviews r join public.companies c on c.id=r.company_id where r.id=(payload->>'review_id')::uuid and r.status='published' and c.status='active') then raise exception 'Avaliação indisponível.'; end if;
    insert into public.company_review_reports(review_id,user_id,reason) values((payload->>'review_id')::uuid,uid,trim(payload->>'reason'))
    on conflict(review_id,user_id) do update set reason=excluded.reason,status='new';
  else
    cid:=(payload->>'company_id')::uuid;
    if not exists(select 1 from public.companies where id=cid and status='active') then raise exception 'Empresa indisponível.'; end if;
    insert into public.company_reviews(user_id,company_id,rating,comment) values(uid,cid,(payload->>'rating')::smallint,trim(payload->>'comment'))
    on conflict(user_id,company_id) do update set rating=excluded.rating,comment=excluded.comment,status='pending';
  end if;
  return jsonb_build_object('ok',true);
end;
$$;
create function public.guide_contact(payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=guide_private.require_user(); cid uuid:=(payload->>'company_id')::uuid; begin
  perform guide_private.throttle('contact',5);
  if not exists(select 1 from public.companies where id=cid and status='active') then raise exception 'Empresa indisponível.'; end if;
  insert into public.company_contacts(user_id,company_id,message) values(uid,cid,trim(payload->>'message'));
  return jsonb_build_object('ok',true);
end;
$$;
create function public.guide_support(payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare rid uuid; begin
  perform guide_private.throttle('support',10);
  if coalesce(payload->>'website','')<>'' then raise exception 'Confira os campos e tente novamente.'; end if;
  insert into public.guide_support_requests(name,email,phone,kind,message)
  values(trim(payload->>'name'),lower(trim(payload->>'email')),coalesce(payload->>'phone',''),payload->>'kind',trim(payload->>'message')) returning id into rid;
  return jsonb_build_object('id',rid,'reference','SG-' || upper(substr(replace(rid::text,'-',''),1,12)));
end;
$$;
create function public.guide_event(payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
begin
  if coalesce((payload->>'consent')::boolean,false) is not true then raise exception 'Consentimento necessário.'; end if;
  if coalesce(payload->>'route','') ~ '^/(admin|api)(/|$)' then return jsonb_build_object('ok',true); end if;
  perform guide_private.throttle('analytics',120);
  insert into public.analytics_events(type,company_id,item_id,session_id,query,route,target,value)
  values(payload->>'type',nullif(payload->>'company_id','')::uuid,nullif(payload->>'item_id','')::uuid,(payload->>'session_id')::uuid,
    coalesce(payload->>'query',''),payload->>'route',coalesce(payload->>'target',''),nullif(payload->>'value','')::numeric);
  return jsonb_build_object('ok',true);
end;
$$;

-- These are explicit API endpoints. All other functions and tables remain inaccessible.
revoke all on all functions in schema guide_private from public,anon,authenticated;
do $$ declare signature text; begin
  foreach signature in array array['guide_search(jsonb)','guide_company_by_slug(text,text)','guide_me()','guide_support(jsonb)','guide_event(jsonb)'] loop
    execute 'revoke all on function public.' || signature || ' from public';
    execute 'grant execute on function public.' || signature || ' to anon,authenticated';
  end loop;
  foreach signature in array array['guide_update_profile(jsonb)','guide_toggle_favorite(jsonb)','guide_review(jsonb)','guide_contact(jsonb)'] loop
    execute 'revoke all on function public.' || signature || ' from public,anon';
    execute 'grant execute on function public.' || signature || ' to authenticated';
  end loop;
end $$;

-- Canonical location from IBGE 1100049; no commercial examples or personal data are seeded.
insert into public.cities(ibge_code,name,state,slug,is_launch) values('1100049','Cacoal','RO','cacoal-ro',true)
on conflict(ibge_code) do update set is_launch=true;
insert into public.platform_settings(key,value) values('brand','{"name":"Service Guide","launchCity":"Cacoal"}'::jsonb);
insert into public.plans(name,limits,features) values
  ('FREE','{"items":5,"media":3}','{"featured":false,"direct_contact":false}'),
  ('PRO','{"items":30,"media":12}','{"featured":true,"direct_contact":true}');

create function public.guide_admin_list(p_section text default 'overview',p_page integer default 1,p_query text default '',p_company_id uuid default null,p_days integer default 7)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare ids uuid[]:='{}'; result_rows jsonb:='[]'; total_count integer:=0; page_number integer:=greatest(1,least(p_page,100000));
  metadata jsonb; relation_name text; filter_column text; metrics jsonb:='{}'; begin
  perform guide_private.require_user(true);
  if length(p_query)>150 then raise exception 'Pesquisa muito longa.'; end if;
  if p_company_id is not null then ids:=array[p_company_id]; end if;
  if p_section='companies' then
    select count(*) into total_count from public.companies where p_query='' or name ilike '%'||p_query||'%';
    select coalesce(array_agg(id),'{}') into ids from (select id from public.companies where p_query='' or name ilike '%'||p_query||'%' order by name,id limit 20 offset (page_number-1)*20) t;
  elsif p_section='items' then
    select count(*) into total_count from guide_private.item_rows where (p_company_id is null or company_id=p_company_id) and (p_query='' or name ilike '%'||p_query||'%');
    select coalesce(jsonb_agg(to_jsonb(t)),'[]') into result_rows from (select id,company_id,category_id,name,description,price_cents,available,type from guide_private.item_rows where (p_company_id is null or company_id=p_company_id) and (p_query='' or name ilike '%'||p_query||'%') order by name,id limit 20 offset (page_number-1)*20) t;
  elsif p_section in ('categories','plans','neighborhoods','reviews','contacts','support','media','audit','reports') then
    relation_name:=case p_section when 'categories' then 'guide_categories' when 'plans' then 'plans' when 'neighborhoods' then 'guide_neighborhoods' when 'reviews' then 'company_reviews' when 'contacts' then 'company_contacts' when 'support' then 'guide_support_requests' when 'media' then 'company_media' when 'audit' then 'admin_audit_logs' else 'company_review_reports' end;
    filter_column:=case when p_section in ('categories','plans','neighborhoods','support') then 'name' when p_section='reviews' then 'comment' when p_section='contacts' then 'message' when p_section='media' then 'alt' when p_section='audit' then 'action' else 'reason' end;
    execute format('select count(*) from public.%I where ($1='''' or %I ilike ''%%''||$1||''%%'')',relation_name,filter_column) into total_count using p_query;
    execute format('select coalesce(jsonb_agg(to_jsonb(t)),''[]''::jsonb) from (select * from public.%I where ($1='''' or %I ilike ''%%''||$1||''%%'') order by id limit 20 offset $2) t',relation_name,filter_column)
      into result_rows using p_query,(page_number-1)*20;
  elsif p_section='users' then
    select count(*) into total_count from public.profiles p join auth.users u on u.id=p.id where p_query='' or p.full_name ilike '%'||p_query||'%' or u.email ilike '%'||p_query||'%';
    select coalesce(jsonb_agg(to_jsonb(t)),'[]') into result_rows from (
      select p.id,coalesce(p.full_name,'Consumidor') as name,coalesce(u.email,'') as email,coalesce(p.phone,'') as phone,p.is_admin,case when coalesce(s.blocked,false) then 'blocked' else 'active' end as status
      from public.profiles p join auth.users u on u.id=p.id left join public.guide_user_status s on s.user_id=p.id
      where p_query='' or p.full_name ilike '%'||p_query||'%' or u.email ilike '%'||p_query||'%' order by p.created_at desc,p.id limit 20 offset (page_number-1)*20
    ) t;
  elsif p_section='overview' then
    select jsonb_build_object('companies',(select count(*) from public.companies where status='active'),'pending_reviews',(select count(*) from public.company_reviews where status='pending'),
      'new_contacts',(select count(*) from public.company_contacts where status='new'),'new_support',(select count(*) from public.guide_support_requests where status='new'),
      'views',count(*) filter(where type='company_view'),'searches',count(*) filter(where type='search'),'whatsapp',count(*) filter(where type='whatsapp_click'),
      'top_queries',coalesce((select jsonb_agg(to_jsonb(t)) from (select query,count(*) as count from public.analytics_events where type='search' and query<>'' and created_at>now()-make_interval(days=>greatest(1,least(p_days,365))) group by query order by count(*) desc limit 8) t),'[]'::jsonb))
    into metrics from public.analytics_events where created_at>now()-make_interval(days=>greatest(1,least(p_days,365)));
  else raise exception 'Área administrativa inválida.'; end if;
  metadata:=guide_private.catalog(ids,true);
  if p_section='companies' then result_rows:=metadata->'companies'; end if;
  return jsonb_build_object('catalog',metadata,'rows',result_rows,'metrics',metrics,
    'cities',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'slug',slug)) from public.cities where is_launch),'[]'::jsonb),
    'neighborhoods',coalesce((select jsonb_agg(to_jsonb(t)) from public.guide_neighborhoods t),'[]'::jsonb),
    'pagination',jsonb_build_object('page',page_number,'pageSize',20,'total',total_count,'pages',greatest(1,ceil(total_count::numeric/20)::integer)));
end;
$$;

create function public.guide_admin_save(p_action text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=guide_private.require_user(true); rid uuid:=coalesce(nullif(payload->>'id','')::uuid,gen_random_uuid());
  cid uuid; previous jsonb; current_value jsonb; plan uuid; current_plan uuid; quota integer; current_count integer; item_table text;
begin
  perform guide_private.throttle('admin',90);
  if p_action='company' then
    select to_jsonb(c) into previous from public.companies c where id=rid for update;
    if nullif(payload->>'neighborhood_id','') is not null and not exists(select 1 from public.guide_neighborhoods where id=(payload->>'neighborhood_id')::uuid and city_id=(payload->>'city_id')::bigint) then raise exception 'O bairro precisa pertencer à cidade escolhida.'; end if;
    plan:=(payload->>'plan_id')::uuid;
    if not exists(select 1 from public.plans where id=plan and is_active) then raise exception 'Escolha um plano ativo.'; end if;
    if payload->>'status'='active' and (nullif(payload->>'neighborhood_id','') is null or not exists(select 1 from public.guide_categories where id=(payload->>'category_id')::uuid and is_active)) then raise exception 'Informe uma categoria ativa e o bairro para publicar.'; end if;
    insert into public.companies(id,name,slug,description,category_id,city_id,neighborhood_id,street,address_number,postal_code,phone,whatsapp,website,hours,status)
    values(rid,trim(payload->>'name'),payload->>'slug',trim(payload->>'description'),(payload->>'category_id')::uuid,(payload->>'city_id')::bigint,nullif(payload->>'neighborhood_id','')::uuid,
      coalesce(payload->>'street',''),coalesce(payload->>'address_number',''),coalesce(payload->>'postal_code',''),coalesce(payload->>'phone',''),coalesce(payload->>'whatsapp',''),coalesce(payload->>'website',''),coalesce(payload->>'hours',''),coalesce(payload->>'status','inactive'))
    on conflict(id) do update set name=excluded.name,slug=excluded.slug,description=excluded.description,category_id=excluded.category_id,city_id=excluded.city_id,neighborhood_id=excluded.neighborhood_id,street=excluded.street,address_number=excluded.address_number,postal_code=excluded.postal_code,phone=excluded.phone,whatsapp=excluded.whatsapp,website=excluded.website,hours=excluded.hours,status=excluded.status,updated_at=now()
    returning to_jsonb(companies) into current_value;
    select plan_id into current_plan from public.company_subscriptions where company_id=rid and ends_at is null;
    current_value:=current_value || jsonb_build_object('plan_id',plan);
    if previous is not null then previous:=previous || jsonb_build_object('plan_id',current_plan); end if;
    if current_plan is distinct from plan then
      update public.company_subscriptions set ends_at=greatest(clock_timestamp(),starts_at+interval '1 microsecond') where company_id=rid and ends_at is null;
      insert into public.company_subscriptions(company_id,plan_id,created_by) values(rid,plan,actor);
    end if;
  elsif p_action='category' then
    select to_jsonb(c) into previous from public.guide_categories c where id=rid;
    insert into public.guide_categories(id,name,slug,icon,is_active) values(rid,trim(payload->>'name'),payload->>'slug',payload->>'icon',coalesce((payload->>'is_active')::boolean,true))
    on conflict(id) do update set name=excluded.name,slug=excluded.slug,icon=excluded.icon,is_active=excluded.is_active returning to_jsonb(guide_categories) into current_value;
  elsif p_action='neighborhood' then
    select to_jsonb(n) into previous from public.guide_neighborhoods n where id=rid;
    insert into public.guide_neighborhoods(id,name,city_id) values(rid,trim(payload->>'name'),(payload->>'city_id')::bigint)
    on conflict(id) do update set name=excluded.name,city_id=excluded.city_id returning to_jsonb(guide_neighborhoods) into current_value;
  elsif p_action='plan' then
    select to_jsonb(p) into previous from public.plans p where id=rid;
    insert into public.plans(id,name,limits,features) values(rid,trim(payload->>'name'),jsonb_build_object('items',(payload->>'max_items')::integer,'media',(payload->>'max_media')::integer),jsonb_build_object('featured',coalesce((payload->>'featured')::boolean,false),'direct_contact',coalesce((payload->>'direct_contact')::boolean,false)))
    on conflict(id) do update set name=excluded.name,limits=excluded.limits,features=excluded.features returning to_jsonb(plans) into current_value;
  elsif p_action='item' then
    cid:=(payload->>'company_id')::uuid;
    perform 1 from public.companies where id=cid for update;
    if not found then raise exception 'Empresa indisponível.'; end if;
    if payload->>'type' not in ('product','service') then raise exception 'Tipo de item inválido.'; end if;
    if exists(select 1 from guide_private.item_rows where id=rid and type<>payload->>'type') then raise exception 'O tipo de um item existente não pode ser alterado.'; end if;
    item_table:=case payload->>'type' when 'product' then 'products' else 'company_services' end;
    execute format('select to_jsonb(i) from public.%I i where id=$1',item_table) into previous using rid;
    if previous is not null and (previous->>'company_id')::uuid<>cid then raise exception 'Um item não pode ser transferido de empresa.'; end if;
    select (p.limits->>'items')::integer into quota from guide_private.company_rows c join public.plans p on p.id=c.plan_id where c.id=cid;
    select count(*) into current_count from guide_private.item_rows where company_id=cid;
    if previous is null and (quota is null or current_count>=quota) then raise exception 'O limite de itens do plano foi atingido.'; end if;
    execute format('insert into public.%I(id,company_id,category_id,name,description,price_cents,available) values($1,$2,$3,$4,$5,$6,$7) on conflict(id) do update set category_id=excluded.category_id,name=excluded.name,description=excluded.description,price_cents=excluded.price_cents,available=excluded.available returning to_jsonb(%I)',item_table,item_table)
    into current_value using rid,cid,(payload->>'category_id')::uuid,trim(payload->>'name'),trim(payload->>'description'),nullif(payload->>'price_cents','')::integer,coalesce((payload->>'available')::boolean,true);
  elsif p_action='media' then
    cid:=(payload->>'company_id')::uuid; perform 1 from public.companies where id=cid for update;
    if not found then raise exception 'Empresa indisponível.'; end if;
    select to_jsonb(m) into previous from public.company_media m where id=rid;
    if previous is not null and (previous->>'company_id')::uuid<>cid then raise exception 'A imagem não pode ser transferida de empresa.'; end if;
    select (p.limits->>'media')::integer into quota from guide_private.company_rows c join public.plans p on p.id=c.plan_id where c.id=cid;
    select count(*) into current_count from public.company_media where company_id=cid;
    if previous is null and (quota is null or current_count>=quota) then raise exception 'O limite de imagens do plano foi atingido.'; end if;
    insert into public.company_media(id,company_id,url,alt,sort_order) values(rid,cid,payload->>'url',trim(payload->>'alt'),coalesce((payload->>'sort_order')::integer,0))
    on conflict(id) do update set url=excluded.url,alt=excluded.alt,sort_order=excluded.sort_order returning to_jsonb(company_media) into current_value;
  elsif p_action='review' then
    if payload->>'status' not in ('published','hidden') then raise exception 'Status inválido.'; end if;
    select to_jsonb(r) into previous from public.company_reviews r where id=rid;
    update public.company_reviews set status=payload->>'status' where id=rid returning to_jsonb(company_reviews) into current_value;
  elsif p_action='contact' then
    if payload->>'status' not in ('new','handled') then raise exception 'Status inválido.'; end if;
    select to_jsonb(c) into previous from public.company_contacts c where id=rid;
    update public.company_contacts set status=payload->>'status' where id=rid returning to_jsonb(company_contacts) into current_value;
  elsif p_action='support' then
    if payload->>'status' not in ('new','in_progress','resolved') then raise exception 'Status inválido.'; end if;
    select to_jsonb(s) into previous from public.guide_support_requests s where id=rid;
    update public.guide_support_requests set status=payload->>'status',updated_at=now() where id=rid returning to_jsonb(guide_support_requests) into current_value;
  elsif p_action='report' then
    select to_jsonb(r) into previous from public.company_review_reports r where id=rid;
    update public.company_review_reports set status='handled' where id=rid returning to_jsonb(company_review_reports) into current_value;
  elsif p_action='user' then
    if rid=actor or exists(select 1 from public.profiles where id=rid and is_admin) then raise exception 'Contas administrativas não podem ser bloqueadas por esta ação.'; end if;
    if payload->>'status' not in ('active','blocked') then raise exception 'Status inválido.'; end if;
    select to_jsonb(s) into previous from public.guide_user_status s where user_id=rid;
    insert into public.guide_user_status(user_id,blocked) values(rid,payload->>'status'='blocked') on conflict(user_id) do update set blocked=excluded.blocked returning to_jsonb(guide_user_status) into current_value;
  else raise exception 'Ação administrativa inválida.'; end if;
  if current_value is null then raise exception 'Registro não encontrado.'; end if;
  perform guide_private.audit(p_action,rid,previous,current_value);
  return jsonb_build_object('ok',true,'id',rid);
end;
$$;
revoke all on function public.guide_admin_list(text,integer,text,uuid,integer) from public,anon;
grant execute on function public.guide_admin_list(text,integer,text,uuid,integer) to authenticated;
revoke all on function public.guide_admin_save(text,jsonb) from public,anon;
grant execute on function public.guide_admin_save(text,jsonb) to authenticated;
