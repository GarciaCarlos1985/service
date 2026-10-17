-- Personalização aditiva: textos, paleta e vitrines. Não altera dados comerciais nem senhas.
create function guide_private.validate_site_config(config jsonb) returns void
language plpgsql set search_path='' as $$
declare entry jsonb; item record; field text; max_length integer; begin
 if config is null or jsonb_typeof(config)<>'object' or octet_length(config::text)>32768 then raise exception 'Configuração inválida ou muito longa.'; end if;
 if exists(select 1 from jsonb_object_keys(config) k where k not in ('heroTitle','heroDescription','searchPlaceholder','searchButtonLabel','resultsTitle','favoritesTitle','favoritesDescription','emptyTitle','emptyDescription','businessTitle','businessDescription','businessButtonLabel','footerTagline','quickSearches','showSuggestions','showSpotlight','theme','spotlightMode','spotlights')) then raise exception 'Campo de configuração desconhecido.'; end if;
 if jsonb_typeof(config->'heroTitle') is distinct from 'string' or length(trim(config->>'heroTitle')) not between 3 and 80
 or jsonb_typeof(config->'heroDescription') is distinct from 'string' or length(trim(config->>'heroDescription')) not between 10 and 300
 or jsonb_typeof(config->'searchPlaceholder') is distinct from 'string' or length(trim(config->>'searchPlaceholder')) not between 3 and 100
 or jsonb_typeof(config->'showSuggestions') is distinct from 'boolean' or jsonb_typeof(config->'showSpotlight') is distinct from 'boolean'
 or jsonb_typeof(config->'quickSearches') is distinct from 'array' then raise exception 'Revise os textos e opções da apresentação.'; end if;
 if jsonb_array_length(config->'quickSearches')>8 or exists(select 1 from jsonb_array_elements(config->'quickSearches') e where jsonb_typeof(e)<>'string' or length(trim(e#>>'{}')) not between 2 and 80) then raise exception 'Use até oito sugestões com 2 a 80 caracteres.'; end if;
 for item in select * from jsonb_each(config) where key in ('searchButtonLabel','resultsTitle','favoritesTitle','favoritesDescription','emptyTitle','emptyDescription','businessTitle','businessDescription','businessButtonLabel','footerTagline') loop
  max_length:=case when item.key='searchButtonLabel' then 30 when item.key='businessButtonLabel' then 40 when item.key in ('favoritesDescription','emptyDescription','businessDescription','footerTagline') then 300 else 80 end;
  if jsonb_typeof(item.value)<>'string' or length(trim(item.value#>>'{}')) not between 2 and max_length then raise exception 'Revise o texto: %.',item.key; end if;
 end loop;
 if config ? 'theme' then
  if jsonb_typeof(config->'theme')<>'object' then raise exception 'Paleta inválida.'; end if;
  if exists(select 1 from jsonb_object_keys(config->'theme') k where k not in ('primary','navy','accent','background','surface','badge')) then raise exception 'Cor desconhecida.'; end if;
  foreach field in array array['primary','navy','accent','background','surface','badge'] loop
   if jsonb_typeof(config->'theme'->field) is distinct from 'string' or (config->'theme'->>field)!~'^#[0-9a-fA-F]{6}$' then raise exception 'Use cores no formato #0b2948.'; end if;
  end loop;
 end if;
 if config ? 'spotlightMode' and (jsonb_typeof(config->'spotlightMode')<>'string' or config->>'spotlightMode' not in ('automatic','manual')) then raise exception 'Escolha a apresentação automática ou manual.'; end if;
 if config ? 'spotlights' then
  if jsonb_typeof(config->'spotlights')<>'array' then raise exception 'Lista de vitrines inválida.'; end if;
  if jsonb_array_length(config->'spotlights')>12 then raise exception 'Use até 12 vitrines por vez.'; end if;
  if (select count(*)<>count(distinct e->>'id') from jsonb_array_elements(config->'spotlights') e) then raise exception 'Cada vitrine precisa de um identificador único.'; end if;
  for entry in select * from jsonb_array_elements(config->'spotlights') loop
   if jsonb_typeof(entry)<>'object' then raise exception 'Vitrine inválida.'; end if;
   if exists(select 1 from jsonb_object_keys(entry) k where k not in ('id','companyId','title','description','imageUrl','imageAlt','enabled')) then raise exception 'Campo desconhecido na vitrine.'; end if;
   if jsonb_typeof(entry->'id') is distinct from 'string' or jsonb_typeof(entry->'companyId') is distinct from 'string' or nullif(entry->>'id','')::uuid is null or nullif(entry->>'companyId','')::uuid is null then raise exception 'Escolha a empresa da vitrine.'; end if;
   if jsonb_typeof(entry->'enabled') is distinct from 'boolean' or jsonb_typeof(entry->'title') is distinct from 'string' or length(entry->>'title')>80 or jsonb_typeof(entry->'description') is distinct from 'string' or length(entry->>'description')>160 or jsonb_typeof(entry->'imageAlt') is distinct from 'string' or length(entry->>'imageAlt')>160 or jsonb_typeof(entry->'imageUrl') is distinct from 'string' or length(entry->>'imageUrl')>2048 then raise exception 'Revise os textos e a imagem da vitrine.'; end if;
   if entry->>'imageUrl'<>'' and entry->>'imageUrl'!~'^https://[^[:space:]]+$' then raise exception 'Use https:// no endereço da imagem.'; end if;
   if config->>'showSpotlight'='true' and config->>'spotlightMode'='manual' and entry->>'enabled'='true' and not exists(select 1 from guide_private.company_rows c join public.plans p on p.id=c.plan_id where c.id=(entry->>'companyId')::uuid and c.status='active' and coalesce((p.features->>'featured')::boolean,false) and coalesce(nullif(entry->>'imageUrl',''),c.image)<>'') then raise exception 'A vitrine ativa precisa de empresa publicada, plano com destaque e imagem. Ajuste a empresa ou mantenha a vitrine desativada.'; end if;
  end loop;
 end if;
end;
$$;
revoke all on function guide_private.validate_site_config(jsonb) from public,anon,authenticated;

-- Mantém a implementação de catálogo existente e amplia apenas a gravação da apresentação.
alter function public.guide_admin_save(text,jsonb) set schema guide_private;
revoke all on function guide_private.guide_admin_save(text,jsonb) from public,anon,authenticated;
create function public.guide_admin_save(p_action text,payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare previous jsonb; config jsonb; revision_value integer; rid uuid:=gen_random_uuid(); begin
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

-- Configurações públicas nunca revelam vitrines desativadas ou empresas fora do ar.
create or replace function public.guide_presentation() returns jsonb
language sql stable security definer set search_path='' as $$
 with configuration as(select coalesce((select value from public.platform_settings where key='presentation'),'{}'::jsonb) as value)
 select value||jsonb_build_object('spotlights',coalesce((select jsonb_agg(e.slide order by e.position) from jsonb_array_elements(coalesce(value->'spotlights','[]'::jsonb)) with ordinality e(slide,position) join guide_private.company_rows c on c.id::text=e.slide->>'companyId' join public.plans p on p.id=c.plan_id where value->>'spotlightMode'='manual' and value->>'showSpotlight'='true' and e.slide->>'enabled'='true' and c.status='active' and coalesce((p.features->>'featured')::boolean,false) and coalesce(nullif(e.slide->>'imageUrl',''),c.image)<>''),'[]'::jsonb)) from configuration;
$$;

create function public.guide_showcase() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare config jsonb:=public.guide_presentation(); ids uuid[]:='{}'; begin
 if coalesce((config->>'showSpotlight')::boolean,true) then
  if config->>'spotlightMode'='manual' then
   select coalesce(array_agg((e.slide->>'companyId')::uuid order by e.position),'{}') into ids from jsonb_array_elements(config->'spotlights') with ordinality e(slide,position);
  else
   select coalesce(array_agg(id order by name,id),'{}') into ids from (select c.id,c.name from guide_private.company_rows c join public.plans p on p.id=c.plan_id where c.status='active' and c.image<>'' and coalesce((p.features->>'featured')::boolean,false) order by c.name,c.id limit 12) candidates;
  end if;
 end if;
 return guide_private.catalog(ids);
end;
$$;
revoke all on function public.guide_showcase() from public;
grant execute on function public.guide_showcase() to anon,authenticated;
notify pgrst,'reload schema';
