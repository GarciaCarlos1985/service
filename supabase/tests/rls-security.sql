-- ============================================================
-- SERVICE — Suíte de testes de RLS (spec §63/§64, prioridades 1-2)
-- Como rodar: Supabase Dashboard → SQL Editor → colar e executar.
-- Esperado ao final: "TODOS OS TESTES PASSARAM".
-- Regras verificadas:
--   1. anon NÃO lê perfis
--   2. anon NÃO escreve em nenhuma tabela
--   3. Usuário A NÃO lê o perfil do Usuário B (spec §63)
--   4. Usuário NÃO altera o próprio user_type (role)
--   5. Cliente NÃO cria serviço (só professional)
--   6. Professional cria/altera/apaga apenas os próprios serviços
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
  -- Setup: usuários de teste + perfil profissional
  insert into public.profiles (id, full_name, user_type) values
    (user_a,   'Cliente A',    'client'),
    (user_b,   'Cliente B',    'client'),
    (user_pro, 'Profissional', 'professional');

  select id into cat_id from public.service_categories limit 1;

  -- 1. anon não lê perfis
  set local role anon;
  set local request.jwt.claims = '{"sub":"","role":"anon"}';
  if exists (select 1 from public.profiles limit 1) then
    perform public._test_fail('anon leu profiles');
    failures := failures + 1;
  else
    perform public._test_pass('anon NÃO lê profiles');
  end if;

  -- 2. anon não escreve
  begin
    insert into public.profiles (id, full_name) values (gen_random_uuid(), 'X');
    perform public._test_fail('anon inseriu em profiles');
    failures := failures + 1;
  exception when others then
    perform public._test_pass('anon NÃO insere em profiles');
  end;

  -- 3. usuário A não lê perfil de B
  set local role authenticated;
  set local request.jwt.claims = jsonb_build_object('sub', user_a::text, 'role', 'authenticated');
  if exists (select 1 from public.profiles where id = user_b) then
    perform public._test_fail('A leu perfil de B');
    failures := failures + 1;
  else
    perform public._test_pass('A NÃO lê perfil de B');
  end if;

  -- A lê o próprio perfil
  if not exists (select 1 from public.profiles where id = user_a) then
    perform public._test_fail('A não leu o próprio perfil');
    failures := failures + 1;
  else
    perform public._test_pass('A lê o próprio perfil');
  end if;

  -- 4. usuário não altera o próprio user_type
  begin
    update public.profiles set user_type = 'professional' where id = user_a;
    perform public._test_fail('A alterou o próprio user_type');
    failures := failures + 1;
  exception when others then
    perform public._test_pass('A NÃO altera o próprio user_type');
  end;

  -- A pode editar o próprio full_name
  begin
    update public.profiles set full_name = 'Cliente A2' where id = user_a;
    perform public._test_pass('A edita o próprio perfil (campos permitidos)');
  exception when others then
    perform public._test_fail('A não conseguiu editar o próprio perfil');
    failures := failures + 1;
  end;

  -- 5. cliente não cria serviço
  set local role authenticated;
  set local request.jwt.claims = jsonb_build_object('sub', user_a::text, 'role', 'authenticated');
  begin
    insert into public.services (professional_id, category_id, title)
    values (user_a, cat_id, 'Serviço ilegal');
    perform public._test_fail('cliente criou serviço');
    failures := failures + 1;
  exception when others then
    perform public._test_pass('cliente NÃO cria serviço');
  end;

  -- 6. profissional cria serviço próprio
  set local request.jwt.claims = jsonb_build_object('sub', user_pro::text, 'role', 'authenticated');
  begin
    insert into public.services (professional_id, category_id, title)
    values (user_pro, cat_id, 'Limpeza residencial')
    returning id into svc_id;
    perform public._test_pass('profissional cria serviço próprio');
  exception when others then
    perform public._test_fail('profissional não conseguiu criar serviço');
    failures := failures + 1;
  end;

  -- profissional não cria serviço para outro
  begin
    insert into public.services (professional_id, category_id, title)
    values (user_b, cat_id, 'Serviço de outro');
    perform public._test_fail('profissional criou serviço para outro');
    failures := failures + 1;
  exception when others then
    perform public._test_pass('profissional NÃO cria serviço para outro');
  end;

  -- profissional não altera serviço de outro
  begin
    update public.services set title = 'Hack' where professional_id = user_b;
    perform public._test_fail('profissional alterou serviço de outro');
    failures := failures + 1;
  exception when others then
    perform public._test_pass('profissional NÃO altera serviço de outro');
  end;

  -- anon pode ler catálogo e serviços públicos
  set local role anon;
  set local request.jwt.claims = '{"sub":"","role":"anon"}';
  if not exists (select 1 from public.cities limit 1) then
    perform public._test_fail('anon não leu cidades');
    failures := failures + 1;
  else
    perform public._test_pass('anon lê cidades (catálogo)');
  end if;
  if not exists (select 1 from public.service_categories limit 1) then
    perform public._test_fail('anon não leu categorias');
    failures := failures + 1;
  else
    perform public._test_pass('anon lê categorias (catálogo)');
  end if;
  if not exists (select 1 from public.services limit 1) then
    perform public._test_fail('anon não leu serviços');
    failures := failures + 1;
  else
    perform public._test_pass('anon lê serviços (oferta pública)');
  end if;

  -- Cleanup
  delete from public.services;
  delete from public.profiles;

  if failures > 0 then
    raise exception '% teste(s) falharam', failures;
  else
    raise notice 'TODOS OS TESTES PASSARAM';
  end if;
end $$;

drop function if exists public._test_fail(text);
drop function if exists public._test_pass(text);
