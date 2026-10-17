-- Extensão compatível do catálogo e da administração. Nenhum dado legado é removido.
create or replace function guide_private.valid_session() returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(
   select 1 from auth.sessions s where s.id::text=auth.jwt()->>'session_id'
   and s.user_id=auth.uid() and (s.not_after is null or s.not_after>now())
 );
$$;
revoke all on function guide_private.valid_session() from public,anon,authenticated;

create or replace function guide_private.require_user(admin_only boolean default false) returns uuid
language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=auth.uid(); begin
 if uid is null or not guide_private.valid_session()
 or exists(select 1 from public.guide_user_status where user_id=uid and blocked)
 or (admin_only and not exists(select 1 from public.profiles where id=uid and is_admin)) then
   raise exception 'Acesso não autorizado ou sessão encerrada.' using errcode='42501';
 end if;
 if admin_only and exists(select 1 from auth.mfa_factors where user_id=uid and status='verified')
 and coalesce(auth.jwt()->>'aal','aal1')<>'aal2' then
   raise exception 'Confirme o código do autenticador para acessar o painel.' using errcode='42501',hint='MFA_REQUIRED';
 end if;
 return uid;
end;
$$;

-- O predicado compartilhado também protege os RPCs administrativos do legado.
create or replace function public._is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select guide_private.valid_session()
 and exists(select 1 from public.profiles where id=auth.uid() and is_admin)
 and not exists(select 1 from public.guide_user_status where user_id=auth.uid() and blocked)
 and (coalesce(auth.jwt()->>'aal','aal1')='aal2' or not exists(select 1 from auth.mfa_factors where user_id=auth.uid() and status='verified'));
$$;

alter table public.products add column sort_order integer not null default 0;
alter table public.company_services add column sort_order integer not null default 0;
alter table public.company_media add column is_active boolean not null default true;
alter table public.platform_settings add column revision integer not null default 1;
create index guide_products_order_idx on public.products(company_id,sort_order,id);
create index guide_services_order_idx on public.company_services(company_id,sort_order,id);

create or replace view guide_private.item_rows as
select id,company_id,category_id,name,description,price_cents,available,search_text,search_vector,'product'::text as type,sort_order from public.products
union all
select id,company_id,category_id,name,description,price_cents,available,search_text,search_vector,'service'::text as type,sort_order from public.company_services;

create or replace view guide_private.company_rows as
select c.*, n.name as neighborhood, ct.name as city, ct.slug as city_slug,
  coalesce(s.plan_id,(select id from public.plans where is_active order by (features->>'featured')::boolean,name limit 1)) as plan_id,
  coalesce((select url from public.company_media m where m.company_id=c.id and m.is_active order by sort_order,id limit 1),'') as image,
  coalesce(r.average,0) as rating_average, coalesce(r.count,0) as rating_count
from public.companies c join public.cities ct on ct.id=c.city_id
left join public.guide_neighborhoods n on n.id=c.neighborhood_id
left join lateral (select plan_id from public.company_subscriptions where company_id=c.id and starts_at<=now() and (ends_at is null or ends_at>now()) order by starts_at desc limit 1) s on true
left join lateral (select avg(rating)::numeric as average,count(*) as count from public.company_reviews where company_id=c.id and status='published') r on true;


create or replace function public.guide_me() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=auth.uid(); begin
  if uid is null or not guide_private.valid_session() or exists(select 1 from public.guide_user_status where user_id=uid and blocked) then return null; end if;
  return (select jsonb_build_object('id',p.id,'name',coalesce(p.full_name,'Consumidor'),'email',coalesce(auth.jwt()->>'email',''),'phone',coalesce(p.phone,''),'admin',coalesce(p.is_admin,false),
    'favorites',coalesce((select jsonb_agg(company_id) from public.company_favorites where user_id=uid),'[]'::jsonb)) from public.profiles p where p.id=uid);
end;
$$;

create function public.guide_presentation() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce((select value from public.platform_settings where key='presentation'),'{}'::jsonb);
$$;
revoke all on function public.guide_presentation() from public;
grant execute on function public.guide_presentation() to anon,authenticated;

create or replace function guide_private.catalog(ids uuid[], administrative boolean default false) returns jsonb language sql stable security definer set search_path='' as $$
select jsonb_build_object(
  'source','supabase',
  'presentation',public.guide_presentation(),
  'categories',coalesce((select jsonb_agg(to_jsonb(t) order by t.sort_order,t.name) from public.guide_categories t where administrative or t.is_active),'[]'::jsonb),
  'plans',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'max_items',(limits->>'items')::integer,'max_media',(limits->>'media')::integer,'featured',case when (features->>'featured')::boolean then 1 else 0 end) order by name) from public.plans where is_active),'[]'::jsonb),
  'companies',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'slug',c.slug,'description',c.description,'category_id',c.category_id,'city_id',c.city_id,'city',c.city,'city_slug',c.city_slug,'neighborhood_id',c.neighborhood_id,'neighborhood',coalesce(c.neighborhood,''),'street',c.street,'address_number',c.address_number,'postal_code',c.postal_code,'address',concat_ws(', ',nullif(c.street,''),nullif(c.address_number,''),c.neighborhood),'phone',case when (administrative or coalesce((select (p.features->>'direct_contact')::boolean from public.plans p where p.id=c.plan_id),false)) then c.phone else '' end,'whatsapp',case when (administrative or coalesce((select (p.features->>'direct_contact')::boolean from public.plans p where p.id=c.plan_id),false)) then c.whatsapp else '' end,'website',case when (administrative or coalesce((select (p.features->>'direct_contact')::boolean from public.plans p where p.id=c.plan_id),false)) then c.website else '' end,'hours',c.hours,'status',c.status,'plan_id',c.plan_id,'image',c.image,'demo',0) order by array_position(ids,c.id)) from guide_private.company_rows c where c.id=any(ids)),'[]'::jsonb),
  'items',coalesce((select jsonb_agg(jsonb_build_object('id',id,'company_id',company_id,'name',name,'description',description,'category_id',category_id,'type',type) order by sort_order,name,id) from guide_private.item_rows where company_id=any(ids)),'[]'::jsonb),
  'offerings',coalesce((select jsonb_agg(jsonb_build_object('id',id,'company_id',company_id,'product_id',case when type='product' then id end,'service_id',case when type='service' then id end,'price',price_cents/100.0,'available',case when available then 1 else 0 end)) from guide_private.item_rows where company_id=any(ids)),'[]'::jsonb),
  'reviews',coalesce((select jsonb_agg(to_jsonb(t)) from (select r.id,''::text as user_id,r.company_id,r.rating,r.comment,r.status,r.created_at,coalesce(p.full_name,'Cliente') as author from public.company_reviews r left join public.profiles p on p.id=r.user_id where r.company_id=any(ids) and (administrative or r.status='published') order by r.created_at desc limit 120) t),'[]'::jsonb),
  'media',coalesce((select jsonb_agg(jsonb_build_object('id',id,'company_id',company_id,'url',url,'alt',alt) order by sort_order,id) from public.company_media where company_id=any(ids) and (administrative or is_active)),'[]'::jsonb),
  'rating_summary',coalesce((select jsonb_object_agg(id::text,jsonb_build_object('average',rating_average,'count',rating_count)) from guide_private.company_rows where id=any(ids)),'{}'::jsonb)
);
$$;

create or replace function public.guide_admin_list(p_section text default 'overview',p_page integer default 1,p_query text default '',p_company_id uuid default null,p_days integer default 7)
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
    select coalesce(jsonb_agg(to_jsonb(t)),'[]') into result_rows from (select id,company_id,category_id,name,description,price_cents,available,type,sort_order from guide_private.item_rows where (p_company_id is null or company_id=p_company_id) and (p_query='' or name ilike '%'||p_query||'%') order by sort_order,name,id limit 20 offset (page_number-1)*20) t;
  elsif p_section='media' then
    select count(*) into total_count from public.company_media where (p_company_id is null or company_id=p_company_id) and (p_query='' or alt ilike '%'||p_query||'%');
    select coalesce(jsonb_agg(to_jsonb(t)),'[]') into result_rows from (select * from public.company_media where (p_company_id is null or company_id=p_company_id) and (p_query='' or alt ilike '%'||p_query||'%') order by sort_order,id limit 20 offset (page_number-1)*20) t;
  elsif p_section='settings' then
    select jsonb_build_array(jsonb_build_object('id','presentation','value',coalesce(value,'{}'::jsonb),'revision',coalesce(revision,1))) into result_rows from public.platform_settings where key='presentation';
    result_rows:=coalesce(result_rows,'[{"id":"presentation","value":{},"revision":0}]'::jsonb); total_count:=1;
  elsif p_section in ('categories','plans','neighborhoods','reviews','contacts','support','media','audit','reports') then
    relation_name:=case p_section when 'categories' then 'guide_categories' when 'plans' then 'plans' when 'neighborhoods' then 'guide_neighborhoods' when 'reviews' then 'company_reviews' when 'contacts' then 'company_contacts' when 'support' then 'guide_support_requests' when 'media' then 'company_media' when 'audit' then 'admin_audit_logs' else 'company_review_reports' end;
    filter_column:=case when p_section in ('categories','plans','neighborhoods','support') then 'name' when p_section='reviews' then 'comment' when p_section='contacts' then 'message' when p_section='media' then 'alt' when p_section='audit' then 'action' else 'reason' end;
    execute format('select count(*) from public.%I where ($1='''' or %I ilike ''%%''||$1||''%%'')',relation_name,filter_column) into total_count using p_query;
    execute format('select coalesce(jsonb_agg(to_jsonb(t)),''[]''::jsonb) from (select * from public.%I where ($1='''' or %I ilike ''%%''||$1||''%%'') order by %s limit 20 offset $2) t',relation_name,filter_column,case when p_section='categories' then 'sort_order,name,id' when p_section in ('plans','neighborhoods') then 'name,id' else 'created_at desc,id' end)
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

create or replace function public.guide_admin_save(p_action text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=guide_private.require_user(true); rid uuid:=coalesce(nullif(payload->>'id','')::uuid,gen_random_uuid());
  cid uuid; previous jsonb; current_value jsonb; plan uuid; current_plan uuid; quota integer; current_count integer; item_table text; config jsonb; revision_value integer;
begin
  perform guide_private.throttle('admin',90);
  if p_action='settings' then
    config:=payload->'value';
    if jsonb_typeof(config)<>'object' or config is null or octet_length(config::text)>12000 then raise exception 'Configuração inválida.'; end if;
    if exists(select 1 from jsonb_object_keys(config) k where k not in ('heroTitle','heroDescription','searchPlaceholder','quickSearches','showSuggestions','showSpotlight')) then raise exception 'Campo de configuração desconhecido.'; end if;
    if jsonb_typeof(config->'heroTitle') is distinct from 'string' or length(trim(config->>'heroTitle')) not between 3 and 80
      or jsonb_typeof(config->'heroDescription') is distinct from 'string' or length(trim(config->>'heroDescription')) not between 10 and 300
      or jsonb_typeof(config->'searchPlaceholder') is distinct from 'string' or length(trim(config->>'searchPlaceholder')) not between 3 and 100
      or jsonb_typeof(config->'showSuggestions') is distinct from 'boolean' or jsonb_typeof(config->'showSpotlight') is distinct from 'boolean'
      or jsonb_typeof(config->'quickSearches') is distinct from 'array' then raise exception 'Revise os textos e opções da apresentação.'; end if;
    if jsonb_array_length(config->'quickSearches')>8 or exists(select 1 from jsonb_array_elements(config->'quickSearches') entry where jsonb_typeof(entry)<>'string' or length(trim(entry#>>'{}')) not between 2 and 80) then raise exception 'Use até oito sugestões com 2 a 80 caracteres.'; end if;
    perform pg_advisory_xact_lock(hashtextextended('guide-presentation',0));
    select value,revision into previous,revision_value from public.platform_settings where key='presentation' for update;
    if coalesce(revision_value,0) is distinct from (payload->>'revision')::integer then raise exception 'A configuração mudou em outra sessão. Atualize antes de salvar.'; end if;
    insert into public.platform_settings(key,value,revision) values('presentation',config,1)
    on conflict(key) do update set value=excluded.value,revision=platform_settings.revision+1 returning value into current_value;
  elsif p_action='company' then
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
    insert into public.company_media(id,company_id,url,alt,sort_order,is_active) values(rid,cid,payload->>'url',trim(payload->>'alt'),coalesce((payload->>'sort_order')::integer,(previous->>'sort_order')::integer,(select coalesce(max(sort_order),-1)+1 from public.company_media where company_id=cid)),coalesce((payload->>'is_active')::boolean,true))
    on conflict(id) do update set url=excluded.url,alt=excluded.alt,sort_order=excluded.sort_order,is_active=excluded.is_active returning to_jsonb(company_media) into current_value;
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

create function public.guide_admin_order(p_scope text,p_company_id uuid default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb; begin
 perform guide_private.require_user(true);
 if p_scope='categories' then
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'sort_order',sort_order,'active',is_active) order by sort_order,name,id),'[]') into result from public.guide_categories;
 elsif p_scope='media' and p_company_id is not null then
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',alt,'url',url,'sort_order',sort_order,'active',is_active) order by sort_order,id),'[]') into result from public.company_media where company_id=p_company_id;
 elsif p_scope='items' and p_company_id is not null then
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'type',type,'sort_order',sort_order,'active',available) order by sort_order,name,id),'[]') into result from guide_private.item_rows where company_id=p_company_id;
 else raise exception 'Escolha uma empresa e uma área válida para organizar.'; end if;
 if jsonb_array_length(result)>500 then raise exception 'Esta lista exige organização por lotes. Entre em contato com o responsável técnico.'; end if;
 return result;
end;
$$;

create function public.guide_admin_reorder(p_scope text,p_order uuid[],p_expected uuid[],p_company_id uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare expected uuid[]; rows_json jsonb; begin
 perform guide_private.require_user(true); perform guide_private.throttle('admin',90);
 if p_scope not in ('categories','media','items') or p_scope is null then raise exception 'Área inválida.'; end if;
 if p_order is null or cardinality(p_order)>500 or cardinality(p_order)<1 or array_position(p_order,null) is not null
 or cardinality(p_order)<>(select count(distinct id) from unnest(p_order) id) then raise exception 'A ordem deve conter cada registro uma única vez.'; end if;
 if p_scope='categories' then lock table public.guide_categories in share row exclusive mode;
 else perform 1 from public.companies where id=p_company_id for update; if not found then raise exception 'Empresa indisponível.'; end if; end if;
 rows_json:=public.guide_admin_order(p_scope,p_company_id);
 select array_agg((r->>'id')::uuid order by ordinal) into expected from jsonb_array_elements(rows_json) with ordinality t(r,ordinal);
 if p_expected is distinct from expected then raise exception 'A lista mudou em outra sessão. Atualize antes de salvar a ordem.'; end if;
 if cardinality(p_order)<>cardinality(expected) or not p_order @> expected then raise exception 'A ordem contém registros de outra lista ou está incompleta.'; end if;
 if p_scope='categories' then
  update public.guide_categories c set sort_order=o.position-1 from unnest(p_order) with ordinality o(id,position) where c.id=o.id;
 elsif p_scope='media' then
  update public.company_media c set sort_order=o.position-1 from unnest(p_order) with ordinality o(id,position) where c.id=o.id and c.company_id=p_company_id;
 else
  update public.products c set sort_order=o.position-1 from unnest(p_order) with ordinality o(id,position) where c.id=o.id and c.company_id=p_company_id;
  update public.company_services c set sort_order=o.position-1 from unnest(p_order) with ordinality o(id,position) where c.id=o.id and c.company_id=p_company_id;
 end if;
 perform guide_private.audit('reorder_'||p_scope,p_company_id,jsonb_build_object('order',p_expected),jsonb_build_object('order',p_order));
 return jsonb_build_object('ok',true);
end;
$$;
revoke all on function public.guide_admin_order(text,uuid), public.guide_admin_reorder(text,uuid[],uuid[],uuid) from public,anon;
grant execute on function public.guide_admin_order(text,uuid), public.guide_admin_reorder(text,uuid[],uuid[],uuid) to authenticated;

-- Upload novo por nome único: sem substituição de arquivos ou leitura privada.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('guide-media','guide-media',true,5242880,array['image/jpeg','image/png','image/webp','image/avif']);
create function public.guide_admin_upload_allowed(object_name text) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 perform guide_private.require_user(true);
 if object_name !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}[.](jpg|jpeg|png|webp|avif)$' then return false; end if;
 return exists(select 1 from public.companies where id::text=split_part(object_name,'/',1));
exception when insufficient_privilege then return false;
end;
$$;
revoke all on function public.guide_admin_upload_allowed(text) from public,anon;
grant execute on function public.guide_admin_upload_allowed(text) to authenticated;
create policy guide_media_insert_admin on storage.objects for insert to authenticated
with check(bucket_id='guide-media' and public.guide_admin_upload_allowed(name));
create policy guide_media_select_admin on storage.objects for select to authenticated
using(bucket_id='guide-media' and public.guide_admin_upload_allowed(name));
create policy guide_media_cleanup_own on storage.objects for delete to authenticated
using(bucket_id='guide-media' and owner_id=auth.uid()::text and public.guide_admin_upload_allowed(name));

-- Funções legadas sinalizadas pelo advisor: fixar a resolução de objetos sem mudar contratos.
alter function public.set_updated_at() set search_path='';
alter function public.slugify(text) set search_path=public,extensions;
notify pgrst,'reload schema';

create function public.guide_admin_company(p_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform guide_private.require_user(true);
 return guide_private.catalog(array[p_id],true)->'companies'->0;
end;
$$;
revoke all on function public.guide_admin_company(uuid) from public,anon;
grant execute on function public.guide_admin_company(uuid) to authenticated;

create function public.guide_admin_set_role(p_user_id uuid,p_admin boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=guide_private.require_user(true); previous jsonb; current_value jsonb; recent numeric;
begin
  perform guide_private.throttle('admin',90);
  if p_admin is null or p_user_id is null or p_user_id=actor then raise exception 'Peça a outro administrador para alterar seu próprio acesso.'; end if;
  select max((entry->>'timestamp')::numeric) into recent from jsonb_array_elements(coalesce(auth.jwt()->'amr','[]')) entry where entry->>'method' in ('password','totp');
  if coalesce(recent,0)<extract(epoch from now())-900 then raise exception 'Confirme sua senha ou autenticador novamente para alterar acessos.' using errcode='42501',hint='REAUTH_REQUIRED'; end if;
  perform pg_advisory_xact_lock(hashtextextended('guide-admin-roles',0));
  perform guide_private.require_user(true);
  if not exists(select 1 from auth.users u join public.profiles p on p.id=u.id where u.id=p_user_id and u.email_confirmed_at is not null)
    or exists(select 1 from public.guide_user_status where user_id=p_user_id and blocked) then raise exception 'Escolha uma conta confirmada e desbloqueada.'; end if;
  select jsonb_build_object('id',id,'is_admin',is_admin) into previous from public.profiles where id=p_user_id for update;
  if not p_admin and (select count(*) from public.profiles where is_admin)<2 then raise exception 'Mantenha pelo menos um administrador ativo.'; end if;
  update public.profiles set is_admin=p_admin where id=p_user_id returning jsonb_build_object('id',id,'is_admin',is_admin) into current_value;
  perform guide_private.audit('admin_role',p_user_id,previous,current_value);
  return jsonb_build_object('ok',true);
end;
$$;
revoke all on function public.guide_admin_set_role(uuid,boolean) from public,anon;
grant execute on function public.guide_admin_set_role(uuid,boolean) to authenticated;
