-- ============================================================
-- SERVICE — Suíte de testes de REVIEWS + CONFIANÇA + DISPUTAS (spec §32/§33/§34)
-- Como rodar: node scripts/sql-tests.mjs supabase/tests/reviews-tests.sql
-- Verifica:
--   1. Só cliente avalia booking CONCLUÍDO (não concluído → bloqueado)
--   2. Terceiro não avalia; profissional não se autoavalia (spec §33)
--   3. Duplicata de avaliação bloqueada (unique no banco)
--   4. Resposta do profissional: só ele, 1x
--   5. Verificação: default unverified; pedido por profissional;
--      mudança SÓ por admin; self-update bloqueado (spec §32)
--   6. Badges com regra objetiva (verificado / alta avaliação / top)
--   7. Disputa: só participante; bloqueada em pending; única por
--      booking; mensagens/evidências; decisão só admin (spec §34)
--   8. Notificações de review/dispute; lembrete de avaliação na
--      conclusão (spec §53)
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
  user_client uuid := '00000000-0000-0000-0000-0000000000e1';
  user_pro uuid := '00000000-0000-0000-0000-0000000000e2';
  user_other uuid := '00000000-0000-0000-0000-0000000000e3';
  user_admin uuid := '00000000-0000-0000-0000-0000000000e4';
  cat_id bigint;
  svc_id uuid;
  bk_confirmed uuid;
  bk_pending uuid;
  bk_completed uuid;
  bk_completed2 uuid;
  bk_extra uuid;
  review_id uuid;
  dispute_id uuid;
  failures integer := 0;
  v_count integer;
  v_int integer;
  v_badge text;
  v_status text;
  v_dt timestamptz;
begin
  -- Setup: 4 usuários + profissional + serviço + bookings em janelas
  -- distintas (restrição de overlap do ADR-009)
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values
    (user_client, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'rv.cliente@teste.service', crypt('senha-teste', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"full_name":"Cliente Reviews"}'::jsonb, now(), now()),
    (user_pro, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'rv.pro@teste.service', crypt('senha-teste', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"full_name":"Pro Reviews"}'::jsonb, now(), now()),
    (user_other, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'rv.outro@teste.service', crypt('senha-teste', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"full_name":"Terceiro Reviews"}'::jsonb, now(), now()),
    (user_admin, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'rv.admin@teste.service', crypt('senha-teste', gen_salt('bf')), now(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"full_name":"Admin Reviews"}'::jsonb, now(), now())
  on conflict (id) do nothing;

  update public.profiles set user_type = 'professional' where id = user_pro;
  update public.profiles set is_admin = true where id = user_admin;
  select id into cat_id from public.service_categories order by id limit 1;

  insert into public.services (professional_id, category_id, title, price_from_cents)
  values (user_pro, cat_id, 'Serviço reviews', 50000)
  returning id into svc_id;

  insert into public.bookings (
    client_id, professional_id, service_id, scheduled_at, ends_at,
    duration_minutes, price_cents, status
  ) values (
    user_client, user_pro, svc_id,
    now() + interval '1 day', now() + interval '1 day' + interval '60 minutes',
    60, 50000, 'confirmed'
  ) returning id into bk_confirmed;

  insert into public.bookings (
    client_id, professional_id, service_id, scheduled_at, ends_at,
    duration_minutes, price_cents, status
  ) values (
    user_client, user_pro, svc_id,
    now() + interval '2 days', now() + interval '2 days' + interval '60 minutes',
    60, 50000, 'pending'
  ) returning id into bk_pending;

  insert into public.bookings (
    client_id, professional_id, service_id, scheduled_at, ends_at,
    duration_minutes, price_cents, status
  ) values (
    user_client, user_pro, svc_id,
    now() + interval '3 days', now() + interval '3 days' + interval '60 minutes',
    60, 50000, 'in_progress'
  ) returning id into bk_completed;

  insert into public.bookings (
    client_id, professional_id, service_id, scheduled_at, ends_at,
    duration_minutes, price_cents, status
  ) values (
    user_client, user_pro, svc_id,
    now() + interval '4 days', now() + interval '4 days' + interval '60 minutes',
    60, 50000, 'completed'
  ) returning id into bk_completed2;

  -- conclui o in_progress via transição guardada → dispara o lembrete
  update public.bookings set status = 'completed' where id = bk_completed;

  -- ============================================================
  -- AVALIAÇÕES (spec §33)
  -- ============================================================

  -- 1. cliente não avalia booking não concluído
  set local role authenticated;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', user_client::text, 'role', 'authenticated')::text, true);
  begin
    perform public.create_review(bk_confirmed, 5, null);
    perform public._t_fail('cliente avaliou booking não concluído');
    failures := failures + 1;
  exception when others then
    perform public._t_pass('cliente NÃO avalia booking não concluído');
  end;

  -- 2. terceiro não avalia booking concluído
  perform set_config('request.jwt.claims', jsonb_build_object('sub', user_other::text, 'role', 'authenticated')::text, true);
  begin
    perform public.create_review(bk_completed, 5, null);
    perform public._t_fail('terceiro avaliou booking de outro usuário');
    failures := failures + 1;
  exception when others then
    perform public._t_pass('terceiro NÃO avalia booking de outro usuário');
  end;

  -- 3. profissional não se autoavalia
  perform set_config('request.jwt.claims', jsonb_build_object('sub', user_pro::text, 'role', 'authenticated')::text, true);
  begin
    perform public.create_review(bk_completed, 5, null);
    perform public._t_fail('profissional se autoavaliou');
    failures := failures + 1;
  exception when others then
    perform public._t_pass('profissional NÃO se autoavalia');
  end;

  -- 4. cliente avalia booking concluído
  perform set_config('request.jwt.claims', jsonb_build_object('sub', user_client::text, 'role', 'authenticated')::text, true);
  begin
    select id into review_id from public.create_review(bk_completed, 5, 'Serviço impecável, pontual.');
    perform public._t_pass('cliente avalia booking concluído');
  exception when others then
    perform public._t_fail('cliente não avaliou: ' || sqlerrm);
    failures := failures + 1;
  end;

  -- 5. duplicata bloqueada
  begin
    perform public.create_review(bk_completed, 4, 'Segunda tentativa.');
    perform public._t_fail('duplicata de avaliação passou');
    failures := failures + 1;
  exception when others then
    perform public._t_pass('duplicata de avaliação bloqueada');
  end;

  -- 6. nota fora do intervalo bloqueada
  begin
    perform public.create_review(bk_completed2, 0, null);
    perform public._t_fail('nota 0 passou');
    failures := failures + 1;
  exception when others then
    perform public._t_pass('nota 0 bloqueada');
  end;
  begin
    perform public.create_review(bk_completed2, 6, null);
    perform public._t_fail('nota 6 passou');
    failures := failures + 1;
  exception when others then
    perform public._t_pass('nota 6 bloqueada');
  end;

  -- 7. notificação 'review' chegou para o profissional
  set local role postgres;
  perform set_config('request.jwt.claims', '{}', true);
  select count(*) into v_count
  from public.notifications n
  where n.user_id = user_pro and n.type = 'review';
  if v_count >= 1 then
    perform public._t_pass('profissional notificado da nova avaliação');
  else
    perform public._t_fail('profissional não foi notificado da avaliação');
    failures := failures + 1;
  end if;

  -- 8. lembrete de avaliação na conclusão (spec §53)
  select count(*) into v_count
  from public.notifications n
  where n.user_id = user_client and n.type = 'review'
    and n.data ->> 'booking_id' = bk_completed::text;
  if v_count >= 1 then
    perform public._t_pass('cliente recebeu lembrete de avaliação ao concluir');
  else
    perform public._t_fail('cliente não recebeu lembrete de avaliação');
    failures := failures + 1;
  end if;

  -- 9. resposta: só o profissional avaliado; terceiro bloqueado
  set local role authenticated;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', user_other::text, 'role', 'authenticated')::text, true);
  begin
    perform public.respond_review(review_id, 'Resposta de terceiro.');
    perform public._t_fail('terceiro respondeu avaliação alheia');
    failures := failures + 1;
  exception when others then
    perform public._t_pass('terceiro NÃO responde avaliação alheia');
  end;

  perform set_config('request.jwt.claims', jsonb_build_object('sub', user_pro::text, 'role', 'authenticated')::text, true);
  begin
    perform public.respond_review(review_id, 'Obrigado pela confiança!');
    perform public._t_pass('profissional responde à própria avaliação');
  exception when others then
    perform public._t_fail('profissional não respondeu: ' || sqlerrm);
    failures := failures + 1;
  end;

  -- 10. dupla resposta bloqueada
  begin
    perform public.respond_review(review_id, 'Segunda resposta.');
    perform public._t_fail('dupla resposta passou');
    failures := failures + 1;
  exception when others then
    perform public._t_pass('dupla resposta bloqueada');
  end;

  -- ============================================================
  -- LEITURA PÚBLICA (spec §22/§23)
  -- ============================================================
  -- 11. anon lê avaliações do profissional (contrato público)
  set local role anon;
  perform set_config('request.jwt.claims', '{}', true);
  select count(*) into v_count from public.list_professional_reviews(user_pro);
  if v_count = 1 then
    perform public._t_pass('anon lê avaliações públicas do profissional');
  else
    perform public._t_fail('anon leu ' || v_count || ' avaliações (esperado 1)');
    failures := failures + 1;
  end if;

  -- 12. anon lê resumo de nota e badges
  select avg_rating::text into v_status from public.professional_rating_summary(user_pro);
  if v_status = '5.0' then
    perform public._t_pass('anon lê resumo de nota (5.0)');
  else
    perform public._t_fail('resumo de nota = ' || coalesce(v_status, 'null'));
    failures := failures + 1;
  end if;

  -- ============================================================
  -- CONFIANÇA (spec §32)
  -- ============================================================
  set local role postgres;
  perform set_config('request.jwt.claims', '{}', true);

  -- 13. default unverified
  select verification_status into v_status from public.profiles where id = user_pro;
  if v_status = 'unverified' then
    perform public._t_pass('verification_status default = unverified');
  else
    perform public._t_fail('verification_status = ' || coalesce(v_status, 'null'));
    failures := failures + 1;
  end if;

  -- 14. cliente não solicita verificação
  set local role authenticated;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', user_client::text, 'role', 'authenticated')::text, true);
  begin
    perform public.request_verification();
    perform public._t_fail('cliente solicitou verificação');
    failures := failures + 1;
  exception when others then
    perform public._t_pass('cliente NÃO solicita verificação');
  end;

  -- 15. profissional solicita → pending; dupla solicitação bloqueada
  perform set_config('request.jwt.claims', jsonb_build_object('sub', user_pro::text, 'role', 'authenticated')::text, true);
  begin
    perform public.request_verification();
    perform public._t_pass('profissional solicita verificação');
  exception when others then
    perform public._t_fail('profissional não solicitou: ' || sqlerrm);
    failures := failures + 1;
  end;
  begin
    perform public.request_verification();
    perform public._t_fail('dupla solicitação passou');
    failures := failures + 1;
  exception when others then
    perform public._t_pass('dupla solicitação bloqueada');
  end;

  -- 16. self-update de verification_status bloqueado (policy + revoke)
  set local role postgres;
  update public.profiles set verification_status = 'unverified' where id = user_pro;
  set local role authenticated;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', user_pro::text, 'role', 'authenticated')::text, true);
  begin
    update public.profiles set verification_status = 'verified' where id = user_pro;
    select verification_status into v_status from public.profiles where id = user_pro;
    if v_status = 'verified' then
      perform public._t_fail('self-update de verification_status passou');
      failures := failures + 1;
    else
      perform public._t_pass('self-update de verification_status bloqueado');
    end if;
  exception when others then
    perform public._t_pass('self-update de verification_status bloqueado');
  end;

  -- 17. não-admin não altera verificação; admin altera
  begin
    perform public.set_verification_status(user_pro, 'verified');
    perform public._t_fail('não-admin alterou verificação');
    failures := failures + 1;
  exception when others then
    perform public._t_pass('não-admin NÃO altera verificação');
  end;

  perform set_config('request.jwt.claims', jsonb_build_object('sub', user_admin::text, 'role', 'authenticated')::text, true);
  begin
    perform public.set_verification_status(user_pro, 'verified');
    perform public._t_pass('admin aprova verificação');
  exception when others then
    perform public._t_fail('admin não aprovou: ' || sqlerrm);
    failures := failures + 1;
  end;

  -- 18. badges: verificado aparece após aprovação
  set local role anon;
  perform set_config('request.jwt.claims', '{}', true);
  select badge into v_badge from public.professional_badges(user_pro) where badge = 'verificado';
  if v_badge = 'verificado' then
    perform public._t_pass('badge verificado presente após aprovação');
  else
    perform public._t_fail('badge verificado ausente');
    failures := failures + 1;
  end if;

  -- 19. alta avaliação: ainda 1 review → sem badge; com 5 reviews ≥ 4,5 → badge
  set local role postgres;
  perform set_config('request.jwt.claims', '{}', true);
  for i in 1..4 loop
    insert into public.bookings (
      client_id, professional_id, service_id, scheduled_at, ends_at,
      duration_minutes, price_cents, status
    ) values (
      user_client, user_pro, svc_id,
      now() + make_interval(days => 4 + i), now() + make_interval(days => 4 + i) + interval '60 minutes',
      60, 50000, 'completed'
    ) returning id into bk_extra;

    insert into public.reviews (booking_id, reviewer_id, professional_id, rating, comment)
    values (bk_extra, user_client, user_pro, 5, 'Ótimo serviço ' || i::text);
  end loop;

  set local role anon;
  perform set_config('request.jwt.claims', '{}', true);
  select badge into v_badge from public.professional_badges(user_pro) where badge = 'alta_avaliacao';
  if v_badge = 'alta_avaliacao' then
    perform public._t_pass('badge alta avaliação (5 reviews, média 5.0)');
  else
    perform public._t_fail('badge alta avaliação ausente');
    failures := failures + 1;
  end if;

  -- 20. top: 10 bookings concluídos (updated_at recente) + média ≥ 4,5
  set local role postgres;
  perform set_config('request.jwt.claims', '{}', true);
  for i in 1..5 loop
    insert into public.bookings (
      client_id, professional_id, service_id, scheduled_at, ends_at,
      duration_minutes, price_cents, status
    ) values (
      user_client, user_pro, svc_id,
      now() + make_interval(days => 10 + i), now() + make_interval(days => 10 + i) + interval '60 minutes',
      60, 50000, 'completed'
    );
  end loop;

  set local role anon;
  perform set_config('request.jwt.claims', '{}', true);
  select badge into v_badge from public.professional_badges(user_pro) where badge = 'top';
  if v_badge = 'top' then
    perform public._t_pass('badge top profissional (10 concluídos + média 4,5+)');
  else
    perform public._t_fail('badge top ausente');
    failures := failures + 1;
  end if;

  -- ============================================================
  -- DISPUTAS (spec §34)
  -- ============================================================
  set local role postgres;
  perform set_config('request.jwt.claims', '{}', true);

  -- 21. participante abre disputa em booking confirmado
  set local role authenticated;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', user_client::text, 'role', 'authenticated')::text, true);
  begin
    select id into dispute_id from public.open_dispute(
      bk_confirmed, 'Serviço diferente do combinado', 'O serviço entregue não corresponde ao que foi acordado na contratação.'
    );
    perform public._t_pass('participante abre disputa');
  exception when others then
    perform public._t_fail('disputa não abriu: ' || sqlerrm);
    failures := failures + 1;
  end;

  -- 22. terceiro não abre disputa
  perform set_config('request.jwt.claims', jsonb_build_object('sub', user_other::text, 'role', 'authenticated')::text, true);
  begin
    perform public.open_dispute(bk_completed2, 'Motivo indevido', 'Descrição indevida de terceiro.');
    perform public._t_fail('terceiro abriu disputa de outro booking');
    failures := failures + 1;
  exception when others then
    perform public._t_pass('terceiro NÃO abre disputa de outro booking');
  end;

  -- 23. disputa bloqueada em booking pending
  perform set_config('request.jwt.claims', jsonb_build_object('sub', user_pro::text, 'role', 'authenticated')::text, true);
  begin
    perform public.open_dispute(bk_pending, 'Motivo indevido', 'Descrição indevida em pendente.');
    perform public._t_fail('disputa aberta em booking pending');
    failures := failures + 1;
  exception when others then
    perform public._t_pass('disputa NÃO abre em booking pending');
  end;

  -- 24. disputa duplicada por booking bloqueada
  perform set_config('request.jwt.claims', jsonb_build_object('sub', user_client::text, 'role', 'authenticated')::text, true);
  begin
    perform public.open_dispute(bk_confirmed, 'Outro motivo', 'Outra descrição sobre o mesmo serviço.');
    perform public._t_fail('disputa duplicada passou');
    failures := failures + 1;
  exception when others then
    perform public._t_pass('disputa duplicada bloqueada');
  end;

  -- 25. mensagem: participante posta; terceiro bloqueado
  perform set_config('request.jwt.claims', jsonb_build_object('sub', user_other::text, 'role', 'authenticated')::text, true);
  begin
    perform public.add_dispute_message(dispute_id, 'Mensagem de terceiro.');
    perform public._t_fail('terceiro postou na disputa');
    failures := failures + 1;
  exception when others then
    perform public._t_pass('terceiro NÃO posta na disputa');
  end;

  perform set_config('request.jwt.claims', jsonb_build_object('sub', user_pro::text, 'role', 'authenticated')::text, true);
  begin
    perform public.add_dispute_message(dispute_id, 'Estou à disposição para resolver.');
    perform public._t_pass('participante posta mensagem na disputa');
  exception when others then
    perform public._t_fail('participante não postou: ' || sqlerrm);
    failures := failures + 1;
  end;

  -- 26. evidência: participante anexa; kind inválido bloqueado
  begin
    perform public.add_dispute_evidence(dispute_id, 'link', 'https://exemplo.com/evidencia');
    perform public._t_pass('participante anexa evidência');
  exception when others then
    perform public._t_fail('evidência não anexou: ' || sqlerrm);
    failures := failures + 1;
  end;
  begin
    perform public.add_dispute_evidence(dispute_id, 'video', 'https://exemplo.com/evidencia');
    perform public._t_fail('kind inválido passou');
    failures := failures + 1;
  exception when others then
    perform public._t_pass('tipo de evidência inválido bloqueado');
  end;

  -- 27. não-admin não resolve; admin resolve com nota
  begin
    perform public.resolve_dispute(dispute_id, 'resolved', 'Devolução combinada entre as partes.');
    perform public._t_fail('não-admin resolveu disputa');
    failures := failures + 1;
  exception when others then
    perform public._t_pass('não-admin NÃO resolve disputa');
  end;

  perform set_config('request.jwt.claims', jsonb_build_object('sub', user_admin::text, 'role', 'authenticated')::text, true);
  begin
    perform public.resolve_dispute(dispute_id, 'resolved', 'Devolução combinada entre as partes.');
    perform public._t_pass('admin resolve disputa');
  exception when others then
    perform public._t_fail('admin não resolveu: ' || sqlerrm);
    failures := failures + 1;
  end;

  -- 28. disputa encerrada não aceita mensagens
  perform set_config('request.jwt.claims', jsonb_build_object('sub', user_pro::text, 'role', 'authenticated')::text, true);
  begin
    perform public.add_dispute_message(dispute_id, 'Mensagem pós-encerramento.');
    perform public._t_fail('mensagem pós-encerramento passou');
    failures := failures + 1;
  exception when others then
    perform public._t_pass('disputa encerrada NÃO aceita mensagens');
  end;

  -- 29. transição inválida da disputa bloqueada pelo guard (resolved → open)
  set local role postgres;
  perform set_config('request.jwt.claims', '{}', true);
  begin
    update public.disputes set status = 'open' where id = dispute_id;
    perform public._t_fail('transição resolved → open passou');
    failures := failures + 1;
  exception when others then
    perform public._t_pass('guarda bloqueia transição inválida da disputa');
  end;

  -- 30. notificações de disputa chegaram (abertura notificou o pro;
  --     resolução notificou ambos)
  select count(*) into v_count
  from public.notifications n
  where n.type = 'dispute' and n.user_id = user_pro;
  if v_count >= 2 then
    perform public._t_pass('profissional notificado na abertura e resolução da disputa');
  else
    perform public._t_fail('profissional recebeu ' || v_count || ' notificações de disputa (esperado ≥ 2)');
    failures := failures + 1;
  end if;

  -- Cleanup
  set local role postgres;
  perform set_config('request.jwt.claims', '{}', true);
  truncate table public.dispute_evidence, public.dispute_messages, public.disputes,
    public.review_responses, public.reviews, public.notifications,
    public.messages, public.conversation_participants, public.conversations,
    public.bookings, public.services cascade;
  delete from auth.users where id in (user_client, user_pro, user_other, user_admin);
  delete from public.profiles where id in (user_client, user_pro, user_other, user_admin);

  if failures > 0 then
    raise notice 'ATENÇÃO: % teste(s) falharam!', failures;
  else
    raise notice 'TODOS OS TESTES PASSARAM!';
  end if;
end $$;

drop function if exists public._t_fail(text);
drop function if exists public._t_pass(text);
