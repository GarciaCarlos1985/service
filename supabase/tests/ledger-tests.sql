-- ============================================================
-- SERVICE — Suíte de testes do LEDGER (spec §11/§12/§15/§16, ADR-003)
-- Como rodar: node scripts/sql-tests.mjs supabase/tests/ledger-tests.sql
-- Esperado: "TODOS OS TESTES PASSARAM!"
-- Verifica:
--   1. process_booking_financials credita líquido/comissão/cashback corretos
--   2. Idempotência: processar de novo NÃO duplica dinheiro (spec §12)
--   3. Ledger imutável: UPDATE/DELETE bloqueados (ADR-003)
--   4. Saldo derivado do ledger (get_wallet_balance)
--   5. Teto mensal de cashback (spec §16)
-- ============================================================

drop function if exists public._t_fail(text);
drop function if exists public._t_pass(text);

create function public._t_fail(msg text)
returns void language plpgsql as $$
begin raise notice 'FALHOU: %', msg; end $$;

create function public._t_pass(msg text)
returns void language plpgsql as $$
begin raise notice 'OK: %', msg; end $$;

do $$
declare
  user_client uuid := '00000000-0000-0000-0000-0000000000c1';
  user_pro uuid := '00000000-0000-0000-0000-0000000000c2';
  cat_id bigint;
  svc_id uuid;
  booking_id uuid;
  pro_wallet uuid;
  cli_wallet uuid;
  failures integer := 0;
  v_balance bigint;
  v_check integer;
begin
  -- Setup: usuários + perfil profissional + serviço + booking concluído
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values
    (user_client, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'ledger.cliente@teste.service', crypt('senha-teste', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"full_name":"Cliente Ledger"}'::jsonb, now(), now()),
    (user_pro, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'ledger.pro@teste.service', crypt('senha-teste', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"full_name":"Pro Ledger"}'::jsonb, now(), now())
  on conflict (id) do nothing;

  update public.profiles set user_type = 'professional' where id = user_pro;

  select id into cat_id from public.service_categories order by id limit 1;

  insert into public.services (professional_id, category_id, title, price_from_cents)
  values (user_pro, cat_id, 'Serviço ledger', 100000)
  returning id into svc_id;

  -- Booking concluído no passado (R$1000), dentro da janela permitida
  insert into public.bookings (
    client_id, professional_id, service_id, scheduled_at, ends_at,
    duration_minutes, price_cents, status
  ) values (
    user_client, user_pro, svc_id,
    now() - interval '30 minutes', now() - interval '30 minutes' + interval '60 minutes',
    60, 100000, 'completed'
  )
  returning id into booking_id;

  -- 1. processamento financeiro idempotente e com valores corretos
  begin
    perform public.process_booking_financials(booking_id);
    perform public._t_pass('process_booking_financials executou');
  exception when others then
    perform public._t_fail('process_booking_financials falhou: ' || sqlerrm);
    failures := failures + 1;
  end;

  select w.id into pro_wallet from public.wallets w where w.profile_id = user_pro;
  select w.id into cli_wallet from public.wallets w where w.profile_id = user_client;

  -- profissional: líquido = 1000 - 10% = 900
  select coalesce(sum(t.amount_cents), 0) into v_check
  from public.wallet_transactions t where t.wallet_id = pro_wallet;
  if v_check = 90000 then
    perform public._t_pass('profissional recebeu líquido (90000)');
  else
    perform public._t_fail('líquido do profissional = ' || v_check || ' (esperado 90000)');
    failures := failures + 1;
  end if;

  -- plataforma: comissão 10% = 100
  select coalesce(sum(t.amount_cents), 0) into v_check
  from public.wallet_transactions t
  join public.wallets w on w.id = t.wallet_id
  where w.is_platform;
  if v_check = 10000 then
    perform public._t_pass('plataforma recebeu comissão (10000)');
  else
    perform public._t_fail('comissão da plataforma = ' || v_check || ' (esperado 10000)');
    failures := failures + 1;
  end if;

  -- cliente: cashback 5% = 50 (abaixo do teto mensal de 20000)
  select coalesce(sum(t.amount_cents), 0) into v_check
  from public.wallet_transactions t where t.wallet_id = cli_wallet;
  if v_check = 5000 then
    perform public._t_pass('cliente recebeu cashback (5000)');
  else
    perform public._t_fail('cashback do cliente = ' || v_check || ' (esperado 5000)');
    failures := failures + 1;
  end if;

  -- 2. idempotência: processar de novo NÃO duplica
  begin
    perform public.process_booking_financials(booking_id);
    perform public._t_fail('processamento duplicado não foi bloqueado');
    failures := failures + 1;
  exception when others then
    perform public._t_pass('processamento duplicado bloqueado (idempotência)');
  end;

  select coalesce(sum(t.amount_cents), 0) into v_check
  from public.wallet_transactions t where t.wallet_id = pro_wallet;
  if v_check = 90000 then
    perform public._t_pass('saldo do profissional segue 90000 após tentativa duplicada');
  else
    perform public._t_fail('saldo mudou após duplicata: ' || v_check);
    failures := failures + 1;
  end if;

  -- 3. ledger imutável (ADR-003)
  begin
    update public.wallet_transactions set amount_cents = 999999 where wallet_id = pro_wallet;
    perform public._t_fail('UPDATE no ledger não foi bloqueado');
    failures := failures + 1;
  exception when others then
    perform public._t_pass('UPDATE no ledger bloqueado');
  end;
  begin
    delete from public.wallet_transactions where wallet_id = pro_wallet;
    perform public._t_fail('DELETE no ledger não foi bloqueado');
    failures := failures + 1;
  exception when others then
    perform public._t_pass('DELETE no ledger bloqueado');
  end;

  -- 4. saldo derivado via RPC (como o próprio cliente autenticado)
  set local role authenticated;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', user_client::text, 'role', 'authenticated')::text, true);
  select balance_cents into v_balance from public.get_wallet_balance();
  if v_balance = 5000 then
    perform public._t_pass('get_wallet_balance do cliente = 5000 (derivado do ledger)');
  else
    perform public._t_fail('get_wallet_balance = ' || v_balance || ' (esperado 5000)');
    failures := failures + 1;
  end if;

  -- 5. teto mensal de cashback (spec §16): segundo booking ultrapassaria o teto
  -- (voltar ao papel postgres — o teste 4 deixou o papel em authenticated)
  set local role postgres;
  perform set_config('request.jwt.claims', '{}', true);

  insert into public.bookings (
    client_id, professional_id, service_id, scheduled_at, ends_at,
    duration_minutes, price_cents, status
  ) values (
    user_client, user_pro, svc_id,
    now() + interval '60 minutes', now() + interval '120 minutes',
    60, 400000, 'completed'
  )
  returning id into booking_id;

  perform public.process_booking_financials(booking_id);

  -- cashback seria 5% de 400000 = 20000; teto mensal 20000, já usou 5000 → 15000
  select coalesce(sum(t.amount_cents), 0) into v_check
  from public.wallet_transactions t where t.wallet_id = cli_wallet;
  if v_check = 20000 then
    perform public._t_pass('teto mensal de cashback respeitado (5000 + 15000 = 20000)');
  else
    perform public._t_fail('cashback total = ' || v_check || ' (esperado 20000)');
    failures := failures + 1;
  end if;

  -- Cleanup
  set local role postgres;
  perform set_config('request.jwt.claims', '{}', true);
  -- TRUNCATE não dispara triggers de linha (o ledger é imutável até p/ postgres —
  -- ADR-003; cleanup de teste usa truncate)
  truncate table public.wallet_transactions, public.wallets, public.bookings, public.services cascade;
  delete from auth.users where id in (user_client, user_pro);
  delete from public.profiles where id in (user_client, user_pro);

  if failures > 0 then
    raise notice 'ATENÇÃO: % teste(s) falharam!', failures;
  else
    raise notice 'TODOS OS TESTES PASSARAM!';
  end if;
end $$;

drop function if exists public._t_fail(text);
drop function if exists public._t_pass(text);
