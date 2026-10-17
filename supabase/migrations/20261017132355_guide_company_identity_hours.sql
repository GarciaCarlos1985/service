-- Identidade e funcionamento pertencem à empresa; dados legados são preservados.
create function guide_private.valid_weekly_hours(value jsonb) returns boolean
language plpgsql immutable set search_path='' as $$
declare
  day_key text; day_value jsonb; period jsonb; day_number integer:=0;
  starts integer[]:='{}'; ends integer[]:='{}'; a integer; b integer;
  start_minute integer; end_minute integer;
begin
  if jsonb_typeof(value) is distinct from 'object' or octet_length(value::text)>12000
    or jsonb_typeof(value->'days') is distinct from 'object'
    or jsonb_typeof(value->'notes') is distinct from 'string'
    or length(value->>'notes')>1000
    or exists(select 1 from jsonb_object_keys(value) k where k not in ('days','notes'))
    or (select count(*) from jsonb_object_keys(value->'days'))<>7
    or exists(select 1 from jsonb_object_keys(value->'days') k where k not in ('mon','tue','wed','thu','fri','sat','sun')) then return false; end if;
  foreach day_key in array array['mon','tue','wed','thu','fri','sat','sun'] loop
    day_value:=value->'days'->day_key;
    if jsonb_typeof(day_value) is distinct from 'object'
      or jsonb_typeof(day_value->'closed') is distinct from 'boolean'
      or jsonb_typeof(day_value->'all_day') is distinct from 'boolean'
      or jsonb_typeof(day_value->'periods') is distinct from 'array'
      or exists(select 1 from jsonb_object_keys(day_value) k where k not in ('closed','all_day','periods')) then return false; end if;
    if (day_value->>'closed')::boolean then
      if (day_value->>'all_day')::boolean or jsonb_array_length(day_value->'periods')<>0 then return false; end if;
    elsif (day_value->>'all_day')::boolean then
      if jsonb_array_length(day_value->'periods')<>0 then return false; end if;
      starts:=array_append(starts,day_number*1440); ends:=array_append(ends,(day_number+1)*1440);
    else
      if jsonb_array_length(day_value->'periods') not between 1 and 3 then return false; end if;
      for period in select jsonb_array_elements(day_value->'periods') loop
        if jsonb_typeof(period) is distinct from 'object'
          or jsonb_typeof(period->'start') is distinct from 'string'
          or jsonb_typeof(period->'end') is distinct from 'string'
          or (period->>'start') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
          or (period->>'end') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
          or period->>'start'=period->>'end'
          or exists(select 1 from jsonb_object_keys(period) k where k not in ('start','end')) then return false; end if;
        start_minute:=substring(period->>'start',1,2)::integer*60+substring(period->>'start',4,2)::integer;
        end_minute:=substring(period->>'end',1,2)::integer*60+substring(period->>'end',4,2)::integer;
        starts:=array_append(starts,day_number*1440+start_minute);
        ends:=array_append(ends,day_number*1440+end_minute+case when end_minute<start_minute then 1440 else 0 end);
      end loop;
    end if;
    day_number:=day_number+1;
  end loop;
  for a in 1..coalesce(array_length(starts,1),0) loop
    for b in (a+1)..coalesce(array_length(starts,1),0) loop
      if (starts[a]<ends[b] and starts[b]<ends[a])
        or (starts[a]<ends[b]+10080 and starts[b]+10080<ends[a])
        or (starts[a]<ends[b]-10080 and starts[b]-10080<ends[a]) then return false; end if;
    end loop;
  end loop;
  return true;
exception when others then return false;
end;
$$;
revoke all on function guide_private.valid_weekly_hours(jsonb) from public,anon,authenticated;

create function guide_private.weekly_hours_text(value jsonb) returns text
language sql immutable set search_path='' as $$
select string_agg(label||': '||case when (day->>'closed')::boolean then 'Fechado'
  when (day->>'all_day')::boolean then '24 horas'
  else (select string_agg((p->>'start')||'–'||(p->>'end')||case when p->>'end'<p->>'start' then ' (dia seguinte)' else '' end,' · ' order by p->>'start') from jsonb_array_elements(day->'periods') p) end,E'\n' order by position)
  ||case when trim(value->>'notes')<>'' then E'\n'||trim(value->>'notes') else '' end
from (select labels.label,labels.position,value->'days'->labels.key as day from
  unnest(array['mon','tue','wed','thu','fri','sat','sun'],array['Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado','Domingo']) with ordinality labels(key,label,position)) week;
$$;
revoke all on function guide_private.weekly_hours_text(jsonb) from public,anon,authenticated;

alter table public.companies
  add column logo_url text not null default '' check(length(logo_url)<=2048 and (logo_url='' or logo_url ~ '^https://[^/@[:space:]]+([/?#]|$)')),
  add column weekly_hours jsonb check(weekly_hours is null or guide_private.valid_weekly_hours(weekly_hours)),
  drop constraint companies_hours_check,
  add constraint companies_hours_check check(length(hours)<=2000);

create function guide_private.save_company(payload jsonb) returns jsonb
language plpgsql set search_path='' as $$
declare
  actor uuid:=guide_private.require_user(true);
  rid uuid:=coalesce(nullif(payload->>'id','')::uuid,gen_random_uuid());
  previous jsonb; current_value jsonb; plan uuid; current_plan uuid;
  logo_value text; logo_path text; week_value jsonb; hours_value text;
begin
  perform guide_private.throttle('admin',90);
  if jsonb_typeof(payload) is distinct from 'object' or octet_length(payload::text)>32768 then raise exception 'Cadastro de empresa inválido.'; end if;
  perform pg_advisory_xact_lock(hashtextextended('guide-company:'||rid::text,0));
  select to_jsonb(c) into previous from public.companies c where id=rid for update;
  logo_value:=case when payload ? 'logo_url' then payload->>'logo_url' else coalesce(previous->>'logo_url','') end;
  if payload ? 'logo_url' and jsonb_typeof(payload->'logo_url') is distinct from 'string' then raise exception 'Logotipo inválido.'; end if;
  week_value:=nullif(case when payload ? 'weekly_hours' then payload->'weekly_hours' else previous->'weekly_hours' end,'null'::jsonb);
  if week_value is not null and not guide_private.valid_weekly_hours(week_value) then raise exception 'Revise os dias e horários: use intervalos completos, sem sobreposição.'; end if;
  hours_value:=case when week_value is null then coalesce(payload->>'hours','') else guide_private.weekly_hours_text(week_value) end;
  if logo_value<>'' then
    logo_path:=substring(logo_value from '^https?://[^/]+/storage/v1/object/public/guide-media/(.+)$');
    if logo_path is null or logo_path !~ ('^'||rid::text||'/[0-9a-f-]+\.(jpg|png|webp|avif)$')
      or not exists(select 1 from storage.objects where bucket_id='guide-media' and name=logo_path) then
      raise exception 'O logotipo precisa ser uma imagem enviada para esta empresa. Selecione o arquivo e salve novamente.';
    end if;
  end if;
  if nullif(payload->>'neighborhood_id','') is not null and not exists(select 1 from public.guide_neighborhoods where id=(payload->>'neighborhood_id')::uuid and city_id=(payload->>'city_id')::bigint) then raise exception 'O bairro precisa pertencer à cidade escolhida.'; end if;
  plan:=(payload->>'plan_id')::uuid;
  if not exists(select 1 from public.plans where id=plan and is_active) then raise exception 'Escolha um plano ativo.'; end if;
  if payload->>'status'='active' and (nullif(payload->>'neighborhood_id','') is null or not exists(select 1 from public.guide_categories where id=(payload->>'category_id')::uuid and is_active)) then raise exception 'Informe uma categoria ativa e o bairro para publicar.'; end if;
  insert into public.companies(id,name,slug,description,category_id,city_id,neighborhood_id,street,address_number,postal_code,phone,whatsapp,website,hours,status,logo_url,weekly_hours)
  values(rid,trim(payload->>'name'),payload->>'slug',trim(payload->>'description'),(payload->>'category_id')::uuid,(payload->>'city_id')::bigint,nullif(payload->>'neighborhood_id','')::uuid,
    coalesce(payload->>'street',''),coalesce(payload->>'address_number',''),coalesce(payload->>'postal_code',''),coalesce(payload->>'phone',''),coalesce(payload->>'whatsapp',''),coalesce(payload->>'website',''),hours_value,coalesce(payload->>'status','inactive'),logo_value,week_value)
  on conflict(id) do update set name=excluded.name,slug=excluded.slug,description=excluded.description,category_id=excluded.category_id,city_id=excluded.city_id,neighborhood_id=excluded.neighborhood_id,street=excluded.street,address_number=excluded.address_number,postal_code=excluded.postal_code,phone=excluded.phone,whatsapp=excluded.whatsapp,website=excluded.website,hours=excluded.hours,status=excluded.status,logo_url=excluded.logo_url,weekly_hours=excluded.weekly_hours,updated_at=now()
  returning to_jsonb(companies) into current_value;
  select plan_id into current_plan from public.company_subscriptions where company_id=rid and ends_at is null;
  current_value:=current_value||jsonb_build_object('plan_id',plan);
  if previous is not null then previous:=previous||jsonb_build_object('plan_id',current_plan); end if;
  if current_plan is distinct from plan then
    update public.company_subscriptions set ends_at=greatest(clock_timestamp(),starts_at+interval '1 microsecond') where company_id=rid and ends_at is null;
    insert into public.company_subscriptions(company_id,plan_id,created_by) values(rid,plan,actor);
  end if;
  perform guide_private.audit('company',rid,previous,current_value);
  return jsonb_build_object('ok',true,'id',rid);
end;
$$;
revoke all on function guide_private.save_company(jsonb) from public,anon,authenticated;

-- Mantém os contratos públicos e a privacidade; enriquece apenas as empresas selecionadas.
create or replace function guide_private.catalog(ids uuid[], administrative boolean default false) returns jsonb language sql stable security definer set search_path='' as $$
select jsonb_build_object(
  'source','supabase',
  'presentation',public.guide_presentation(),
  'categories',coalesce((select jsonb_agg(to_jsonb(t) order by t.sort_order,t.name) from public.guide_categories t where administrative or t.is_active),'[]'::jsonb),
  'plans',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'max_items',(limits->>'items')::integer,'max_media',(limits->>'media')::integer,'featured',case when (features->>'featured')::boolean then 1 else 0 end) order by name) from public.plans where is_active),'[]'::jsonb),
  'companies',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'slug',c.slug,'description',c.description,'category_id',c.category_id,'city_id',c.city_id,'city',c.city,'city_slug',c.city_slug,'neighborhood_id',c.neighborhood_id,'neighborhood',coalesce(c.neighborhood,''),'street',c.street,'address_number',c.address_number,'postal_code',c.postal_code,'address',concat_ws(', ',nullif(c.street,''),nullif(c.address_number,''),c.neighborhood),'phone',case when (administrative or coalesce((select (p.features->>'direct_contact')::boolean from public.plans p where p.id=c.plan_id),false)) then c.phone else '' end,'whatsapp',case when (administrative or coalesce((select (p.features->>'direct_contact')::boolean from public.plans p where p.id=c.plan_id),false)) then c.whatsapp else '' end,'website',case when (administrative or coalesce((select (p.features->>'direct_contact')::boolean from public.plans p where p.id=c.plan_id),false)) then c.website else '' end,'hours',c.hours,'logo_url',identity.logo_url,'weekly_hours',identity.weekly_hours,'status',c.status,'plan_id',c.plan_id,'image',c.image,'demo',0) order by array_position(ids,c.id)) from guide_private.company_rows c join public.companies identity on identity.id=c.id where c.id=any(ids)),'[]'::jsonb),
  'items',coalesce((select jsonb_agg(jsonb_build_object('id',id,'company_id',company_id,'name',name,'description',description,'category_id',category_id,'type',type) order by sort_order,name,id) from guide_private.item_rows where company_id=any(ids)),'[]'::jsonb),
  'offerings',coalesce((select jsonb_agg(jsonb_build_object('id',id,'company_id',company_id,'product_id',case when type='product' then id end,'service_id',case when type='service' then id end,'price',price_cents/100.0,'available',case when available then 1 else 0 end)) from guide_private.item_rows where company_id=any(ids)),'[]'::jsonb),
  'reviews',coalesce((select jsonb_agg(to_jsonb(t)) from (select r.id,''::text as user_id,r.company_id,r.rating,r.comment,r.status,r.created_at,coalesce(p.full_name,'Cliente') as author from public.company_reviews r left join public.profiles p on p.id=r.user_id where r.company_id=any(ids) and (administrative or r.status='published') order by r.created_at desc limit 120) t),'[]'::jsonb),
  'media',coalesce((select jsonb_agg(jsonb_build_object('id',id,'company_id',company_id,'url',url,'alt',alt) order by sort_order,id) from public.company_media where company_id=any(ids) and (administrative or is_active)),'[]'::jsonb),
  'rating_summary',coalesce((select jsonb_object_agg(id::text,jsonb_build_object('average',rating_average,'count',rating_count)) from guide_private.company_rows where id=any(ids)),'{}'::jsonb)
);
$$;

create or replace function public.guide_admin_save(p_action text,payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare previous jsonb; config jsonb; revision_value integer; rid uuid:=gen_random_uuid(); begin
 if p_action='company' then return guide_private.save_company(payload); end if;
 if p_action<>'settings' then return guide_private.guide_admin_save(p_action,payload); end if;
 perform guide_private.require_user(true);
 perform guide_private.throttle('admin',90);
 if jsonb_typeof(payload->'value') is distinct from 'object' then raise exception 'Configuração inválida.'; end if;
 perform pg_advisory_xact_lock(hashtextextended('guide-presentation',0));
 select value,revision into previous,revision_value from public.platform_settings where key='presentation' for update;
 if coalesce(revision_value,0) is distinct from (payload->>'revision')::integer then raise exception 'A configuração mudou em outra sessão. Atualize antes de salvar.'; end if;
 config:=coalesce(previous,'{}'::jsonb)||(payload->'value');
 perform guide_private.validate_site_config(config);
 insert into public.platform_settings(key,value,revision) values('presentation',config,1)
 on conflict(key) do update set value=excluded.value,revision=platform_settings.revision+1;
 perform guide_private.audit('settings',rid,previous,config);
 return jsonb_build_object('ok',true,'id',rid);
end;
$$;
revoke all on function public.guide_admin_save(text,jsonb) from public,anon;
grant execute on function public.guide_admin_save(text,jsonb) to authenticated;
notify pgrst, 'reload schema';
