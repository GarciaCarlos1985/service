-- Executar somente em transação com rollback. Dados fictícios isolados.
do $$
declare actor uuid:=gen_random_uuid(); consumer uuid:=gen_random_uuid(); category uuid:=gen_random_uuid(); neighborhood uuid:=gen_random_uuid();
 first_company uuid:=gen_random_uuid(); second_company uuid:=gen_random_uuid(); free_company uuid:=gen_random_uuid(); first_slide uuid:=gen_random_uuid();second_slide uuid:=gen_random_uuid();hidden_slide uuid:=gen_random_uuid();
 city bigint; premium uuid; free_plan uuid; configuration jsonb; revision_value integer; result jsonb; claim jsonb; company uuid;
begin
 set local role postgres;
 insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
 select id,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',id||'@customization.test','',now(),'{"provider":"email"}','{"full_name":"Personalização — teste transacional"}',now(),now() from unnest(array[actor,consumer]) id;
 insert into auth.sessions(id,user_id) values(actor,actor),(consumer,consumer);
 update public.profiles set is_admin=true where id=actor;
 select id into city from public.cities where ibge_code='1100049';
 select id into premium from public.plans where (features->>'featured')::boolean limit 1;
 select id into free_plan from public.plans where not coalesce((features->>'featured')::boolean,false) limit 1;
 claim:=jsonb_build_object('sub',actor,'session_id',actor,'role','authenticated','aal','aal1');
 perform set_config('request.jwt.claim.sub',actor::text,true);perform set_config('request.jwt.claims',claim::text,true);
 set local role authenticated;
 perform public.guide_admin_save('category',jsonb_build_object('id',category,'name','Vitrines — teste','slug','vitrine-'||category,'icon','Store'));
 perform public.guide_admin_save('neighborhood',jsonb_build_object('id',neighborhood,'name','Bairro — teste','city_id',city));
 foreach company in array array[first_company,second_company,free_company] loop
  perform public.guide_admin_save('company',jsonb_build_object('id',company,'name','Empresa vitrine '||company,'slug','vitrine-'||company,'description','Cadastro fictício para teste de apresentação.','category_id',category,'city_id',city,'neighborhood_id',neighborhood,'phone','5569999990000','plan_id',case when company=free_company then free_plan else premium end,'status','active'));
  perform public.guide_admin_save('media',jsonb_build_object('company_id',company,'url','https://example.invalid/'||company||'.jpg','alt','Teste de vitrine'));
 end loop;
 result:=public.guide_admin_list('settings');revision_value:=(result->'rows'->0->>'revision')::integer;
 configuration:=(result->'rows'->0->'value')||jsonb_build_object('showSpotlight',true,'searchButtonLabel','Encontrar','resultsTitle','Negócios da cidade','theme','{"primary":"#285e5e","navy":"#102a43","accent":"#e4c66b","background":"#f8fafb","surface":"#eaf0f4","badge":"#d8b565"}'::jsonb,'spotlightMode','manual','spotlights',jsonb_build_array(
  jsonb_build_object('id',first_slide,'companyId',second_company,'title','Primeira chamada','description','Descrição editável','imageUrl','','imageAlt','Foto escolhida','enabled',true),
  jsonb_build_object('id',second_slide,'companyId',first_company,'title','Segunda chamada','description','','imageUrl','https://example.invalid/custom.jpg','imageAlt','','enabled',true),
  jsonb_build_object('id',hidden_slide,'companyId',free_company,'title','TEXTO PRIVADO DESATIVADO','description','','imageUrl','','imageAlt','','enabled',false)));
 perform public.guide_admin_save('settings',jsonb_build_object('value',configuration,'revision',revision_value));revision_value:=revision_value+1;
 assert public.guide_presentation()->>'searchButtonLabel'='Encontrar','Texto personalizado ausente';
 assert public.guide_presentation()->'theme'->>'primary'='#285e5e','Cor não preservada';
 assert jsonb_array_length(public.guide_presentation()->'spotlights')=2,'Vitrines desativadas expostas';
 assert position('TEXTO PRIVADO' in public.guide_presentation()::text)=0,'Texto de rascunho exposto';
 assert jsonb_array_length(public.guide_admin_list('settings')->'rows'->0->'value'->'spotlights')=3,'Admin perdeu rascunho';
 result:=public.guide_showcase();
 assert result->'companies'->0->>'id'=second_company::text,'Ordem manual não respeitada';
 assert result->'companies'->1->>'id'=first_company::text,'Segunda vitrine não respeitada';
 assert not exists(select 1 from jsonb_array_elements(result->'companies') c where c->>'id'=free_company::text),'Empresa sem destaque apareceu';
 assert public.guide_search('{"q":"nenhuma-empresa-corresponde-este-termo"}')->'pagination'->>'total'='0','Busca de isolamento inválida';
 assert jsonb_array_length(public.guide_showcase()->'companies')=2,'Filtros de busca afetaram vitrine';
 raise notice 'OK: textos, paleta e ordem manual persistem; rascunhos de vitrines ficam privados';
 begin perform public.guide_admin_save('settings',jsonb_build_object('value',jsonb_set(configuration,'{theme,primary}','"red; background:url(https://evil.invalid)"'),'revision',revision_value));raise exception 'CSS arbitrário aceito';exception when raise_exception then if sqlerrm='CSS arbitrário aceito' then raise;end if;end;
 begin perform public.guide_admin_save('settings',jsonb_build_object('value',jsonb_set(configuration,'{spotlights,0,imageUrl}','"javascript:alert(1)"'),'revision',revision_value));raise exception 'URL executável aceita';exception when raise_exception then if sqlerrm='URL executável aceita' then raise;end if;end;
 begin perform public.guide_admin_save('settings',jsonb_build_object('value',jsonb_set(configuration,'{spotlights,2,enabled}','true'),'revision',revision_value));raise exception 'Empresa sem destaque promovida';exception when raise_exception then if sqlerrm='Empresa sem destaque promovida' then raise;end if;end;
 begin perform public.guide_admin_save('settings',jsonb_build_object('value',configuration,'revision',revision_value-1));raise exception 'Concorrência ignorada';exception when raise_exception then if sqlerrm='Concorrência ignorada' then raise;end if;end;
 perform set_config('request.jwt.claim.sub',consumer::text,true);perform set_config('request.jwt.claims',jsonb_build_object('sub',consumer,'session_id',consumer,'role','authenticated')::text,true);
 begin perform public.guide_admin_save('settings',jsonb_build_object('value',configuration,'revision',revision_value));raise exception 'Consumidor personalizou site';exception when insufficient_privilege then null;end;
 begin perform guide_private.guide_admin_save('settings',jsonb_build_object('value',configuration,'revision',revision_value));raise exception 'Implementação privada acessível';exception when insufficient_privilege then null;end;
 set local role anon;
 assert public.guide_showcase()->'companies'->0->>'id'=second_company::text,'Vitrine pública indisponível';
 assert position('TEXTO PRIVADO' in public.guide_presentation()::text)=0,'Rascunho exposto a anônimo';
 set local role postgres;
 perform set_config('request.jwt.claim.sub',actor::text,true);perform set_config('request.jwt.claims',claim::text,true);
 set local role authenticated;
 perform public.guide_admin_save('settings',jsonb_build_object('value',jsonb_set(configuration,'{showSpotlight}','false'),'revision',revision_value));
 assert jsonb_array_length(public.guide_showcase()->'companies')=0,'Desativação global ignorada';
 assert jsonb_array_length(public.guide_presentation()->'spotlights')=0,'Vitrine desativada exposta';
 set local role postgres;
 raise notice 'OK: CSS/URLs inválidos, promoção indevida, concorrência e acesso não autorizado recusados; vitrine pode ser desativada';
end;
$$;
