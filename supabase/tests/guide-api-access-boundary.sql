-- Somente runner com BEGIN/ROLLBACK e fixtures isoladas; nunca executar solto.
set local plpgsql.check_asserts=on;

do $$
declare relation record; routine record; api_role text; allowed boolean;
  public_api oid[]:=array[
    'public.guide_search(jsonb)'::regprocedure::oid,'public.guide_company_by_slug(text,text)'::regprocedure::oid,
    'public.guide_me()'::regprocedure::oid,'public.guide_presentation()'::regprocedure::oid,
    'public.guide_showcase()'::regprocedure::oid,'public.guide_support(jsonb)'::regprocedure::oid,'public.guide_event(jsonb)'::regprocedure::oid];
  private_api oid[]:=array[
    'public.guide_update_profile(jsonb)'::regprocedure::oid,'public.guide_toggle_favorite(jsonb)'::regprocedure::oid,
    'public.guide_review(jsonb)'::regprocedure::oid,'public.guide_contact(jsonb)'::regprocedure::oid,
    'public.guide_admin_save(text,jsonb)'::regprocedure::oid,'public.guide_admin_list(text,integer,text,uuid,integer)'::regprocedure::oid,
    'public.guide_admin_company(uuid)'::regprocedure::oid,'public.guide_admin_order(text,uuid)'::regprocedure::oid,
    'public.guide_admin_reorder(text,uuid[],uuid[],uuid)'::regprocedure::oid,'public.guide_admin_upload_allowed(text)'::regprocedure::oid,
    'public.guide_admin_set_role(uuid,boolean)'::regprocedure::oid];
begin
  for relation in select c.oid,c.relname,c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind in ('r','p') loop
    assert relation.relrowsecurity,'RLS desligada: '||relation.relname;
    foreach api_role in array array['anon','authenticated'] loop
      assert not has_table_privilege(api_role,relation.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'), 'Acesso direto indevido: '||api_role||'/'||relation.relname;
      assert not has_any_column_privilege(api_role,relation.oid,'SELECT,INSERT,UPDATE,REFERENCES'), 'Concessão residual em coluna: '||api_role||'/'||relation.relname;
    end loop;
  end loop;
  for routine in select p.oid,p.oid::regprocedure::text as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prokind='f' and p.proowner='postgres'::regrole
    and not exists(select 1 from pg_depend d where d.classid='pg_proc'::regclass and d.objid=p.oid and d.deptype='e') loop
    foreach api_role in array array['anon','authenticated'] loop
      allowed:=routine.oid=any(public_api) or (api_role='authenticated' and routine.oid=any(private_api));
      assert has_function_privilege(api_role,routine.oid,'EXECUTE')=allowed, 'Contrato de RPC incorreto: '||api_role||'/'||routine.signature;
    end loop;
    assert has_function_privilege('service_role',routine.oid,'EXECUTE'),'Backend perdeu execução: '||routine.signature;
  end loop;
  foreach api_role in array array['anon','authenticated'] loop
    assert not has_schema_privilege(api_role,'public','CREATE'),'Criação pública permitida';
    assert not has_schema_privilege(api_role,'guide_private','USAGE'),'Schema interno exposto';
  end loop;
  raise notice 'OK: RLS em todas as tabelas públicas, sem grants diretos/colunas; somente 18 RPCs autorizadas';
end $$;

-- Provas de objetos novos: concessões padrão não podem abrir novas tabelas/RPCs.
create table public.__guide_security_probe(id bigserial primary key,value text);
alter table public.__guide_security_probe enable row level security;
create function public.__guide_security_probe_rpc() returns integer language sql as $$select 1$$;
do $$ declare api_role text; begin
  foreach api_role in array array['anon','authenticated'] loop
    assert not has_table_privilege(api_role,'public.__guide_security_probe','SELECT,INSERT,UPDATE,DELETE,TRUNCATE');
    assert not has_sequence_privilege(api_role,'public.__guide_security_probe_id_seq','USAGE,SELECT,UPDATE');
    assert not has_function_privilege(api_role,'public.__guide_security_probe_rpc()','EXECUTE');
    execute format('set local role %I',api_role);
    begin perform * from public.__guide_security_probe; raise exception 'Tabela nova acessível'; exception when insufficient_privilege then null; end;
    begin perform public.__guide_security_probe_rpc(); raise exception 'Função nova acessível'; exception when insufficient_privilege then null; end;
    reset role;
  end loop;
  raise notice 'OK: tabela, sequência e função novas permanecem privadas sem GRANT explícito';
end $$;

-- O deslocamento da extensão preserva os operadores e as restrições de agenda.
set local search_path=public,extensions;
create temporary table guide_security_gist_probe(
  owner_id uuid,period tstzrange,
  exclude using gist(owner_id with =,period with &&)
);
do $$ declare fixture uuid:=gen_random_uuid(); begin
  assert exists(select 1 from pg_extension e join pg_namespace n on n.oid=e.extnamespace where e.extname='btree_gist' and n.nspname='extensions');
  insert into guide_security_gist_probe values(fixture,tstzrange(now(),now()+interval '1 hour'));
  begin
    insert into guide_security_gist_probe values(fixture,tstzrange(now(),now()+interval '1 hour'));
    raise exception 'Sobreposição de agenda aceita';
  exception when exclusion_violation then null; end;
  raise notice 'OK: extensão fora do schema exposto; exclusão GiST continua impedindo sobreposição';
end $$;

do $$
declare admin_id uuid:=gen_random_uuid(); user_a uuid:=gen_random_uuid(); user_b uuid:=gen_random_uuid();
  claims jsonb; result jsonb; target uuid:=gen_random_uuid(); category_id uuid:=gen_random_uuid(); city bigint; plan uuid;
  attempt text; wallet uuid; ledger_a uuid;
begin
  insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
  select id,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',id::text||'@example.test',extensions.crypt(gen_random_uuid()::text,extensions.gen_salt('bf')),now(),'{"provider":"email"}',
    '{"full_name":"Ensaio RLS com rollback","is_admin":true,"role":"admin","user_type":"professional"}',now(),now() from unnest(array[admin_id,user_a,user_b]) id;
  insert into auth.sessions(id,user_id,created_at,updated_at) select id,id,now(),now() from unnest(array[admin_id,user_a,user_b]) id;
  assert not exists(select 1 from public.profiles where id=any(array[admin_id,user_a,user_b]) and (is_admin or user_type<>'client')),'Metadados elevaram privilégio';
  update public.profiles set is_admin=true where id=admin_id;
  select id into city from public.cities where ibge_code='1100049';
  select id into plan from public.plans where is_active order by name limit 1;
  claims:=jsonb_build_object('sub',admin_id,'session_id',admin_id,'role','authenticated','aal','aal1');
  perform set_config('request.jwt.claim.sub',admin_id::text,true); perform set_config('request.jwt.claims',claims::text,true);
  set local role authenticated;
  perform public.guide_admin_save('category',jsonb_build_object('id',category_id,'name','Ensaio transacional RLS','slug','rls-'||category_id,'icon','Store','is_active',true));
  perform public.guide_admin_save('company',jsonb_build_object('id',target,'category_id',category_id,'city_id',city,'name','Empresa de rollback RLS','slug','rls-'||target,'description','Fixture exclusiva desta transação de segurança.','plan_id',plan,'status','inactive'));
  result:=public.guide_admin_company(target);
  assert result->>'id'=target::text,'Admin perdeu acesso autorizado';
  reset role;

  claims:=jsonb_build_object('sub',user_a,'session_id',user_a,'role','authenticated','aal','aal1','user_metadata','{"is_admin":true,"role":"admin"}'::jsonb);
  perform set_config('request.jwt.claim.sub',user_a::text,true); perform set_config('request.jwt.claims',claims::text,true);
  set local role authenticated;
  assert (public.guide_me()->>'admin')::boolean=false,'Metadados do JWT deram administração';
  begin perform public.guide_admin_list('users'); raise exception 'Consumidor listou usuários'; exception when insufficient_privilege then null; end;
  begin perform public.guide_admin_company(target); raise exception 'Consumidor leu rascunho'; exception when insufficient_privilege then null; end;
  begin perform public.guide_admin_save('company','{}'); raise exception 'Consumidor gravou empresa'; exception when insufficient_privilege then null; end;
  begin perform public.guide_admin_set_role(user_a,true); raise exception 'Consumidor concedeu admin'; exception when insufficient_privilege then null; end;
  assert not public.guide_admin_upload_allowed(target::text||'/'||gen_random_uuid()::text||'.png'),'Consumidor ganhou upload';
  perform public.guide_update_profile(jsonb_build_object('id',user_b,'name','Somente usuário A','phone','5569999990000','is_admin',true,'user_type','professional'));
  foreach attempt in array array[
    'update public.profiles set is_admin=true where id=auth.uid()',
    'update public.profiles set user_type=''professional'' where id=auth.uid()',
    'select phone from public.profiles',
    'select * from public.admin_audit_logs',
    'select * from public.company_contacts',
    'select * from public.wallet_transactions',
    'select public.choose_user_type(''professional'')',
    'select public.create_booking(null,null,now(),60)',
    'select public.send_message(null,''texto'')'
  ] loop
    begin execute attempt; raise exception 'Acesso indevido aceito: %',attempt; exception when insufficient_privilege then null; end;
  end loop;
  reset role;
  assert (select full_name='Somente usuário A' and not is_admin and user_type='client' from public.profiles where id=user_a),'Perfil próprio inválido';
  assert (select full_name='Ensaio RLS com rollback' from public.profiles where id=user_b),'ID do payload alterou outro usuário';
  raise notice 'OK: metadados/cadastro não elevam acesso; IDOR, rascunho, admin e APIs legadas recusados';

  -- Funções internas continuam úteis ao backend, com idempotência e dados de fixture.
  wallet:=public._get_or_create_wallet(user_a);
  ledger_a:=public._ledger_credit(wallet,'cashback',100,'rls-'||user_a,'security-test',null,'Somente rollback');
  begin
    perform public._ledger_credit(wallet,'cashback',100,'rls-'||user_a,'security-test',null,'Somente rollback');
    raise exception 'Crédito duplicado aceito';
  exception when raise_exception then
    if sqlerrm='Crédito duplicado aceito' then raise; end if;
    assert sqlerrm like '%idempotency_key%','Falha inesperada ao testar duplicidade';
  end;
  assert (select count(*)=1 and max(id::text)=ledger_a::text and sum(amount_cents)=100 from public.wallet_transactions where wallet_id=wallet),'Idempotência interna perdida';
  perform public._notify(user_a,'system','Somente rollback','Fixture interna','{}');
  raise notice 'OK: proprietário preserva ledger idempotente e notificação interna sem exposição';

  insert into public.guide_user_status(user_id,blocked) values(user_a,true);
  set local role authenticated;
  assert public.guide_me() is null,'Conta bloqueada permaneceu ativa';
  begin perform public.guide_update_profile('{"name":"Tentativa bloqueada"}'); raise exception 'Conta bloqueada gravou'; exception when insufficient_privilege then null; end;
  reset role;
  update public.guide_user_status set blocked=false where user_id=user_a;
  update auth.sessions set not_after=now()-interval '1 minute' where id=user_a;
  set local role authenticated;
  assert public.guide_me() is null,'Sessão expirada aceita';
  begin perform public.guide_search('{"favorites":true}'); raise exception 'Sessão expirada leu favoritos'; exception when insufficient_privilege then null; end;
  reset role;
  delete from auth.sessions where id=user_a;
  set local role authenticated;
  assert public.guide_me() is null,'Token de sessão encerrada aceito';
  begin perform public.guide_update_profile('{"name":"Sessão encerrada"}'); raise exception 'Token encerrado gravou'; exception when insufficient_privilege then null; end;
  reset role;
  raise notice 'OK: conta bloqueada, sessão expirada e token de sessão encerrada recusados';

  claims:=jsonb_build_object('sub',admin_id,'session_id',user_b,'role','authenticated','aal','aal1');
  perform set_config('request.jwt.claim.sub',admin_id::text,true); perform set_config('request.jwt.claims',claims::text,true);
  set local role authenticated;
  assert public.guide_me() is null,'Sessão de outro usuário aceita';
  begin perform public.guide_admin_list('users'); raise exception 'Admin com sessão alheia aceito'; exception when insufficient_privilege then null; end;
  reset role;
  claims:=jsonb_set(claims,'{session_id}',to_jsonb(admin_id)); perform set_config('request.jwt.claims',claims::text,true);
  update auth.users set banned_until=now()+interval '1 hour' where id=admin_id;
  set local role authenticated;
  assert public.guide_me() is null,'Admin banido manteve acesso';
  begin perform public.guide_admin_list('users'); raise exception 'Admin banido leu dados'; exception when insufficient_privilege then null; end;
  reset role;
  update auth.users set banned_until=null,email_confirmed_at=null where id=admin_id;
  set local role authenticated;
  assert public.guide_me() is null,'E-mail não confirmado aceito';
  begin perform public.guide_admin_list('users'); raise exception 'Admin não confirmado aceito'; exception when insufficient_privilege then null; end;
  reset role;
  update auth.users set email_confirmed_at=now(),deleted_at=now() where id=admin_id;
  set local role authenticated;
  assert public.guide_me() is null,'Conta removida manteve acesso';
  reset role;
  update auth.users set deleted_at=null where id=admin_id;
  set local role authenticated;
  assert public.guide_me()->>'id'=admin_id::text,'Conta válida não recuperou acesso';
  reset role;
  raise notice 'OK: sessão alheia, Auth banido, e-mail não confirmado e conta removida recusados';

  perform set_config('request.jwt.claim.sub','',true); perform set_config('request.jwt.claims','{"role":"anon"}',true);
  set local role anon;
  assert public.guide_me() is null;
  assert not (public.guide_search('{}')->'companies') @> jsonb_build_array(jsonb_build_object('id',target));
  assert public.guide_showcase()->'companies'='[]'::jsonb or not (public.guide_showcase()->'companies') @> jsonb_build_array(jsonb_build_object('id',target));
  foreach attempt in array array['select * from public.profiles','select public.guide_admin_list(''users'')','select public.guide_update_profile(''{}'')'] loop
    begin execute attempt; raise exception 'Acesso anônimo indevido'; exception when insufficient_privilege then null; end;
  end loop;
  reset role;
  raise notice 'OK: pesquisa/vitrine públicas preservadas; dados pessoais e escrita anônima negados';
  raise notice 'TODOS OS TESTES PASSARAM!';
end $$;
