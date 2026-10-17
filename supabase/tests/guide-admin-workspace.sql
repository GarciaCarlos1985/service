-- Sempre pelo laboratório/runner transacional: nenhuma fixture é publicada.
set local plpgsql.check_asserts=on;
do $$
<<workspace>>
declare
 admin_id uuid:=gen_random_uuid(); consumer_id uuid:=gen_random_uuid();
 category_a uuid:=gen_random_uuid(); category_b uuid:=gen_random_uuid(); neighborhood_id uuid:=gen_random_uuid();
 company_a uuid:=gen_random_uuid(); company_b uuid:=gen_random_uuid();
 media_a uuid:=gen_random_uuid(); media_b uuid:=gen_random_uuid(); media_c uuid:=gen_random_uuid();
 item_a uuid:=gen_random_uuid(); item_b uuid:=gen_random_uuid(); factor_id uuid:=gen_random_uuid();
 city_id bigint; plan_id uuid; result jsonb; original_order uuid[]; next_order uuid[]; stale_order uuid[];
 claims jsonb; revision integer; previous_value jsonb; settings jsonb; actor_count integer;
begin
 insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
 select id,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',id::text||'@example.test',extensions.crypt(gen_random_uuid()::text,extensions.gen_salt('bf')),now(),'{"provider":"email"}', '{"full_name":"Laboratório transacional","is_admin":true}',now(),now() from unnest(array[admin_id,consumer_id]) id;
 insert into auth.sessions(id,user_id,created_at,updated_at) select id,id,now(),now() from unnest(array[admin_id,consumer_id]) id;
 update public.profiles set is_admin=true where id=admin_id;
 select c.id into city_id from public.cities c where ibge_code='1100049';
 select p.id into plan_id from public.plans p where (features->>'featured')::boolean limit 1;
 claims:=jsonb_build_object('sub',admin_id,'session_id',admin_id,'role','authenticated','aal','aal1','amr',jsonb_build_array(jsonb_build_object('method','password','timestamp',extract(epoch from now()))));
 perform set_config('request.jwt.claim.sub',admin_id::text,true);
 perform set_config('request.jwt.claims',claims::text,true);
 set local role authenticated;
 perform public.guide_admin_save('category',jsonb_build_object('id',category_a,'name','Ordem A','slug','workspace-a-'||category_a,'icon','Store'));
 perform public.guide_admin_save('category',jsonb_build_object('id',category_b,'name','Ordem B','slug','workspace-b-'||category_b,'icon','House'));
 perform public.guide_admin_save('neighborhood',jsonb_build_object('id',neighborhood_id,'name','Bairro workspace '||neighborhood_id,'city_id',city_id));
 perform public.guide_admin_save('company',jsonb_build_object('id',company_a,'name','Empresa A (rollback)','slug','workspace-'||company_a,'description','Cadastro transitório, nunca publicado.','category_id',category_a,'city_id',city_id,'plan_id',plan_id,'status','inactive'));
 perform public.guide_admin_save('company',jsonb_build_object('id',company_b,'name','Empresa B (rollback)','slug','workspace-'||company_b,'description','Cadastro transitório, nunca publicado.','category_id',category_b,'city_id',city_id,'plan_id',plan_id,'status','inactive'));
 perform public.guide_admin_save('media',jsonb_build_object('id',media_a,'company_id',company_a,'url','https://example.invalid/a.jpg','alt','Imagem A','sort_order',0));
 perform public.guide_admin_save('media',jsonb_build_object('id',media_b,'company_id',company_b,'url','https://example.invalid/b.jpg','alt','Imagem B','sort_order',0));
 perform public.guide_admin_save('media',jsonb_build_object('id',media_c,'company_id',company_a,'url','https://example.invalid/c.jpg','alt','Imagem C','sort_order',1));
 result:=public.guide_admin_list('media',1,'',company_a);
 assert (result->'pagination'->>'total')::integer=2,'A contagem de imagens deve respeitar a empresa';
 assert not exists(select 1 from jsonb_array_elements(result->'rows') r where r->>'company_id'<>company_a::text),'Imagem de outra empresa exposta no filtro';
 assert public.guide_admin_company(company_a)->>'id'=company_a::text,'Consulta pontual de empresa falhou';
 raise notice 'OK: imagens e contagens isoladas por empresa; consulta pontual';

 result:=public.guide_admin_order('media',company_a);
 select array_agg((r->>'id')::uuid order by ord) into original_order from jsonb_array_elements(result) with ordinality t(r,ord);
 next_order:=array[media_c,media_a];
 perform public.guide_admin_reorder('media',next_order,original_order,company_a);
 assert public.guide_admin_order('media',company_a)->0->>'id'=media_c::text,'Ordem não persistiu';
 begin perform public.guide_admin_reorder('media',original_order,original_order,company_a);raise exception 'Conflito concorrente aceito';exception when raise_exception then if sqlerrm='Conflito concorrente aceito' then raise;end if;end;
 begin perform public.guide_admin_reorder('media',array[media_c,media_b],next_order,company_a);raise exception 'Imagem de outra empresa aceita';exception when raise_exception then if sqlerrm='Imagem de outra empresa aceita' then raise;end if;end;
 begin perform public.guide_admin_reorder('media',array[media_c,media_c],next_order,company_a);raise exception 'IDs duplicados aceitos';exception when raise_exception then if sqlerrm='IDs duplicados aceitos' then raise;end if;end;
 begin perform public.guide_admin_reorder('media',array[media_c],next_order,company_a);raise exception 'Ordem incompleta aceita';exception when raise_exception then if sqlerrm='Ordem incompleta aceita' then raise;end if;end;
 perform public.guide_admin_save('media',jsonb_build_object('id',media_c,'company_id',company_a,'url','https://example.invalid/c.jpg','alt','Imagem C','sort_order',0,'is_active',false));
 raise notice 'OK: ordem atômica, conflito, isolamento, duplicação e lista incompleta';

 perform public.guide_admin_save('item',jsonb_build_object('id',item_a,'company_id',company_a,'category_id',category_a,'name','Produto A','description','Produto de rollback','type','product','available',true));
 perform public.guide_admin_save('item',jsonb_build_object('id',item_b,'company_id',company_a,'category_id',category_a,'name','Serviço B','description','Serviço de rollback','type','service','price_cents',1234,'available',true));
 result:=public.guide_admin_order('items',company_a);
 select array_agg((r->>'id')::uuid order by ord) into original_order from jsonb_array_elements(result) with ordinality t(r,ord);
 perform public.guide_admin_reorder('items',array[item_b,item_a],original_order,company_a);
 assert public.guide_admin_order('items',company_a)->0->>'id'=item_b::text,'Produtos e serviços não compartilham a ordem';
 result:=public.guide_admin_order('categories');
 select array_agg((r->>'id')::uuid order by ord) into original_order from jsonb_array_elements(result) with ordinality t(r,ord);
 select array_agg(id order by ord desc) into next_order from unnest(original_order) with ordinality t(id,ord);
 perform public.guide_admin_reorder('categories',next_order,original_order);
 assert public.guide_admin_order('categories')->0->>'id'=next_order[1]::text,'Ordem de categorias não foi aplicada';
 raise notice 'OK: produtos e serviços ordenados juntos; categorias configuráveis';

 result:=public.guide_admin_list('settings');revision:=(result->'rows'->0->>'revision')::integer;
 settings:='{"heroTitle":"Cacoal, perto de você.","heroDescription":"Descrição de teste transacional para apresentação.","searchPlaceholder":"Pesquise produtos e serviços","quickSearches":["Tinta","Eletricista"],"showSuggestions":true,"showSpotlight":false}'::jsonb;
 perform public.guide_admin_save('settings',jsonb_build_object('value',settings,'revision',revision));
 assert public.guide_presentation() @> settings,'Apresentação pública não corresponde à configuração';
 begin perform public.guide_admin_save('settings',jsonb_build_object('value',settings,'revision',revision));raise exception 'Versão antiga sobrescreveu configuração';exception when raise_exception then if sqlerrm='Versão antiga sobrescreveu configuração' then raise;end if;end;
 begin perform public.guide_admin_save('settings',jsonb_build_object('value',settings||'{"secret":"not-allowed"}','revision',revision+1));raise exception 'Configuração privada aceita';exception when raise_exception then if sqlerrm='Configuração privada aceita' then raise;end if;end;
 begin perform public.guide_admin_save('settings',jsonb_build_object('value',settings||'{"heroTitle":""}','revision',revision+1));raise exception 'Título vazio aceito';exception when raise_exception then if sqlerrm='Título vazio aceito' then raise;end if;end;
 raise notice 'OK: configuração pública validada; concorrência e campos desconhecidos rejeitados';

 assert public.guide_admin_upload_allowed(company_a||'/'||gen_random_uuid()||'.jpg'),'Upload administrativo válido negado';
 assert not public.guide_admin_upload_allowed(company_a||'/../../x.svg'),'Caminho ou SVG inseguro aceito';
 assert not public.guide_admin_upload_allowed(gen_random_uuid()||'/'||gen_random_uuid()||'.png'),'Empresa inexistente aceita no upload';
 insert into storage.objects(bucket_id,name,owner_id) values('guide-media',company_a||'/'||gen_random_uuid()||'.jpg',admin_id::text);
 raise notice 'OK: RLS de upload, caminho por empresa e formatos restritos';

 perform public.guide_admin_set_role(consumer_id,true);
 set local role postgres;
 assert (select is_admin from public.profiles where id=consumer_id),'Concessão administrativa não persistiu';
 set local role authenticated;
 perform public.guide_admin_set_role(consumer_id,false);
 begin perform public.guide_admin_set_role(admin_id,false);raise exception 'Autorremoção administrativa permitida';exception when raise_exception then if sqlerrm='Autorremoção administrativa permitida' then raise;end if;end;
 perform set_config('request.jwt.claims',(claims||jsonb_build_object('amr',jsonb_build_array(jsonb_build_object('method','password','timestamp',extract(epoch from now())-3600))))::text,true);
 begin perform public.guide_admin_set_role(consumer_id,true);raise exception 'Mudança de papel sem confirmação recente';exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claims',claims::text,true);
 raise notice 'OK: gestão de acesso auditada exige confirmação recente e impede autorremoção';

 set local role postgres;
 insert into auth.mfa_factors(id,user_id,friendly_name,factor_type,status,secret,created_at,updated_at) values(factor_id,admin_id,'Fixture temporária','totp','verified','temporary-test-secret',now(),now());
 set local role authenticated;
 begin perform public.guide_admin_list();raise exception 'Administração sem segundo fator permitida';exception when insufficient_privilege then null;end;
 assert not public._is_admin(),'Predicado legado ignorou segundo fator';
 perform set_config('request.jwt.claims',(claims||'{"aal":"aal2"}')::text,true);
 perform public.guide_admin_list();
 set local role postgres;
 delete from auth.mfa_factors where id=factor_id;
 delete from auth.sessions where id=admin_id;
 set local role authenticated;
 begin perform public.guide_admin_list();raise exception 'Sessão encerrada ainda administra';exception when insufficient_privilege then null;end;
 assert not public._is_admin(),'Predicado legado aceitou sessão encerrada';
 assert public.guide_me() is null,'Sessão encerrada ainda tem perfil';
 set local role postgres;
 insert into auth.sessions(id,user_id,created_at,updated_at,not_after) values(admin_id,admin_id,now(),now(),now()-interval '1 minute');
 set local role authenticated;
 begin perform public.guide_admin_list();raise exception 'Sessão expirada ainda administra';exception when insufficient_privilege then null;end;
 raise notice 'OK: MFA exigido quando ativado; sessões encerradas e expiradas recusadas';

 perform set_config('request.jwt.claim.sub',consumer_id::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',consumer_id,'session_id',consumer_id,'role','authenticated','is_admin',true)::text,true);
 begin perform public.guide_admin_list();raise exception 'Consumidor obteve administração';exception when insufficient_privilege then null;end;
 begin perform public.guide_admin_reorder('categories',next_order,next_order);raise exception 'Consumidor reordenou catálogo';exception when insufficient_privilege then null;end;
 begin perform public.guide_admin_save('settings',jsonb_build_object('value',settings,'revision',revision+1));raise exception 'Consumidor alterou apresentação';exception when insufficient_privilege then null;end;
 begin update public.profiles set is_admin=true where id=consumer_id;raise exception 'Consumidor promoveu o próprio perfil';exception when insufficient_privilege then null;end;
 begin insert into storage.objects(bucket_id,name,owner_id) values('guide-media',company_a||'/'||gen_random_uuid()||'.png',consumer_id::text);raise exception 'Consumidor enviou imagem administrativa';exception when insufficient_privilege then null;end;
 assert not public.guide_admin_upload_allowed(company_a||'/'||gen_random_uuid()||'.jpg'),'Consumidor autorizou upload';
 set local role anon;
 perform set_config('request.jwt.claim.sub','',true);
 perform set_config('request.jwt.claims','{"role":"anon"}',true);
 assert public.guide_presentation() @> settings,'Apresentação não pode ser lida anonimamente';
 begin perform public.guide_admin_order('categories');raise exception 'Anônimo leu lista administrativa';exception when insufficient_privilege then null;end;
 begin perform public.guide_admin_company(company_a);raise exception 'Anônimo leu rascunho';exception when insufficient_privilege then null;end;
 assert not exists(select 1 from jsonb_array_elements(public.guide_search()->'companies') c where c->>'id'=company_a::text),'Rascunho publicado durante o teste';
 set local role postgres;
 assert exists(select 1 from public.admin_audit_logs where actor_id=admin_id and action='reorder_media'),'Ordem sem auditoria';
 assert exists(select 1 from public.admin_audit_logs where actor_id=admin_id and action='settings'),'Configuração sem auditoria';
 assert exists(select 1 from public.admin_audit_logs where actor_id=admin_id and action='admin_role'),'Papel sem auditoria';
 raise notice 'OK: negação de acesso anônimo/consumidor, rascunhos privados e auditoria das novas operações';
 raise notice 'TODOS OS TESTES DO PAINEL PASSARAM!';
end;
$$;
