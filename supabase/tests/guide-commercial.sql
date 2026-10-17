-- Executar somente por scripts/sql-tests.mjs: toda a suíte termina em ROLLBACK.
-- Fixtures são invisíveis às outras conexões; nenhum conteúdo de exemplo é publicado.
set local plpgsql.check_asserts = on;

do $$
<<guide_test>>
declare
  admin_id uuid := gen_random_uuid();
  consumer_id uuid := gen_random_uuid();
  other_id uuid := gen_random_uuid();
  category_id uuid := gen_random_uuid();
  neighborhood_id uuid := gen_random_uuid();
  company_id uuid := gen_random_uuid();
  draft_id uuid := gen_random_uuid();
  item_id uuid := gen_random_uuid();
  session_id uuid := gen_random_uuid();
  city_id bigint;
  free_plan uuid;
  premium_plan uuid;
  review_id uuid;
  company_payload jsonb;
  result jsonb;
  entry text;
  counter integer;
begin
  assert to_regclass('public.services') is not null, 'Contrato legado ausente';
  assert exists(select 1 from information_schema.columns where table_schema='public' and table_name='services' and column_name='professional_id'), 'Contrato legado alterado';
  foreach entry in array array['guide_categories','guide_neighborhoods','plans','companies','company_subscriptions','products','company_services','company_media','company_members','company_favorites','company_reviews','company_review_reports','company_contacts','guide_support_requests','guide_user_status','analytics_events','admin_audit_logs','platform_settings'] loop
    assert (select relrowsecurity from pg_class where oid=('public.'||entry)::regclass), 'RLS ausente: '||entry;
    assert not has_table_privilege('anon','public.'||entry,'select,insert,update,delete'), 'Acesso anônimo direto: '||entry;
    assert not has_table_privilege('authenticated','public.'||entry,'insert,update,delete'), 'Escrita direta autenticada: '||entry;
  end loop;
  assert not has_schema_privilege('anon','guide_private','usage'), 'Schema privado exposto';
  raise notice 'OK: contratos legados, 18 tabelas com RLS e privilégios restritos';

  select id into city_id from public.cities where ibge_code='1100049';
  select id into free_plan from public.plans where is_active and not (features->>'featured')::boolean limit 1;
  select id into premium_plan from public.plans where is_active and (features->>'featured')::boolean limit 1;
  assert city_id is not null and free_plan is not null and premium_plan is not null, 'Configuração inicial incompleta';

  insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
  select id,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',id::text||'@example.test',extensions.crypt(gen_random_uuid()::text,extensions.gen_salt('bf')),now(),
    '{"provider":"email","providers":["email"]}'::jsonb,'{"full_name":"Teste transacional","phone":"5569999990000","is_admin":true}'::jsonb,now(),now()
  from unnest(array[admin_id,consumer_id,other_id]) id;
  assert (select count(*)=3 from public.profiles where id=any(array[admin_id,consumer_id,other_id])), 'Trigger de perfil falhou';
  assert not exists(select 1 from public.profiles where id=any(array[admin_id,consumer_id,other_id]) and is_admin), 'Metadados concederam privilégio administrativo';
  assert (select phone='5569999990000' from public.profiles where id=consumer_id), 'Telefone não preservado pelo trigger';
  insert into auth.sessions(id,user_id,created_at,updated_at) select id,id,now(),now() from unnest(array[admin_id,consumer_id,other_id]) id;
  update public.profiles set is_admin=true where id=admin_id;
  raise notice 'OK: trigger real de Auth preserva telefone e rejeita elevação por metadados';

  perform set_config('request.jwt.claim.sub',admin_id::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',admin_id,'session_id',admin_id,'role','authenticated','email',admin_id::text||'@example.test')::text,true);
  set local role authenticated;
  perform public.guide_admin_save('category',jsonb_build_object('id',category_id,'name','Categoria transacional','slug','teste-'||category_id,'icon','House'));
  perform public.guide_admin_save('neighborhood',jsonb_build_object('id',neighborhood_id,'name','Bairro transacional '||neighborhood_id,'city_id',city_id));
  company_payload:=jsonb_build_object('id',company_id,'name','Empresa transacional (rollback)','slug','teste-'||company_id,'description','Fixture privada para validação transacional.','category_id',category_id,'city_id',city_id,'neighborhood_id',neighborhood_id,'phone','5569999990000','plan_id',free_plan,'status','active');
  perform public.guide_admin_save('company',company_payload);
  perform public.guide_admin_save('company',company_payload||jsonb_build_object('id',draft_id,'slug','teste-'||draft_id,'status','inactive'));
  perform public.guide_admin_save('item',jsonb_build_object('id',item_id,'company_id',company_id,'category_id',category_id,'name','Tinta emborrachada transacional','description','Produto privado de teste.','type','product','price_cents',4550,'available',true));
  raise notice 'OK: cadastro administrativo por RPC de categoria, bairro, empresas e produto';

  perform set_config('request.jwt.claim.sub','',true);
  perform set_config('request.jwt.claims','{"role":"anon"}',true);
  set local role anon;
  result:=public.guide_search(jsonb_build_object('companyId',company_id,'q','tinta emborrachada'));
  assert jsonb_array_length(result->'companies')=1, 'Busca por produto falhou';
  assert result->'companies'->0->>'phone'='', 'Plano básico expôs contato direto';
  assert (result->'offerings'->0->>'price')::numeric=45.50, 'Preço em centavos incorreto';
  assert result->>'source'='supabase' and result->>'containsExamples'='false', 'Origem dos dados incorreta';
  result:=public.guide_search(jsonb_build_object('companyId',draft_id,'administrative',true));
  assert jsonb_array_length(result->'companies')=0, 'Rascunho exposto por filtro administrativo';
  result:=public.guide_search(jsonb_build_object('companyId',company_id,'q','tinta','kind','service'));
  assert jsonb_array_length(result->'companies')=0, 'Tipo de oferta aplicado incorretamente';
  result:=public.guide_search(jsonb_build_object('companyId',company_id,'pageSize',10000,'page',999));
  assert result->'pagination'->>'pageSize'='24' and result->'pagination'->>'page'='1', 'Paginação sem limites';
  raise notice 'OK: busca real, privacidade de rascunho, preço, filtros e paginação';

  begin perform 1 from public.companies; raise exception 'Leitura direta anônima permitida'; exception when insufficient_privilege then null; end;
  begin perform guide_private.require_user(); raise exception 'Helper privado exposto'; exception when insufficient_privilege then null; end;
  begin perform public.guide_admin_list(); raise exception 'Administração anônima permitida'; exception when insufficient_privilege then null; end;
  begin perform public.guide_toggle_favorite(jsonb_build_object('company_id',company_id)); raise exception 'Escrita anônima permitida'; exception when insufficient_privilege then null; end;
  raise notice 'OK: negação de leitura direta, helpers, administração e escrita anônima';

  perform set_config('request.jwt.claim.sub',consumer_id::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',consumer_id,'session_id',consumer_id,'role','authenticated')::text,true);
  set local role authenticated;
  begin perform public.guide_admin_save('category','{}'); raise exception 'Consumidor administrou'; exception when insufficient_privilege then null; end;
  perform public.guide_toggle_favorite(jsonb_build_object('company_id',company_id,'user_id',other_id));
  result:=public.guide_me();
  assert result->'favorites' @> jsonb_build_array(company_id), 'Favorito do consumidor ausente';
  perform set_config('request.jwt.claim.sub',other_id::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',other_id,'session_id',other_id,'role','authenticated')::text,true);
  result:=public.guide_me();
  assert not (result->'favorites' @> jsonb_build_array(company_id)), 'Favorito transferido para outro usuário';
  raise notice 'OK: consumidor não administra e favoritos respeitam o usuário verificado';

  perform set_config('request.jwt.claim.sub',consumer_id::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',consumer_id,'session_id',consumer_id,'role','authenticated')::text,true);
  perform public.guide_review(jsonb_build_object('company_id',company_id,'rating',5,'comment','Avaliação transacional que será revertida.'));
  result:=public.guide_search(jsonb_build_object('companyId',company_id));
  assert jsonb_array_length(result->'reviews')=0, 'Avaliação sem moderação publicada';
  perform public.guide_contact(jsonb_build_object('company_id',company_id,'message','Mensagem transacional sem entrega externa.'));
  set local role postgres;
  select r.id into review_id from public.company_reviews r where r.user_id=consumer_id and r.company_id=guide_test.company_id;
  assert exists(select 1 from public.company_contacts c where c.user_id=consumer_id), 'Solicitação interna não persistiu';
  -- Simula uma empresa criada antes da transação de troca de plano.
  update public.company_subscriptions s set starts_at=starts_at-interval '1 second' where s.company_id=guide_test.company_id and s.ends_at is null;

  perform set_config('request.jwt.claim.sub',admin_id::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',admin_id,'session_id',admin_id,'role','authenticated')::text,true);
  set local role authenticated;
  perform public.guide_admin_save('review',jsonb_build_object('id',review_id,'status','published'));
  perform public.guide_admin_save('company',company_payload||jsonb_build_object('plan_id',premium_plan));
  result:=public.guide_search(jsonb_build_object('companyId',company_id));
  assert jsonb_array_length(result->'reviews')=1, 'Moderação não publicou avaliação';
  assert result->'companies'->0->>'phone'='5569999990000', 'Recurso de contato do plano não aplicado';
  foreach entry in array array['overview','companies','items','categories','plans','neighborhoods','reviews','contacts','support','media','audit','reports','users'] loop
    result:=public.guide_admin_list(entry);
    assert result->'pagination'->>'pageSize'='20' and jsonb_array_length(result->'rows')<=20, 'Snapshot administrativo sem paginação: '||entry;
  end loop;
  raise notice 'OK: contato interno, moderação, plano premium e 13 snapshots administrativos';

  perform public.guide_admin_save('user',jsonb_build_object('id',consumer_id,'status','blocked'));
  perform set_config('request.jwt.claim.sub',consumer_id::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',consumer_id,'session_id',consumer_id,'role','authenticated')::text,true);
  begin perform public.guide_contact(jsonb_build_object('company_id',company_id,'message','Não deve ser aceita.')); raise exception 'Usuário bloqueado escreveu'; exception when insufficient_privilege then null; end;
  assert public.guide_me() is null, 'Sessão bloqueada continua autorizada';
  raise notice 'OK: bloqueio de usuário impede novas ações';

  perform set_config('request.jwt.claim.sub','',true);
  perform set_config('request.jwt.claims','{"role":"anon"}',true);
  set local role anon;
  result:=public.guide_support(jsonb_build_object('kind','help','name','Teste transacional','email',session_id::text||'@example.test','phone','','message','Solicitação transacional sem envio externo.','website',''));
  assert result->>'reference' ~ '^SG-[0-9A-F]{12}$', 'Protocolo de ajuda ausente';
  begin
    perform public.guide_event(jsonb_build_object('type','search','session_id',session_id,'route','/','query','teste transacional'));
    raise exception 'Consentimento não exigido';
  exception when raise_exception then
    if sqlerrm not like '%Consentimento necessário%' then raise; end if;
  end;
  perform public.guide_event(jsonb_build_object('type','search','session_id',session_id,'route','/','query','teste transacional','consent',true));
  set local role postgres;
  select count(*) into counter from public.analytics_events e where e.session_id=guide_test.session_id;
  assert counter=1, 'Evento consentido não persistiu';
  begin update public.analytics_events e set query='alterada' where e.session_id=guide_test.session_id; raise exception 'Analytics mutável'; exception when insufficient_privilege then null; end;
  begin update public.admin_audit_logs set action='alterada' where actor_id=admin_id; raise exception 'Auditoria mutável'; exception when insufficient_privilege then null; end;
  raise notice 'OK: ajuda com protocolo, consentimento e imutabilidade de analytics/auditoria';
  raise notice 'TODOS OS TESTES PASSARAM!';
end;
$$;
