-- ============================================================
-- SERVICE â€” SuÃ­te de testes de RLS (spec Â§63/Â§64, prioridades 1-2)
-- Como rodar: Supabase Dashboard â†’ SQL Editor â†’ colar e executar.
-- Esperado ao final: "TODOS OS TESTES PASSARAM".
-- Regras verificadas:
--   1. anon NÃƒO lÃª perfis
--   2. anon NÃƒO escreve em nenhuma tabela
--   3. UsuÃ¡rio A NÃƒO lÃª o perfil do UsuÃ¡rio B (spec Â§63)
--   4. UsuÃ¡rio NÃƒO altera o prÃ³prio user_type (role)
--   5. Cliente NÃƒO cria serviÃ§o (sÃ³ professional)
--   6. Professional cria/altera/apaga apenas os prÃ³prios serviÃ§os
-- ============================================================

drop function if exists public._test_fail(text);
drop function if exists public._test_pass(text);

create function public._test_fail(msg text)
returns void language plpgsql
as $$
begin
  raise notice 'FALHOU: %', msg;
end
$$;

create function public._test_pass(msg text)
returns void language plpgsql
as $$
begin
  raise notice 'OK: %', msg;
end
$$;

do $$
declare
  user_a uuid := '00000000-0000-0000-0000-00000000000a';
  user_b uuid := '00000000-0000-0000-0000-00000000000b';
  user_pro uuid := '00000000-0000-0000-0000-00000000000c';
  cat_id bigint;
  svc_id uuid;
  failures integer := 0;
begin
  -- Setup: usuários reais no auth.users (o trigger on_auth_user_created
  -- cria os perfis automaticamente — spec §49). O SQL Editor roda como
  -- postgres, então pode inserir no schema auth.
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values
    (user_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'cliente.a@teste.service', crypt('senha-teste', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"full_name":"Cliente A"}'::jsonb, now(), now()),
    (user_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'cliente.b@teste.service', crypt('senha-teste', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"full_name":"Cliente B"}'::jsonb, now(), now()),
    (user_pro, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'profissional@teste.service', crypt('senha-teste', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"full_name":"Profissional"}'::jsonb, now(), now())
  on conflict (id) do nothing;

  -- O trigger cria o perfil como 'client'; ajusta o perfil do profissional
  -- (postgres ignora RLS — é o admin)
  update public.profiles
  set user_type = 'professional', slug = 'profissional-teste'
  where id = user_pro;
  select id into cat_id from public.service_categories limit 1;

  -- 1. anon nÃ£o lÃª perfis
  set local role anon;
  set local request.jwt.claims = '{"sub":"","role":"anon"}';
  if exists (select 1 from public.profiles limit 1) then
    perform public._test_fail('anon leu profiles');
    failures := failures + 1;
  else
    perform public._test_pass('anon NÃƒO lÃª profiles');
  end if;

  -- 2. anon nÃ£o escreve
  begin
    insert into public.profiles (id, full_name) values (gen_random_uuid(), 'X');
    perform public._test_fail('anon inseriu em profiles');
    failures := failures + 1;
  exception when others then
    perform public._test_pass('anon NÃƒO insere em profiles');
  end;

  -- 3. usuÃ¡rio A nÃ£o lÃª perfil de B
  set local role authenticated;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', user_a::text, 'role', 'authenticated')::text, true);
  if exists (select 1 from public.profiles where id = user_b) then
    perform public._test_fail('A leu perfil de B');
    failures := failures + 1;
  else
    perform public._test_pass('A NÃƒO lÃª perfil de B');
  end if;

  -- A lÃª o prÃ³prio perfil
  if not exists (select 1 from public.profiles where id = user_a) then
    perform public._test_fail('A nÃ£o leu o prÃ³prio perfil');
    failures := failures + 1;
  else
    perform public._test_pass('A lÃª o prÃ³prio perfil');
  end if;

  -- 4. usuÃ¡rio nÃ£o altera o prÃ³prio user_type
  begin
    update public.profiles set user_type = 'professional' where id = user_a;
    perform public._test_fail('A alterou o prÃ³prio user_type');
    failures := failures + 1;
  exception when others then
    perform public._test_pass('A NÃƒO altera o prÃ³prio user_type');
  end;

  -- A pode editar o prÃ³prio full_name
  begin
    update public.profiles set full_name = 'Cliente A2' where id = user_a;
    perform public._test_pass('A edita o prÃ³prio perfil (campos permitidos)');
  exception when others then
    perform public._test_fail('A nÃ£o conseguiu editar o prÃ³prio perfil');
    failures := failures + 1;
  end;

  -- 5. cliente nÃ£o cria serviÃ§o
  set local role authenticated;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', user_a::text, 'role', 'authenticated')::text, true);
  begin
    insert into public.services (professional_id, category_id, title)
    values (user_a, cat_id, 'ServiÃ§o ilegal');
    perform public._test_fail('cliente criou serviÃ§o');
    failures := failures + 1;
  exception when others then
    perform public._test_pass('cliente NÃƒO cria serviÃ§o');
  end;

  -- 6. profissional cria serviÃ§o prÃ³prio
  perform set_config('request.jwt.claims', jsonb_build_object('sub', user_pro::text, 'role', 'authenticated')::text, true);
  begin
    insert into public.services (professional_id, category_id, title)
    values (user_pro, cat_id, 'Limpeza residencial')
    returning id into svc_id;
    perform public._test_pass('profissional cria serviÃ§o prÃ³prio');
  exception when others then
    perform public._test_fail('profissional nÃ£o conseguiu criar serviÃ§o');
    failures := failures + 1;
  end;

  -- profissional nÃ£o cria serviÃ§o para outro
  begin
    insert into public.services (professional_id, category_id, title)
    values (user_b, cat_id, 'ServiÃ§o de outro');
    perform public._test_fail('profissional criou serviÃ§o para outro');
    failures := failures + 1;
  exception when others then
    perform public._test_pass('profissional NÃƒO cria serviÃ§o para outro');
  end;

  -- profissional nÃ£o altera serviÃ§o de outro
  begin
    update public.services set title = 'Hack' where professional_id = user_b;
    perform public._test_fail('profissional alterou serviÃ§o de outro');
    failures := failures + 1;
  exception when others then
    perform public._test_pass('profissional NÃƒO altera serviÃ§o de outro');
  end;

  -- anon pode ler catÃ¡logo e serviÃ§os pÃºblicos
  set local role anon;
  set local request.jwt.claims = '{"sub":"","role":"anon"}';
  if not exists (select 1 from public.cities limit 1) then
    perform public._test_fail('anon nÃ£o leu cidades');
    failures := failures + 1;
  else
    perform public._test_pass('anon lÃª cidades (catÃ¡logo)');
  end if;
  if not exists (select 1 from public.service_categories limit 1) then
    perform public._test_fail('anon nÃ£o leu categorias');
    failures := failures + 1;
  else
    perform public._test_pass('anon lÃª categorias (catÃ¡logo)');
  end if;
  if not exists (select 1 from public.services limit 1) then
    perform public._test_fail('anon nÃ£o leu serviÃ§os');
    failures := failures + 1;
  else
    perform public._test_pass('anon lÃª serviÃ§os (oferta pÃºblica)');
  end if;

  -- Cleanup: voltar ao papel original (postgres) antes de remover os
  -- usuários de TESTE (o último teste deixou o papel em anon)
  set local role postgres;
  perform set_config('request.jwt.claims', '{}', true);

  delete from public.services;
  delete from auth.users where id in (user_a, user_b, user_pro);
  delete from public.profiles where id in (user_a, user_b, user_pro);

  if failures > 0 then
    raise exception '% teste(s) falharam', failures;
  else
    raise notice 'TODOS OS TESTES PASSARAM';
  end if;
end $$;

drop function if exists public._test_fail(text);
drop function if exists public._test_pass(text);


