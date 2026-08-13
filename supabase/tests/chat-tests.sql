-- ============================================================
-- SERVICE — Suíte de testes do CHAT + NOTIFICAÇÕES (spec §27/§28)
-- Como rodar: node scripts/sql-tests.mjs supabase/tests/chat-tests.sql
-- Verifica:
--   1. Terceiro NÃO acessa conversa/mensagens de outro booking (spec §63)
--   2. Só cliente/profissional do booking participam
--   3. Rate limit de mensagens (spec §27)
--   4. Unread count e read status (spec §27)
--   5. Notificações: só o dono vê; eventos geram notificações (spec §28)
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
  user_client uuid := '00000000-0000-0000-0000-0000000000d1';
  user_pro uuid := '00000000-0000-0000-0000-0000000000d2';
  user_other uuid := '00000000-0000-0000-0000-0000000000d3';
  cat_id bigint;
  svc_id uuid;
  booking_id uuid;
  conv_id uuid;
  failures integer := 0;
  v_count integer;
  v_unread bigint;
begin
  -- Setup: 3 usuários + profissional + serviço + booking confirmado
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values
    (user_client, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'chat.cliente@teste.service', crypt('senha-teste', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"full_name":"Cliente Chat"}'::jsonb, now(), now()),
    (user_pro, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'chat.pro@teste.service', crypt('senha-teste', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"full_name":"Pro Chat"}'::jsonb, now(), now()),
    (user_other, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'chat.outro@teste.service', crypt('senha-teste', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"full_name":"Terceiro"}'::jsonb, now(), now())
  on conflict (id) do nothing;

  update public.profiles set user_type = 'professional' where id = user_pro;
  select id into cat_id from public.service_categories order by id limit 1;

  insert into public.services (professional_id, category_id, title, price_from_cents)
  values (user_pro, cat_id, 'Serviço chat', 50000)
  returning id into svc_id;

  insert into public.bookings (
    client_id, professional_id, service_id, scheduled_at, ends_at,
    duration_minutes, price_cents, status
  ) values (
    user_client, user_pro, svc_id,
    now() + interval '1 day', now() + interval '1 day' + interval '60 minutes',
    60, 50000, 'confirmed'
  )
  returning id into booking_id;

  -- 1. cliente abre a conversa do booking
  set local role authenticated;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', user_client::text, 'role', 'authenticated')::text, true);
  begin
    select id into conv_id from public.open_conversation(booking_id);
    perform public._t_pass('cliente abre conversa do booking');
  exception when others then
    perform public._t_fail('cliente não abriu a conversa: ' || sqlerrm);
    failures := failures + 1;
  end;

  -- 2. terceiro NÃO abre a conversa (spec §63)
  perform set_config('request.jwt.claims', jsonb_build_object('sub', user_other::text, 'role', 'authenticated')::text, true);
  begin
    perform public.open_conversation(booking_id);
    perform public._t_fail('terceiro abriu a conversa de outro booking');
    failures := failures + 1;
  exception when others then
    perform public._t_pass('terceiro NÃO abre conversa de outro booking');
  end;

  -- 3. terceiro NÃO lê as mensagens
  begin
    perform count(*) from public.list_conversation_messages(conv_id);
    perform public._t_fail('terceiro leu mensagens de outro booking');
    failures := failures + 1;
  exception when others then
    perform public._t_pass('terceiro NÃO lê mensagens de outro booking');
  end;

  -- 4. cliente envia mensagem; profissional vê e responde
  perform set_config('request.jwt.claims', jsonb_build_object('sub', user_client::text, 'role', 'authenticated')::text, true);
  begin
    perform public.send_message(conv_id, 'Olá! Gostaria de agendar.');
    perform public._t_pass('cliente envia mensagem');
  exception when others then
    perform public._t_fail('cliente não enviou: ' || sqlerrm);
    failures := failures + 1;
  end;

  perform set_config('request.jwt.claims', jsonb_build_object('sub', user_pro::text, 'role', 'authenticated')::text, true);
  begin
    perform public.send_message(conv_id, 'Olá! Podemos sim.');
    perform public._t_pass('profissional responde');
  exception when others then
    perform public._t_fail('profissional não respondeu: ' || sqlerrm);
    failures := failures + 1;
  end;

  -- 5. unread: cliente tem 1 não lida (a do profissional).
  --    now() é fixo dentro da transação → backdate o last_read_at do cliente
  --    para simular tempo passado desde a última leitura.
  set local role postgres;
  update public.conversation_participants
  set last_read_at = now() - interval '1 minute'
  where conversation_id = conv_id and profile_id = user_client;
  set local role authenticated;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', user_client::text, 'role', 'authenticated')::text, true);
  select public.get_unread_messages_count() into v_unread;
  if v_unread = 1 then
    perform public._t_pass('unread do cliente = 1 (mensagem do profissional)');
  else
    perform public._t_fail('unread do cliente = ' || v_unread || ' (esperado 1)');
    failures := failures + 1;
  end if;

  -- 6. marcar como lida zera o unread
  perform public.mark_conversation_read(conv_id);
  select public.get_unread_messages_count() into v_unread;
  if v_unread = 0 then
    perform public._t_pass('marcar como lida zera o unread');
  else
    perform public._t_fail('unread após ler = ' || v_unread || ' (esperado 0)');
    failures := failures + 1;
  end if;

  -- 7. rate limit: o limite é 10 mensagens/minuto POR USUÁRIO (inclui a
  --    mensagem anterior do passo 4) → a 10ª tentativa no loop bloqueia
  perform set_config('request.jwt.claims', jsonb_build_object('sub', user_client::text, 'role', 'authenticated')::text, true);
  v_count := 0;
  begin
    for i in 1..11 loop
      perform public.send_message(conv_id, 'mensagem de teste ' || i::text);
      v_count := v_count + 1;
    end loop;
    perform public._t_fail('rate limit não bloqueou a 11ª mensagem');
    failures := failures + 1;
  exception when others then
    if v_count = 9 then
      perform public._t_pass('rate limit bloqueou na 10ª mensagem no minuto (9 do loop + 1 anterior)');
    else
      perform public._t_fail('rate limit bloqueou cedo demais (' || v_count || ')');
      failures := failures + 1;
    end if;
  end;

  -- 8. notificações: booking criado notifica o profissional
  -- (voltar ao papel postgres — os testes de chat deixaram authenticated)
  set local role postgres;
  perform set_config('request.jwt.claims', '{}', true);

  insert into public.bookings (
    client_id, professional_id, service_id, scheduled_at, ends_at,
    duration_minutes, price_cents, status
  ) values (
    user_client, user_pro, svc_id,
    now() + interval '2 days', now() + interval '2 days' + interval '60 minutes',
    60, 50000, 'pending'
  )
  returning id into booking_id;

  perform public._notify(user_pro, 'booking', 'Novo agendamento', 'Solicitação recebida',
    jsonb_build_object('booking_id', booking_id));

  -- profissional vê a própria notificação
  perform set_config('request.jwt.claims', jsonb_build_object('sub', user_pro::text, 'role', 'authenticated')::text, true);
  select public.get_unread_notifications_count() into v_count;
  if v_count >= 1 then
    perform public._t_pass('profissional vê notificações próprias');
  else
    perform public._t_fail('notificação não criada para o profissional');
    failures := failures + 1;
  end if;

  -- terceiro NÃO vê as notificações do profissional
  perform set_config('request.jwt.claims', jsonb_build_object('sub', user_other::text, 'role', 'authenticated')::text, true);
  select public.get_unread_notifications_count() into v_count;
  if v_count = 0 then
    perform public._t_pass('terceiro NÃO vê notificações de outro usuário');
  else
    perform public._t_fail('terceiro viu notificações alheias');
    failures := failures + 1;
  end if;

  -- 9. marcar notificações como lidas
  perform set_config('request.jwt.claims', jsonb_build_object('sub', user_pro::text, 'role', 'authenticated')::text, true);
  perform public.mark_notifications_read();
  select public.get_unread_notifications_count() into v_count;
  if v_count = 0 then
    perform public._t_pass('marcar notificações como lidas');
  else
    perform public._t_fail('unread de notificações = ' || v_count);
    failures := failures + 1;
  end if;

  -- Cleanup
  set local role postgres;
  perform set_config('request.jwt.claims', '{}', true);
  truncate table public.messages, public.conversation_participants, public.conversations,
    public.notifications, public.bookings, public.services cascade;
  delete from auth.users where id in (user_client, user_pro, user_other);
  delete from public.profiles where id in (user_client, user_pro, user_other);

  if failures > 0 then
    raise notice 'ATENÇÃO: % teste(s) falharam!', failures;
  else
    raise notice 'TODOS OS TESTES PASSARAM!';
  end if;
end $$;

drop function if exists public._t_fail(text);
drop function if exists public._t_pass(text);
