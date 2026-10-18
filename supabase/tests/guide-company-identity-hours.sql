-- Fixtures exclusivas da transação do runner; nenhuma marca comercial é publicada.
set local plpgsql.check_asserts=on;
do $$
declare
  admin_id uuid:=gen_random_uuid(); consumer_id uuid:=gen_random_uuid();
  company_id uuid:=gen_random_uuid(); category_id uuid:=gen_random_uuid(); neighborhood_id uuid:=gen_random_uuid();
  asset_id uuid:=gen_random_uuid(); city_id bigint; plan_id uuid; claims jsonb;
  payload jsonb; week jsonb; bad_week jsonb; result jsonb; saved jsonb; logo text; object_path text; replacement_logo text;
begin
  insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
  select id,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',id::text||'@example.test',extensions.crypt(gen_random_uuid()::text,extensions.gen_salt('bf')),now(),'{"provider":"email"}','{"full_name":"Cadastro de empresa — teste com rollback"}',now(),now() from unnest(array[admin_id,consumer_id]) id;
  insert into auth.sessions(id,user_id,created_at,updated_at) select id,id,now(),now() from unnest(array[admin_id,consumer_id]) id;
  update public.profiles set is_admin=true where id=admin_id;
  select c.id into city_id from public.cities c where ibge_code='1100049';
  select p.id into plan_id from public.plans p where (features->>'featured')::boolean limit 1;
  insert into public.guide_categories(id,name,slug,icon) values(category_id,'Empresa — teste','company-profile-'||category_id,'Store');
  insert into public.guide_neighborhoods(id,city_id,name) values(neighborhood_id,city_id,'Bairro — teste '||neighborhood_id);
  claims:=jsonb_build_object('sub',admin_id,'session_id',admin_id,'role','authenticated','aal','aal1','amr',jsonb_build_array(jsonb_build_object('method','password','timestamp',extract(epoch from now()))));
  perform set_config('request.jwt.claim.sub',admin_id::text,true);
  perform set_config('request.jwt.claims',claims::text,true);
  payload:=jsonb_build_object('id',company_id,'name','Empresa do ensaio de cadastro','slug','company-profile-'||company_id,'description','Perfil exclusivamente transacional para testar identidade e horários.','category_id',category_id,'city_id',city_id,'neighborhood_id',neighborhood_id,'plan_id',plan_id,'hours','Horários antigos em texto.','status','inactive','phone','5569999990000');
  set local role authenticated;
  perform public.guide_admin_save('company',payload);
  result:=public.guide_admin_company(company_id);
  assert result->>'hours'='Horários antigos em texto.' and result->'weekly_hours'='null'::jsonb and result->>'logo_url'='', 'Dados legados não foram preservados';
  perform public.guide_admin_save('company',payload||'{"name":"Empresa legada editada"}');
  raise notice 'OK: cadastro e edição legados funcionam sem os campos novos';
  reset role;

  select jsonb_build_object('days',jsonb_object_agg(day,'{"closed":true,"all_day":false,"periods":[]}'::jsonb),'notes','Nos feriados, consulte a empresa.') into week from unnest(array['mon','tue','wed','thu','fri','sat','sun']) day;
  week:=jsonb_set(week,'{days,mon}','{"closed":false,"all_day":false,"periods":[{"start":"08:00","end":"12:00"},{"start":"13:30","end":"18:00"}]}');
  week:=jsonb_set(week,'{days,sat}','{"closed":false,"all_day":true,"periods":[]}');
  assert guide_private.valid_weekly_hours(week), 'Semana válida recusada';
  assert not guide_private.valid_weekly_hours(week-'days'), 'Semana incompleta aceita';
  assert not guide_private.valid_weekly_hours(jsonb_set(week,'{days,mon,periods,0,start}','"25:00"')), 'Hora inválida aceita';
  assert not guide_private.valid_weekly_hours(jsonb_set(week,'{days,mon,periods,1,start}','"11:00"')), 'Sobreposição aceita';
  assert not guide_private.valid_weekly_hours(week||'{"css":"invalid"}'), 'Campos desconhecidos aceitos';
  bad_week:=jsonb_set(jsonb_set(week,'{days,sun}','{"closed":false,"all_day":false,"periods":[{"start":"22:00","end":"09:00"}]}'),'{days,sat}','{"closed":true,"all_day":false,"periods":[]}');
  assert not guide_private.valid_weekly_hours(bad_week), 'Sobreposição de domingo para segunda aceita';
  raise notice 'OK: dias fechados, pausa, 24 horas, limites e continuidade semanal validados';

  object_path:=company_id::text||'/'||asset_id::text||'.png';
  logo:='https://taabjnmsaaltsiehywbw.supabase.co/storage/v1/object/public/guide-media/'||object_path;
  set local role authenticated;
  begin
    perform public.guide_admin_save('company',payload||jsonb_build_object('logo_url',logo));
    raise exception 'Logotipo sem arquivo foi aceito';
  exception when raise_exception then
    if sqlerrm='Logotipo sem arquivo foi aceito' then raise; end if;
  end;
  reset role;
  insert into storage.objects(bucket_id,name,owner_id,metadata) values('guide-media',object_path,admin_id::text,'{"mimetype":"image/png","size":200}');
  payload:=payload||jsonb_build_object('logo_url',logo,'weekly_hours',week,'status','active');
  set local role authenticated;
  perform public.guide_admin_save('company',payload);
  result:=public.guide_admin_company(company_id);
  assert result->>'logo_url'=logo and result->'weekly_hours'=week, 'Identidade ou semana não persistiu';
  assert position('Segunda-feira: 08:00–12:00 · 13:30–18:00' in result->>'hours')>0 and position('Domingo: Fechado' in result->>'hours')>0, 'Resumo legado de horários inválido';
  perform public.guide_admin_save('company',(payload-'logo_url'-'weekly_hours')||'{"name":"Cliente antigo compatível"}');
  result:=public.guide_admin_company(company_id);
  assert result->>'logo_url'=logo and result->'weekly_hours'=week, 'Cliente antigo apagou os novos campos';
  begin
    perform public.guide_admin_save('company',payload||jsonb_build_object('weekly_hours',jsonb_set(week,'{days,mon,periods,1,start}','"11:00"')));
    raise exception 'Semana inválida foi salva';
  exception when raise_exception then
    if sqlerrm='Semana inválida foi salva' then raise; end if;
  end;
  begin
    perform public.guide_admin_save('company',payload||'{"logo_url":"javascript:alert(1)"}');
    raise exception 'URL de script foi salva';
  exception when raise_exception then
    if sqlerrm='URL de script foi salva' then raise; end if;
  end;
  begin
    perform public.guide_admin_save('company',payload||jsonb_build_object('logo_url',replace(logo,company_id::text,gen_random_uuid()::text)));
    raise exception 'Arquivo de outra empresa foi aceito';
  exception when raise_exception then
    if sqlerrm='Arquivo de outra empresa foi aceito' then raise; end if;
  end;
  raise notice 'OK: logotipo enviado, edição compatível e gravação atômica com validação no servidor';

  reset role;
  perform set_config('request.jwt.claim.sub','',true);
  perform set_config('request.jwt.claims','{"role":"anon"}',true);
  set local role anon;
  result:=public.guide_search('{}');
  select entry into saved from jsonb_array_elements(result->'companies') entry where entry->>'id'=company_id::text;
  assert saved->>'logo_url'=logo and saved->'weekly_hours'=week, 'Perfil público perdeu os novos campos';
  begin perform public.guide_admin_save('company',payload);raise exception 'Anônimo alterou empresa';exception when insufficient_privilege then null;end;
  reset role;
  -- Alterar a empresa mantém sua identidade, seus horários e o histórico; retirar do site é reversível.
  object_path:=company_id::text||'/'||gen_random_uuid()::text||'.png';
  replacement_logo:='https://taabjnmsaaltsiehywbw.supabase.co/storage/v1/object/public/guide-media/'||object_path;
  insert into storage.objects(bucket_id,name,owner_id,metadata) values('guide-media',object_path,admin_id::text,'{"mimetype":"image/png","size":200}');
  perform set_config('request.jwt.claim.sub',admin_id::text,true);
  perform set_config('request.jwt.claims',claims::text,true);
  set local role authenticated;
  payload:=payload||jsonb_build_object('name','Empresa com nova marca','logo_url',replacement_logo,'street','Rua do teste','address_number','123','postal_code','76960000','phone','5569999990001','whatsapp','5569999990002');
  perform public.guide_admin_save('company',payload);
  saved:=public.guide_admin_company(company_id);
  assert saved->>'id'=company_id::text and saved->>'name'='Empresa com nova marca' and saved->>'logo_url'=replacement_logo and saved->'weekly_hours'=week, 'Edição de marca alterou identidade ou horários';
  assert saved->>'street'='Rua do teste' and saved->>'address_number'='123' and saved->>'postal_code'='76960000' and saved->>'phone'='5569999990001' and saved->>'whatsapp'='5569999990002', 'Endereço ou contatos não foram atualizados';
  perform public.guide_admin_save('company',payload||'{"status":"blocked"}');
  assert public.guide_admin_company(company_id)->>'status'='blocked', 'Desativação não persistiu';
  reset role;
  perform set_config('request.jwt.claim.sub','',true);
  perform set_config('request.jwt.claims','{"role":"anon"}',true);
  set local role anon;
  result:=public.guide_search(jsonb_build_object('companyId',company_id));
  assert jsonb_array_length(result->'companies')=0, 'Empresa desativada continuou pública';
  reset role;
  perform set_config('request.jwt.claim.sub',admin_id::text,true);
  perform set_config('request.jwt.claims',claims::text,true);
  set local role authenticated;
  perform public.guide_admin_save('company',payload);
  reset role;
  perform set_config('request.jwt.claim.sub','',true);
  perform set_config('request.jwt.claims','{"role":"anon"}',true);
  set local role anon;
  result:=public.guide_search(jsonb_build_object('companyId',company_id));
  assert jsonb_array_length(result->'companies')=1 and result->'companies'->0->>'name'='Empresa com nova marca', 'Reativação não restaurou a empresa editada';
  reset role;
  assert (select count(*) from public.admin_audit_logs where entity_id=company_id and action='company')>=7, 'Edições sem auditoria';
  raise notice 'OK: nome, logotipo, endereço e contatos editáveis; desativação oculta e reativação restaura o cadastro';
  claims:=jsonb_build_object('sub',consumer_id,'session_id',consumer_id,'role','authenticated','aal','aal1');
  perform set_config('request.jwt.claim.sub',consumer_id::text,true);
  perform set_config('request.jwt.claims',claims::text,true);
  set local role authenticated;
  begin perform public.guide_admin_save('company',payload);raise exception 'Consumidor alterou empresa';exception when insufficient_privilege then null;end;
  reset role;
  assert not has_function_privilege('authenticated','guide_private.save_company(jsonb)','EXECUTE'), 'Helper privado executável';
  raise notice 'OK: identidade e semana chegam ao perfil público; escrita anônima e de consumidor recusada';
  raise notice 'TODOS OS TESTES PASSARAM!';
end;
$$;
