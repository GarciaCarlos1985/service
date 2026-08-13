-- ============================================================
-- SERVICE — Milestone 4 · Agendamento + disponibilidade
-- - professional_availability: rotina semanal do profissional
-- - availability_exceptions: folgas/feriados/bloqueios por data
-- - bookings + booking_events: máquina de estados (spec §14)
-- - double booking garantido pelo BANCO via EXCLUDE USING gist
--   (ADR-009): nunca "verificar depois inserir"
-- - RPCs seguros: create_booking / confirm / start / complete /
--   cancel + available_slots (nunca escrita direta do cliente)
-- ============================================================

create extension if not exists btree_gist;

-- ------------------------------------------------------------
-- Disponibilidade (rotina semanal)
-- ------------------------------------------------------------
create table public.professional_availability (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.profiles (id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6), -- 0=domingo
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time),
  unique (professional_id, day_of_week, start_time)
);

create index professional_availability_professional_idx
  on public.professional_availability (professional_id);

-- Exceções por data (folgas, feriados, bloqueios)
create table public.availability_exceptions (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.profiles (id) on delete cascade,
  exception_date date not null,
  reason text check (reason is null or char_length(reason) between 2 and 200),
  is_blocked boolean not null default true,
  created_at timestamptz not null default now(),
  unique (professional_id, exception_date)
);

-- ------------------------------------------------------------
-- Bookings + máquina de estados
-- ------------------------------------------------------------
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  professional_id uuid not null references public.profiles (id) on delete cascade,
  service_id uuid not null references public.services (id),
  scheduled_at timestamptz not null,
  ends_at timestamptz not null,
  duration_minutes integer not null default 60
    check (duration_minutes between 15 and 480),
  price_cents integer not null check (price_cents >= 0),
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  cancellation_reason text
    check (cancellation_reason is null or char_length(cancellation_reason) between 2 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (client_id <> professional_id),
  check (scheduled_at > now() - interval '1 hour'),
  check (ends_at > scheduled_at)
);

-- ***** DOUBLE BOOKING: garantia dura no banco (ADR-009) *****
-- Dois bookings do mesmo profissional não podem ter janelas sobrepostas,
-- exceto cancelados. Corrida de dois cliques simultâneos: um perde na
-- constraint, não na boa vontade.
-- NOTA: expressão de índice exige funções IMMUTABLE; por isso o fim da
-- janela é uma COLUNA (ends_at, gravada pelo RPC create_booking — o único
-- caminho de escrita) e o índice usa tstzrange(coluna, coluna).
alter table public.bookings
  add constraint bookings_no_overlap
  exclude using gist (
    professional_id with =,
    tstzrange(scheduled_at, ends_at) with &&
  )
  where (status <> 'cancelled');

create index bookings_client_idx on public.bookings (client_id, scheduled_at);
create index bookings_professional_idx on public.bookings (professional_id, scheduled_at);

-- Histórico de transições (spec §14: transições validadas no backend)
create table public.booking_events (
  id bigint generated always as identity primary key,
  booking_id uuid not null references public.bookings (id) on delete cascade,
  from_status text,
  to_status text not null,
  actor_id uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index booking_events_booking_idx on public.booking_events (booking_id);

-- ------------------------------------------------------------
-- Guarda da máquina de estados (spec §14)
-- pending → confirmed → in_progress → completed
-- pending/confirmed → cancelled (com motivo)
-- completed é terminal
-- ------------------------------------------------------------
create or replace function public.bookings_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status <> old.status then
    if not (
      (old.status = 'pending' and new.status in ('confirmed', 'cancelled'))
      or (old.status = 'confirmed' and new.status in ('in_progress', 'cancelled'))
      or (old.status = 'in_progress' and new.status = 'completed')
    ) then
      raise exception 'transição de status inválida: % → %', old.status, new.status;
    end if;

    if new.status = 'cancelled' and nullif(trim(new.cancellation_reason), '') is null then
      raise exception 'cancelamento exige motivo';
    end if;

    insert into public.booking_events (booking_id, from_status, to_status, actor_id)
    values (old.id, old.status, new.status, auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_guard_trigger on public.bookings;
create trigger bookings_guard_trigger
  before update on public.bookings
  for each row execute function public.bookings_guard();

-- updated_at
create or replace function public.bookings_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists bookings_updated_at_trigger on public.bookings;
create trigger bookings_updated_at_trigger
  before update on public.bookings
  for each row execute function public.bookings_set_updated_at();

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table public.professional_availability enable row level security;
alter table public.availability_exceptions enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_events enable row level security;

-- Disponibilidade é pública (para o cliente ver os horários) — escrita só do dono
create policy "availability_select_public" on public.professional_availability
  for select using (true);

create policy "availability_insert_own" on public.professional_availability
  for insert to authenticated
  with check (professional_id = auth.uid());

create policy "availability_update_own" on public.professional_availability
  for update to authenticated
  using (professional_id = auth.uid())
  with check (professional_id = auth.uid());

create policy "availability_delete_own" on public.professional_availability
  for delete to authenticated
  using (professional_id = auth.uid());

-- Exceções: leitura pública, escrita só do dono
create policy "exceptions_select_public" on public.availability_exceptions
  for select using (true);

create policy "exceptions_insert_own" on public.availability_exceptions
  for insert to authenticated
  with check (professional_id = auth.uid());

create policy "exceptions_delete_own" on public.availability_exceptions
  for delete to authenticated
  using (professional_id = auth.uid());

-- Bookings: só as partes veem; NENHUMA escrita direta — tudo via RPC
create policy "bookings_select_participant" on public.bookings
  for select to authenticated
  using (client_id = auth.uid() or professional_id = auth.uid());

-- Eventos: só as partes veem o histórico do próprio booking
create policy "booking_events_select_participant" on public.booking_events
  for select to authenticated
  using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (b.client_id = auth.uid() or b.professional_id = auth.uid())
    )
  );

-- ------------------------------------------------------------
-- RPCs (SECURITY DEFINER — toda validação aqui; nada de escrita
-- direta no cliente, ADR-002/ADR-009)
-- ------------------------------------------------------------

-- Slots livres (só horários livres: sem exposição de dados de terceiros)
create or replace function public.available_slots(
  p_professional_id uuid,
  p_from_date date,
  p_days integer default 14,
  p_slot_minutes integer default 30
)
returns table (slot_date date, slot_time time)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_day integer;
  v_start time;
  v_end time;
  v_cur time;
begin
  if p_days not between 1 and 60 then
    raise exception 'p_days deve estar entre 1 e 60';
  end if;
  if p_slot_minutes not in (15, 30, 60) then
    raise exception 'p_slot_minutes deve ser 15, 30 ou 60';
  end if;

  for v_day in 0..6 loop
    for v_start, v_end in
      select a.start_time, a.end_time
      from public.professional_availability a
      where a.professional_id = p_professional_id
        and a.day_of_week = v_day
    loop
      v_cur := v_start;
      while v_cur + make_interval(mins => p_slot_minutes) <= v_end loop
        slot_date := p_from_date + ((v_day - extract(dow from p_from_date)::integer + 7) % 7);
        slot_time := v_cur;
        if slot_date between p_from_date and p_from_date + (p_days - 1) then
          -- sem exceção bloqueada no dia
          if not exists (
            select 1 from public.availability_exceptions e
            where e.professional_id = p_professional_id
              and e.exception_date = slot_date
              and e.is_blocked
          ) then
            -- sem booking sobreposto
            if not exists (
              select 1 from public.bookings b
              where b.professional_id = p_professional_id
                and b.status <> 'cancelled'
                and tstzrange(
                      b.scheduled_at,
                      b.ends_at
                    ) && tstzrange(
                      slot_date + slot_time,
                      slot_date + slot_time + make_interval(mins => p_slot_minutes)
                    )
            ) then
              return next;
            end if;
          end if;
        end if;
        v_cur := v_cur + make_interval(mins => p_slot_minutes);
      end loop;
    end loop;
  end loop;
end;
$$;

revoke all on function public.available_slots(uuid, date, integer, integer) from public;
grant execute on function public.available_slots(uuid, date, integer, integer) to anon, authenticated;

-- Criação do booking: valida serviço, disponibilidade, exceções e
-- sobreposição; o EXCLUDE constraint é a garantia final (ADR-009).
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
begin
  -- apenas autenticado
  if auth.uid() is null then
    raise exception 'não autenticado';
  end if;

  -- serviço pertence ao profissional e está ativo
  select s.professional_id, coalesce(s.price_from_cents, 0)
    into v_professional, v_price
  from public.services s
  where s.id = p_service_id and s.is_active;
  if v_professional is null or v_professional <> p_professional_id then
    raise exception 'serviço inválido';
  end if;

  -- horário no futuro
  if p_scheduled_at <= now() then
    raise exception 'o horário precisa estar no futuro';
  end if;

  -- dentro da disponibilidade semanal
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

  -- sem exceção bloqueada
  select exists (
    select 1 from public.availability_exceptions e
    where e.professional_id = p_professional_id
      and e.exception_date = p_scheduled_at::date
      and e.is_blocked
  ) into v_exception;
  if v_exception then
    raise exception 'data indisponível para o profissional';
  end if;

  -- escrita + garantia final do banco
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

    return v_booking;
  exception
    when exclusion_violation then
      raise exception 'este horário acabou de ser reservado — escolha outro';
  end;
end;
$$;

revoke all on function public.create_booking(uuid, uuid, timestamptz, integer) from public;
grant execute on function public.create_booking(uuid, uuid, timestamptz, integer) to authenticated;

-- Transições de estado (todas auditadas em booking_events; a guarda
-- valida as regras da spec §14)
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
end;
$$;

create or replace function public.start_booking(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.bookings b
    where b.id = p_booking_id and b.professional_id = auth.uid()
  ) then
    raise exception 'apenas o profissional pode iniciar o serviço';
  end if;
  update public.bookings set status = 'in_progress' where id = p_booking_id;
end;
$$;

create or replace function public.complete_booking(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.bookings b
    where b.id = p_booking_id and b.client_id = auth.uid()
  ) then
    raise exception 'apenas o cliente pode concluir o serviço';
  end if;
  update public.bookings set status = 'completed' where id = p_booking_id;
end;
$$;

create or replace function public.cancel_booking(p_booking_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.bookings b
    where b.id = p_booking_id
      and (b.client_id = auth.uid() or b.professional_id = auth.uid())
  ) then
    raise exception 'apenas cliente ou profissional podem cancelar';
  end if;
  update public.bookings
  set status = 'cancelled', cancellation_reason = p_reason
  where id = p_booking_id;
end;
$$;

revoke all on function public.confirm_booking(uuid) from public;
revoke all on function public.start_booking(uuid) from public;
revoke all on function public.complete_booking(uuid) from public;
revoke all on function public.cancel_booking(uuid, text) from public;
grant execute on function public.confirm_booking(uuid) to authenticated;
grant execute on function public.start_booking(uuid) to authenticated;
grant execute on function public.complete_booking(uuid) to authenticated;
grant execute on function public.cancel_booking(uuid, text) to authenticated;
