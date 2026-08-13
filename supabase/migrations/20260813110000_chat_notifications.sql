-- ============================================================
-- SERVICE — Milestone 7 · Chat + Notificações (spec §27/§28)
-- - chat exclusivamente ligado ao booking (nunca rede social)
-- - mensagens com rate limiting, unread count e read status
-- - Realtime habilitado para mensagens (publicação supabase_realtime)
-- - notificações centralizadas in-app (email/push na arquitetura)
-- - RLS: só participantes; escrita sempre via RPC (ADR-002)
-- ============================================================

-- ------------------------------------------------------------
-- Conversas (uma por booking — spec §27: ligada a booking,
-- cliente e profissional; nunca conversa de terceiros)
-- ------------------------------------------------------------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  professional_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (client_id <> professional_id)
);

create index conversations_participant_idx
  on public.conversations (client_id, professional_id);

-- ------------------------------------------------------------
-- Mensagens
-- ------------------------------------------------------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index messages_conversation_idx
  on public.messages (conversation_id, created_at desc);

-- ------------------------------------------------------------
-- Participantes + last_read_at (spec §27: read status)
-- ------------------------------------------------------------
create table public.conversation_participants (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, profile_id)
);

-- ------------------------------------------------------------
-- Notificações centralizadas (spec §28 — in-app agora)
-- ------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null
    check (type in ('booking', 'payment', 'payout', 'cashback', 'review', 'referral', 'system', 'dispute', 'security')),
  title text not null check (char_length(title) between 2 and 120),
  body text,
  data jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx
  on public.notifications (user_id, created_at desc);

-- ------------------------------------------------------------
-- RLS — leitura só dos participantes/dono; escrita via RPC
-- ------------------------------------------------------------
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.notifications enable row level security;

create policy "conversations_select_participant" on public.conversations
  for select to authenticated
  using (client_id = auth.uid() or professional_id = auth.uid());

create policy "messages_select_participant" on public.messages
  for select to authenticated
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.client_id = auth.uid() or c.professional_id = auth.uid())
    )
  );

create policy "conversation_participants_select_own" on public.conversation_participants
  for select to authenticated
  using (profile_id = auth.uid());

create policy "notifications_select_own" on public.notifications
  for select to authenticated
  using (user_id = auth.uid());

-- Realtime (spec §27: Supabase Realtime onde fizer sentido)
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.notifications;

-- ------------------------------------------------------------
-- Helper de notificação (usado pelas RPCs de negócio)
-- ------------------------------------------------------------
create or replace function public._notify(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_data jsonb default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notifications (user_id, type, title, body, data)
  values (p_user_id, p_type, p_title, p_body, p_data);
end;
$$;

-- ------------------------------------------------------------
-- Chat — RPCs (escrita SEMPRE via RPC — ADR-002)
-- ------------------------------------------------------------
-- Abre a conversa do booking (ou retorna a existente); cria os
-- participantes. Somente cliente ou profissional do booking.
create or replace function public.open_conversation(p_booking_id uuid)
returns public.conversations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conv public.conversations;
begin
  if auth.uid() is null then
    raise exception 'não autenticado';
  end if;

  select * into v_conv from public.conversations where booking_id = p_booking_id;
  if v_conv is null then
    insert into public.conversations (booking_id, client_id, professional_id)
    select b.id, b.client_id, b.professional_id
    from public.bookings b
    where b.id = p_booking_id
      and (b.client_id = auth.uid() or b.professional_id = auth.uid())
    returning * into v_conv;
    if v_conv is null then
      raise exception 'apenas cliente ou profissional do booking acessam a conversa';
    end if;
    insert into public.conversation_participants (conversation_id, profile_id)
    values (v_conv.id, v_conv.client_id), (v_conv.id, v_conv.professional_id)
    on conflict do nothing;
  end if;

  -- garante participação
  if auth.uid() <> v_conv.client_id and auth.uid() <> v_conv.professional_id then
    raise exception 'acesso negado';
  end if;

  return v_conv;
end;
$$;

-- Envia mensagem (valida participação + rate limit leve)
create or replace function public.send_message(
  p_conversation_id uuid,
  p_body text
)
returns public.messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conv public.conversations;
  v_msg public.messages;
  v_count integer;
begin
  if auth.uid() is null then
    raise exception 'não autenticado';
  end if;
  if char_length(p_body) not between 1 and 2000 then
    raise exception 'mensagem entre 1 e 2000 caracteres';
  end if;

  select * into v_conv from public.conversations where id = p_conversation_id;
  if v_conv is null then
    raise exception 'conversa não encontrada';
  end if;
  if auth.uid() <> v_conv.client_id and auth.uid() <> v_conv.professional_id then
    raise exception 'apenas participantes enviam mensagens';
  end if;

  -- rate limiting (spec §27): até 10 mensagens por minuto por usuário
  select count(*) into v_count
  from public.messages
  where sender_id = auth.uid()
    and created_at > now() - interval '1 minute';
  if v_count >= 10 then
    raise exception 'muitas mensagens — aguarde um instante';
  end if;

  insert into public.messages (conversation_id, sender_id, body)
  values (p_conversation_id, auth.uid(), p_body)
  returning * into v_msg;

  update public.conversation_participants
  set last_read_at = now()
  where conversation_id = p_conversation_id and profile_id = auth.uid();

  return v_msg;
end;
$$;

-- Marca a conversa como lida
create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'não autenticado';
  end if;
  update public.conversation_participants
  set last_read_at = now()
  where conversation_id = p_conversation_id and profile_id = auth.uid();
end;
$$;

-- Lista as conversas do usuário com contagem de não lidas
create or replace function public.list_my_conversations()
returns table (
  conversation_id uuid,
  booking_id uuid,
  other_party_id uuid,
  other_party_name text,
  last_message text,
  last_message_at timestamptz,
  unread_count bigint
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'não autenticado';
  end if;

  return query
  select
    c.id as conversation_id,
    c.booking_id,
    case when c.client_id = auth.uid() then c.professional_id else c.client_id end as other_party_id,
    case when c.client_id = auth.uid() then p_pro.full_name else p_cli.full_name end as other_party_name,
    (select m.body from public.messages m where m.conversation_id = c.id order by m.created_at desc limit 1) as last_message,
    (select m.created_at from public.messages m where m.conversation_id = c.id order by m.created_at desc limit 1) as last_message_at,
    (select count(*) from public.messages m
      join public.conversation_participants cp on cp.conversation_id = m.conversation_id
      where m.conversation_id = c.id
        and m.sender_id <> auth.uid()
        and m.created_at > cp.last_read_at
        and cp.profile_id = auth.uid()) as unread_count
  from public.conversations c
  join public.profiles p_cli on p_cli.id = c.client_id
  join public.profiles p_pro on p_pro.id = c.professional_id
  where c.client_id = auth.uid() or c.professional_id = auth.uid()
  order by last_message_at desc nulls last;
end;
$$;

-- Mensagens da conversa (paginação por cursor — spec §52)
create or replace function public.list_conversation_messages(
  p_conversation_id uuid,
  p_before timestamptz default null,
  p_limit integer default 50
)
returns setof public.messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conv public.conversations;
begin
  if auth.uid() is null then
    raise exception 'não autenticado';
  end if;
  if p_limit not between 1 and 200 then
    raise exception 'limite inválido';
  end if;

  select * into v_conv from public.conversations where id = p_conversation_id;
  if v_conv is null then
    raise exception 'conversa não encontrada';
  end if;
  if auth.uid() <> v_conv.client_id and auth.uid() <> v_conv.professional_id then
    raise exception 'acesso negado';
  end if;

  return query
  select * from public.messages
  where conversation_id = p_conversation_id
    and (p_before is null or created_at < p_before)
  order by created_at desc
  limit p_limit;
end;
$$;

create or replace function public.get_unread_messages_count()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_unread integer;
begin
  if auth.uid() is null then
    raise exception 'não autenticado';
  end if;

  select coalesce(sum(
    (select count(*) from public.messages m
      join public.conversation_participants cp on cp.conversation_id = m.conversation_id
      where m.conversation_id = c.id
        and m.sender_id <> auth.uid()
        and m.created_at > cp.last_read_at
        and cp.profile_id = auth.uid())
  ), 0) into v_unread
  from public.conversations c
  where c.client_id = auth.uid() or c.professional_id = auth.uid();

  return v_unread;
end;
$$;

revoke all on function public.open_conversation(uuid) from public;
revoke all on function public.send_message(uuid, text) from public;
revoke all on function public.mark_conversation_read(uuid) from public;
revoke all on function public.list_my_conversations() from public;
revoke all on function public.list_conversation_messages(uuid, timestamptz, integer) from public;
revoke all on function public.get_unread_messages_count() from public;
grant execute on function public.open_conversation(uuid) to authenticated;
grant execute on function public.send_message(uuid, text) to authenticated;
grant execute on function public.mark_conversation_read(uuid) to authenticated;
grant execute on function public.list_my_conversations() to authenticated;
grant execute on function public.list_conversation_messages(uuid, timestamptz, integer) to authenticated;
grant execute on function public.get_unread_messages_count() to authenticated;

-- ------------------------------------------------------------
-- Notificações — consultas
-- ------------------------------------------------------------
create or replace function public.list_my_notifications(p_limit integer default 50)
returns setof public.notifications
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'não autenticado';
  end if;
  if p_limit not between 1 and 200 then
    raise exception 'limite inválido';
  end if;

  return query
  select * from public.notifications
  where user_id = auth.uid()
  order by created_at desc
  limit p_limit;
end;
$$;

create or replace function public.mark_notifications_read()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'não autenticado';
  end if;
  update public.notifications set read_at = now()
  where user_id = auth.uid() and read_at is null;
end;
$$;

create or replace function public.get_unread_notifications_count()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if auth.uid() is null then
    raise exception 'não autenticado';
  end if;
  select count(*) into v_count
  from public.notifications
  where user_id = auth.uid() and read_at is null;
  return v_count;
end;
$$;

revoke all on function public.list_my_notifications(integer) from public;
revoke all on function public.mark_notifications_read() from public;
revoke all on function public.get_unread_notifications_count() from public;
grant execute on function public.list_my_notifications(integer) to authenticated;
grant execute on function public.mark_notifications_read() to authenticated;
grant execute on function public.get_unread_notifications_count() to authenticated;

-- ------------------------------------------------------------
-- Integração: eventos de negócio geram notificações (spec §28)
-- ------------------------------------------------------------

-- booking criado → notifica o profissional
create or replace function public.create_booking(
  p_professional_id uuid,
  p_service_id uuid,
  p_scheduled_at timestamptz,
  p_duration_minutes integer default 60
)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_professional uuid;
  v_price integer;
  v_day integer;
  v_exception boolean;
  v_booking public.bookings;
  v_service_title text;
begin
  if auth.uid() is null then
    raise exception 'não autenticado';
  end if;

  select s.professional_id, coalesce(s.price_from_cents, 0), s.title
    into v_professional, v_price, v_service_title
  from public.services s
  where s.id = p_service_id and s.is_active;
  if v_professional is null or v_professional <> p_professional_id then
    raise exception 'serviço inválido';
  end if;

  if p_scheduled_at <= now() then
    raise exception 'o horário precisa estar no futuro';
  end if;

  v_day := extract(dow from p_scheduled_at)::integer;
  if not exists (
    select 1 from public.professional_availability a
    where a.professional_id = p_professional_id
      and a.day_of_week = v_day
      and a.start_time <= p_scheduled_at::time
      and a.end_time >= p_scheduled_at::time + make_interval(mins => p_duration_minutes)
  ) then
    raise exception 'horário fora da disponibilidade do profissional';
  end if;

  select exists (
    select 1 from public.availability_exceptions e
    where e.professional_id = p_professional_id
      and e.exception_date = p_scheduled_at::date
      and e.is_blocked
  ) into v_exception;
  if v_exception then
    raise exception 'data indisponível para o profissional';
  end if;

  begin
    insert into public.bookings (
      client_id, professional_id, service_id, scheduled_at, ends_at,
      duration_minutes, price_cents, status
    ) values (
      auth.uid(), p_professional_id, p_service_id, p_scheduled_at,
      p_scheduled_at + make_interval(mins => p_duration_minutes),
      p_duration_minutes, v_price, 'pending'
    )
    returning * into v_booking;

    insert into public.booking_events (booking_id, from_status, to_status, actor_id)
    values (v_booking.id, null, 'pending', auth.uid());

    perform public._notify(
      p_professional_id, 'booking',
      'Novo agendamento',
      'Você recebeu uma solicitação de agendamento: ' || v_service_title,
      jsonb_build_object('booking_id', v_booking.id)
    );

    return v_booking;
  exception
    when exclusion_violation then
      raise exception 'este horário acabou de ser reservado — escolha outro';
  end;
end;
$$;

revoke all on function public.create_booking(uuid, uuid, timestamptz, integer) from public;
grant execute on function public.create_booking(uuid, uuid, timestamptz, integer) to authenticated;

-- confirmado → notifica o cliente
create or replace function public.confirm_booking(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.bookings b
    join public.profiles p on p.id = b.professional_id
    where b.id = p_booking_id
      and b.professional_id = auth.uid()
      and p.user_type = 'professional'
  ) then
    raise exception 'apenas o profissional pode confirmar';
  end if;
  update public.bookings set status = 'confirmed' where id = p_booking_id;
  perform public._notify(
    (select client_id from public.bookings where id = p_booking_id),
    'booking', 'Agendamento confirmado',
    'O profissional confirmou seu horário.',
    jsonb_build_object('booking_id', p_booking_id)
  );
end;
$$;

-- cancelado → notifica a outra parte
create or replace function public.cancel_booking(p_booking_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
begin
  select * into v_booking from public.bookings where id = p_booking_id;
  if v_booking is null then
    raise exception 'booking não encontrado';
  end if;
  if auth.uid() <> v_booking.client_id and auth.uid() <> v_booking.professional_id then
    raise exception 'apenas cliente ou profissional podem cancelar';
  end if;

  update public.bookings
  set status = 'cancelled', cancellation_reason = p_reason
  where id = p_booking_id;

  perform public._notify(
    case when auth.uid() = v_booking.client_id then v_booking.professional_id else v_booking.client_id end,
    'booking', 'Agendamento cancelado',
    'O agendamento foi cancelado. Motivo: ' || coalesce(p_reason, 'não informado'),
    jsonb_build_object('booking_id', p_booking_id)
  );
end;
$$;

revoke all on function public.confirm_booking(uuid) from public;
revoke all on function public.cancel_booking(uuid, text) from public;
grant execute on function public.confirm_booking(uuid) to authenticated;
grant execute on function public.cancel_booking(uuid, text) to authenticated;

-- cashback creditado → notifica o cliente (dentro do processamento)
create or replace function public.process_booking_financials(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking record;
  v_gross integer;
  v_commission integer;
  v_net integer;
  v_cashback integer;
  v_pro_wallet uuid;
  v_client_wallet uuid;
  v_platform_wallet uuid;
  v_cat_id bigint;
begin
  select b.*, s.category_id
    into v_booking
  from public.bookings b
  join public.services s on s.id = b.service_id
  where b.id = p_booking_id
  for update;

  if v_booking is null then
    raise exception 'booking não encontrado';
  end if;
  if v_booking.status <> 'completed' then
    raise exception 'liberação financeira exige booking concluído (spec §15)';
  end if;

  if exists (
    select 1 from public.wallet_transactions t
    where t.reference_type = 'booking_completion' and t.reference_id = p_booking_id
  ) then
    raise exception 'booking já processado financeiramente';
  end if;

  v_gross := coalesce(v_booking.price_cents, 0);
  v_cat_id := v_booking.category_id;
  v_commission := public.resolve_commission(v_cat_id, v_gross);
  v_net := v_gross - v_commission;
  v_cashback := public._resolve_cashback(v_booking.client_id, v_gross);

  v_pro_wallet := public._get_or_create_wallet(v_booking.professional_id);
  v_client_wallet := public._get_or_create_wallet(v_booking.client_id);
  v_platform_wallet := public._get_platform_wallet();

  perform public._ledger_credit(
    v_pro_wallet, 'credit', v_net,
    'booking_completion_pro_' || p_booking_id::text,
    'booking_completion', p_booking_id,
    'Serviço concluído — líquido após comissão'
  );

  perform public._ledger_credit(
    v_platform_wallet, 'platform_fee', v_commission,
    'booking_completion_fee_' || p_booking_id::text,
    'booking_completion', p_booking_id,
    'Comissão do serviço'
  );

  if v_cashback > 0 then
    perform public._ledger_credit(
      v_client_wallet, 'cashback', v_cashback,
      'booking_completion_cb_' || p_booking_id::text,
      'booking_completion', p_booking_id,
      'Cashback do serviço concluído'
    );
    perform public._notify(
      v_booking.client_id, 'cashback', 'Cashback recebido!',
      'Você ganhou ' || (v_cashback / 100)::text || ' reais de cashback pelo serviço concluído.',
      jsonb_build_object('booking_id', p_booking_id)
    );
  end if;
end;
$$;

revoke all on function public.process_booking_financials(uuid) from public;
