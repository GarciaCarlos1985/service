-- ============================================================
-- SERVICE — Milestone 8 · Reviews + confiança + disputas (spec §32/§33/§34)
-- - profiles.verification_status: verificação controlada por admin
--   (unverified → pending → verified / rejected / suspended)
-- - profiles.is_admin: marcador de admin (M10 consome); coluna
--   inalterável pelo próprio usuário
-- - reviews: SÓ booking concluído, SÓ pelo cliente do booking,
--   1 avaliação por booking (unique), sem autoavaliação
-- - review_responses: profissional responde a própria avaliação, 1x
-- - badges com regra objetiva (função professional_badges)
-- - disputes: ligada a booking, estados open/under_review/resolved/
--   rejected, mensagens + evidências (URL — upload R2 na M11)
-- - escrita 100% via RPC (ADR-002); RLS default deny nas tabelas novas
-- ============================================================

-- ------------------------------------------------------------
-- Confiança (spec §32): verificação + marcador de admin
-- ------------------------------------------------------------
alter table public.profiles
  add column verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'pending', 'verified', 'rejected', 'suspended'));

alter table public.profiles
  add column is_admin boolean not null default false;

comment on column public.profiles.verification_status is
  'Confiança (spec §32): unverified → pending (solicitado) → verified/rejected/suspended. Só admin altera.';
comment on column public.profiles.is_admin is
  'Marcador de administrador (M10). Nunca alterável pelo próprio usuário.';

-- Política de update do próprio perfil reforçada (ADR-002): usuário
-- NUNCA altera user_type (spec §63), verification_status nem is_admin.
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and user_type = (select user_type from public.profiles where id = auth.uid())
    and verification_status = (select verification_status from public.profiles where id = auth.uid())
    and is_admin = (select is_admin from public.profiles where id = auth.uid())
  );

-- Defesa em profundidade: mesmo que a policy mude, authenticated não
-- tem privilégio de UPDATE nessas colunas.
revoke update (verification_status, is_admin) on public.profiles from authenticated;

-- Perfil público (ADR-016): anon precisa ler o selo de verificação
-- (dado público do profissional) — nada além disso.
grant select (verification_status) on public.profiles to anon;

-- ------------------------------------------------------------
-- Avaliações (spec §33)
-- ------------------------------------------------------------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  professional_id uuid not null references public.profiles (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) between 3 and 1000),
  created_at timestamptz not null default now(),
  check (reviewer_id <> professional_id)
);

comment on table public.reviews is
  'Avaliação de booking concluído (spec §33). 1 por booking (unique). Sem edição/exclusão — manipulação bloqueada por construção.';

create index reviews_professional_idx on public.reviews (professional_id, created_at desc);
create index reviews_booking_idx on public.reviews (booking_id);

-- Resposta do profissional (spec §33): 1 por avaliação
create table public.review_responses (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null unique references public.reviews (id) on delete cascade,
  professional_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 3 and 1000),
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Disputas (spec §34)
-- ------------------------------------------------------------
create table public.disputes (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id) on delete cascade,
  opened_by uuid not null references public.profiles (id) on delete cascade,
  reason text not null check (char_length(reason) between 3 and 200),
  description text check (description is null or char_length(description) between 10 and 3000),
  status text not null default 'open'
    check (status in ('open', 'under_review', 'resolved', 'rejected')),
  resolution_note text check (resolution_note is null or char_length(resolution_note) between 3 and 1000),
  resolved_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.disputes is
  'Disputa ligada a booking (spec §34). 1 por booking (unique). Decisão apenas admin (M10).';

create index disputes_booking_idx on public.disputes (booking_id);
create index disputes_opened_by_idx on public.disputes (opened_by, created_at desc);

create table public.dispute_messages (
  id uuid primary key default gen_random_uuid(),
  dispute_id uuid not null references public.disputes (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 2 and 2000),
  created_at timestamptz not null default now()
);

create index dispute_messages_dispute_idx on public.dispute_messages (dispute_id, created_at);

-- Evidências (spec §34): referência de arquivo. Upload real chega com
-- R2 na M11 (ADR-017: sem infra nova agora).
create table public.dispute_evidence (
  id uuid primary key default gen_random_uuid(),
  dispute_id uuid not null references public.disputes (id) on delete cascade,
  kind text not null check (kind in ('image', 'document', 'link')),
  url text not null check (char_length(url) between 5 and 2048),
  added_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index dispute_evidence_dispute_idx on public.dispute_evidence (dispute_id, created_at);

-- ------------------------------------------------------------
-- Guarda da máquina de estados das disputas (spec §34)
-- open → under_review / resolved / rejected
-- under_review → resolved / rejected
-- resolved e rejected são terminais; decisão exige nota
-- ------------------------------------------------------------
create or replace function public.disputes_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status <> old.status then
    if not (
      (old.status = 'open' and new.status in ('under_review', 'resolved', 'rejected'))
      or (old.status = 'under_review' and new.status in ('resolved', 'rejected'))
    ) then
      raise exception 'transição de disputa inválida: % → %', old.status, new.status;
    end if;

    if new.status in ('resolved', 'rejected')
      and nullif(trim(new.resolution_note), '') is null then
      raise exception 'decisão de disputa exige nota de resolução';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists disputes_guard_trigger on public.disputes;
create trigger disputes_guard_trigger
  before update on public.disputes
  for each row execute function public.disputes_guard();

-- updated_at
create or replace function public.disputes_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists disputes_updated_at_trigger on public.disputes;
create trigger disputes_updated_at_trigger
  before update on public.disputes
  for each row execute function public.disputes_set_updated_at();

-- ------------------------------------------------------------
-- RLS — ADR-002: default deny; TODO acesso via RPC
-- (nenhuma policy de select/insert/update/delete aqui)
-- ------------------------------------------------------------
alter table public.reviews enable row level security;
alter table public.review_responses enable row level security;
alter table public.disputes enable row level security;
alter table public.dispute_messages enable row level security;
alter table public.dispute_evidence enable row level security;

-- ------------------------------------------------------------
-- Helper: usuário é admin? (único ponto de verdade)
-- ------------------------------------------------------------
create or replace function public._is_admin()
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_admin
  );
$$;

-- ------------------------------------------------------------
-- Confiança — RPCs (spec §32)
-- ------------------------------------------------------------
-- Profissional solicita verificação
create or replace function public.request_verification()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles;
begin
  if auth.uid() is null then
    raise exception 'não autenticado';
  end if;

  select * into v_profile from public.profiles where id = auth.uid();
  if v_profile.user_type <> 'professional' then
    raise exception 'apenas profissionais solicitam verificação';
  end if;
  if v_profile.verification_status = 'pending' then
    raise exception 'solicitação já está em análise';
  end if;
  if v_profile.verification_status = 'verified' then
    raise exception 'perfil já verificado';
  end if;
  if v_profile.verification_status = 'suspended' then
    raise exception 'perfil suspenso não pode solicitar verificação';
  end if;

  update public.profiles set verification_status = 'pending' where id = auth.uid();
end;
$$;

-- Admin define o status de verificação (M10 consome; guarda ativa agora)
create or replace function public.set_verification_status(p_profile_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target public.profiles;
begin
  if auth.uid() is null then
    raise exception 'não autenticado';
  end if;
  if not public._is_admin() then
    raise exception 'apenas administradores alteram verificação';
  end if;
  if p_status not in ('unverified', 'pending', 'verified', 'rejected', 'suspended') then
    raise exception 'status de verificação inválido';
  end if;

  select * into v_target from public.profiles where id = p_profile_id;
  if v_target is null then
    raise exception 'perfil não encontrado';
  end if;

  update public.profiles set verification_status = p_status where id = p_profile_id;

  perform public._notify(
    p_profile_id,
    case when p_status in ('rejected', 'suspended') then 'security' else 'system' end,
    case
      when p_status = 'verified' then 'Verificação aprovada!'
      when p_status = 'rejected' then 'Verificação recusada'
      when p_status = 'suspended' then 'Conta suspensa'
      else 'Verificação atualizada'
    end,
    case
      when p_status = 'verified' then 'Seu perfil agora exibe o selo de profissional verificado.'
      when p_status = 'rejected' then 'A equipe não aprovou sua verificação. Você pode corrigir os dados e solicitar novamente.'
      when p_status = 'suspended' then 'Sua conta foi suspensa. Entre em contato com o suporte.'
      else 'O status da sua verificação mudou.'
    end,
    jsonb_build_object('verification_status', p_status)
  );
end;
$$;

-- ------------------------------------------------------------
-- Avaliações — RPCs (spec §33)
-- ------------------------------------------------------------
-- Cliente avalia booking concluído (único caminho de escrita)
create or replace function public.create_review(
  p_booking_id uuid,
  p_rating integer,
  p_comment text
)
returns public.reviews
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
  v_review public.reviews;
begin
  if auth.uid() is null then
    raise exception 'não autenticado';
  end if;
  if p_rating not between 1 and 5 then
    raise exception 'nota precisa estar entre 1 e 5';
  end if;
  if p_comment is not null and char_length(p_comment) not between 3 and 1000 then
    raise exception 'comentário entre 3 e 1000 caracteres';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id;
  if v_booking is null then
    raise exception 'booking não encontrado';
  end if;
  if auth.uid() <> v_booking.client_id then
    raise exception 'apenas o cliente do booking avalia o serviço';
  end if;
  if v_booking.status <> 'completed' then
    raise exception 'avaliação exige serviço concluído';
  end if;

  insert into public.reviews (booking_id, reviewer_id, professional_id, rating, comment)
  values (p_booking_id, auth.uid(), v_booking.professional_id, p_rating, p_comment)
  returning * into v_review;

  perform public._notify(
    v_booking.professional_id, 'review', 'Nova avaliação recebida',
    'Um cliente avaliou seu serviço com ' || p_rating::text || ' estrela(s).',
    jsonb_build_object('booking_id', p_booking_id, 'review_id', v_review.id)
  );

  return v_review;
exception
  when unique_violation then
    raise exception 'este serviço já foi avaliado';
end;
$$;

-- Profissional responde à própria avaliação (1x — unique no banco)
create or replace function public.respond_review(p_review_id uuid, p_body text)
returns public.review_responses
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_review public.reviews;
  v_response public.review_responses;
begin
  if auth.uid() is null then
    raise exception 'não autenticado';
  end if;
  if char_length(p_body) not between 3 and 1000 then
    raise exception 'resposta entre 3 e 1000 caracteres';
  end if;

  select * into v_review from public.reviews where id = p_review_id;
  if v_review is null then
    raise exception 'avaliação não encontrada';
  end if;
  if auth.uid() <> v_review.professional_id then
    raise exception 'apenas o profissional avaliado responde';
  end if;

  insert into public.review_responses (review_id, professional_id, body)
  values (p_review_id, auth.uid(), p_body)
  returning * into v_response;

  perform public._notify(
    v_review.reviewer_id, 'review', 'Resposta à sua avaliação',
    'O profissional respondeu à sua avaliação.',
    jsonb_build_object('review_id', p_review_id)
  );

  return v_response;
exception
  when unique_violation then
    raise exception 'esta avaliação já foi respondida';
end;
$$;

-- ------------------------------------------------------------
-- Avaliações — consultas (spec §22/§23/§52)
-- ------------------------------------------------------------
-- Lista pública de avaliações do profissional (paginação por cursor)
-- Nome do avaliador exibido reduzido (primeiro nome + inicial) — o
-- contrato público nunca expõe o perfil completo do cliente (ADR-016).
create or replace function public.list_professional_reviews(
  p_professional_id uuid,
  p_limit integer default 20,
  p_before timestamptz default null
)
returns table (
  id uuid,
  rating smallint,
  comment text,
  created_at timestamptz,
  reviewer_name text,
  response_body text,
  response_created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_limit not between 1 and 100 then
    raise exception 'limite inválido';
  end if;

  return query
  select
    r.id, r.rating, r.comment, r.created_at,
    (
      select case
        when p.full_name ~ ' ' then
          split_part(p.full_name, ' ', 1) || ' ' || left(split_part(p.full_name, ' ', 2), 1) || '.'
        else coalesce(p.full_name, 'Cliente')
      end
      from public.profiles p where p.id = r.reviewer_id
    ) as reviewer_name,
    rr.body as response_body,
    rr.created_at as response_created_at
  from public.reviews r
  left join public.review_responses rr on rr.review_id = r.id
  where r.professional_id = p_professional_id
    and (p_before is null or r.created_at < p_before)
  order by r.created_at desc
  limit p_limit;
end;
$$;

-- Média + total (perfil público, busca)
create or replace function public.professional_rating_summary(p_professional_id uuid)
returns table (avg_rating numeric, review_count bigint)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  select
    coalesce(round(avg(r.rating)::numeric, 1), 0) as avg_rating,
    count(*) as review_count
  from public.reviews r
  where r.professional_id = p_professional_id;
end;
$$;

-- Badges com regra objetiva (spec §32):
--   verificado      → verification_status = 'verified'
--   alta_avaliacao  → média ≥ 4,5 com ≥ 5 avaliações
--   top             → ≥ 10 bookings concluídos nos últimos 90 dias
--                     (updated_at = última mudança de status) E média ≥ 4,5
--   pro             → M9 (assinatura) — não emitido até lá
create or replace function public.professional_badges(p_professional_id uuid)
returns table (badge text, label text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_verified boolean := false;
  v_avg numeric := 0;
  v_count bigint := 0;
  v_recent_completed bigint := 0;
begin
  select verification_status = 'verified' into v_verified
  from public.profiles where id = p_professional_id;

  select coalesce(avg(r.rating), 0), count(*) into v_avg, v_count
  from public.reviews r where r.professional_id = p_professional_id;

  select count(*) into v_recent_completed
  from public.bookings b
  where b.professional_id = p_professional_id
    and b.status = 'completed'
    and b.updated_at >= now() - interval '90 days';

  if v_verified then
    return query select 'verificado'::text, 'Verificado'::text;
  end if;
  if v_count >= 5 and v_avg >= 4.5 then
    return query select 'alta_avaliacao'::text, 'Alta avaliação'::text;
  end if;
  if v_recent_completed >= 10 and v_avg >= 4.5 then
    return query select 'top'::text, 'Top profissional'::text;
  end if;
end;
$$;

-- Avaliações do próprio cliente (agenda: "já avaliei?")
create or replace function public.list_my_reviews()
returns table (
  id uuid,
  booking_id uuid,
  professional_id uuid,
  rating smallint,
  comment text,
  created_at timestamptz
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
  select r.id, r.booking_id, r.professional_id, r.rating, r.comment, r.created_at
  from public.reviews r
  where r.reviewer_id = auth.uid()
  order by r.created_at desc;
end;
$$;

-- ------------------------------------------------------------
-- Disputas — RPCs (spec §34)
-- ------------------------------------------------------------
create or replace function public.open_dispute(
  p_booking_id uuid,
  p_reason text,
  p_description text
)
returns public.disputes
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
  v_dispute public.disputes;
begin
  if auth.uid() is null then
    raise exception 'não autenticado';
  end if;
  if char_length(p_reason) not between 3 and 200 then
    raise exception 'motivo entre 3 e 200 caracteres';
  end if;
  if p_description is not null and char_length(p_description) not between 10 and 3000 then
    raise exception 'descrição entre 10 e 3000 caracteres';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id;
  if v_booking is null then
    raise exception 'booking não encontrado';
  end if;
  if auth.uid() <> v_booking.client_id and auth.uid() <> v_booking.professional_id then
    raise exception 'apenas cliente ou profissional do booking abrem disputa';
  end if;
  if v_booking.status = 'pending' then
    raise exception 'disputa só pode ser aberta após o agendamento sair de pendente';
  end if;

  insert into public.disputes (booking_id, opened_by, reason, description)
  values (p_booking_id, auth.uid(), p_reason, p_description)
  returning * into v_dispute;

  perform public._notify(
    case when auth.uid() = v_booking.client_id then v_booking.professional_id else v_booking.client_id end,
    'dispute', 'Disputa aberta',
    'Foi aberta uma disputa para um serviço. Motivo: ' || p_reason,
    jsonb_build_object('booking_id', p_booking_id, 'dispute_id', v_dispute.id)
  );

  return v_dispute;
exception
  when unique_violation then
    raise exception 'já existe uma disputa aberta para este serviço';
end;
$$;

-- Participante (ou admin) posta mensagem na disputa
create or replace function public.add_dispute_message(p_dispute_id uuid, p_body text)
returns public.dispute_messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dispute public.disputes;
  v_booking public.bookings;
  v_msg public.dispute_messages;
begin
  if auth.uid() is null then
    raise exception 'não autenticado';
  end if;
  if char_length(p_body) not between 2 and 2000 then
    raise exception 'mensagem entre 2 e 2000 caracteres';
  end if;

  select * into v_dispute from public.disputes where id = p_dispute_id;
  if v_dispute is null then
    raise exception 'disputa não encontrada';
  end if;
  select * into v_booking from public.bookings where id = v_dispute.booking_id;

  if auth.uid() <> v_booking.client_id and auth.uid() <> v_booking.professional_id
    and not public._is_admin() then
    raise exception 'apenas participantes ou administradores';
  end if;
  if v_dispute.status in ('resolved', 'rejected') then
    raise exception 'disputa encerrada não aceita novas mensagens';
  end if;

  insert into public.dispute_messages (dispute_id, author_id, body)
  values (p_dispute_id, auth.uid(), p_body)
  returning * into v_msg;

  perform public._notify(
    case when auth.uid() = v_booking.client_id then v_booking.professional_id else v_booking.client_id end,
    'dispute', 'Nova mensagem na disputa',
    'A disputa recebeu uma nova mensagem.',
    jsonb_build_object('booking_id', v_dispute.booking_id, 'dispute_id', p_dispute_id)
  );

  return v_msg;
end;
$$;

-- Participante (ou admin) anexa evidência (URL — R2 na M11)
create or replace function public.add_dispute_evidence(
  p_dispute_id uuid,
  p_kind text,
  p_url text
)
returns public.dispute_evidence
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dispute public.disputes;
  v_booking public.bookings;
  v_evidence public.dispute_evidence;
begin
  if auth.uid() is null then
    raise exception 'não autenticado';
  end if;
  if p_kind not in ('image', 'document', 'link') then
    raise exception 'tipo de evidência inválido';
  end if;
  if char_length(p_url) not between 5 and 2048 then
    raise exception 'URL inválida';
  end if;

  select * into v_dispute from public.disputes where id = p_dispute_id;
  if v_dispute is null then
    raise exception 'disputa não encontrada';
  end if;
  select * into v_booking from public.bookings where id = v_dispute.booking_id;

  if auth.uid() <> v_booking.client_id and auth.uid() <> v_booking.professional_id
    and not public._is_admin() then
    raise exception 'apenas participantes ou administradores';
  end if;
  if v_dispute.status in ('resolved', 'rejected') then
    raise exception 'disputa encerrada não aceita evidências';
  end if;

  insert into public.dispute_evidence (dispute_id, kind, url, added_by)
  values (p_dispute_id, p_kind, p_url, auth.uid())
  returning * into v_evidence;

  return v_evidence;
end;
$$;

-- Admin decide a disputa (M10 consome; guarda ativa agora)
create or replace function public.resolve_dispute(
  p_dispute_id uuid,
  p_status text,
  p_note text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dispute public.disputes;
  v_booking public.bookings;
begin
  if auth.uid() is null then
    raise exception 'não autenticado';
  end if;
  if not public._is_admin() then
    raise exception 'apenas administradores decidem disputas';
  end if;
  if p_status not in ('resolved', 'rejected') then
    raise exception 'decisão inválida';
  end if;
  if char_length(p_note) not between 3 and 1000 then
    raise exception 'nota de resolução entre 3 e 1000 caracteres';
  end if;

  select * into v_dispute from public.disputes where id = p_dispute_id;
  if v_dispute is null then
    raise exception 'disputa não encontrada';
  end if;
  select * into v_booking from public.bookings where id = v_dispute.booking_id;

  update public.disputes
  set status = p_status, resolution_note = p_note, resolved_by = auth.uid()
  where id = p_dispute_id;

  perform public._notify(
    v_booking.client_id, 'dispute',
    case when p_status = 'resolved' then 'Disputa resolvida' else 'Disputa indeferida' end,
    p_note,
    jsonb_build_object('booking_id', v_dispute.booking_id, 'dispute_id', p_dispute_id)
  );
  perform public._notify(
    v_booking.professional_id, 'dispute',
    case when p_status = 'resolved' then 'Disputa resolvida' else 'Disputa indeferida' end,
    p_note,
    jsonb_build_object('booking_id', v_dispute.booking_id, 'dispute_id', p_dispute_id)
  );
end;
$$;

-- ------------------------------------------------------------
-- Disputas — consultas
-- ------------------------------------------------------------
create or replace function public.list_my_disputes()
returns setof public.disputes
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'não autenticado';
  end if;
  return query
  select d.*
  from public.disputes d
  join public.bookings b on b.id = d.booking_id
  where b.client_id = auth.uid() or b.professional_id = auth.uid()
  order by d.created_at desc;
end;
$$;

create or replace function public.get_dispute(p_dispute_id uuid)
returns table (
  id uuid,
  booking_id uuid,
  opened_by uuid,
  reason text,
  description text,
  status text,
  resolution_note text,
  created_at timestamptz,
  updated_at timestamptz,
  service_title text,
  other_party_id uuid,
  other_party_name text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dispute public.disputes;
  v_booking public.bookings;
begin
  if auth.uid() is null then
    raise exception 'não autenticado';
  end if;

  select * into v_dispute from public.disputes where id = p_dispute_id;
  if v_dispute is null then
    raise exception 'disputa não encontrada';
  end if;
  select * into v_booking from public.bookings where id = v_dispute.booking_id;

  if auth.uid() <> v_booking.client_id and auth.uid() <> v_booking.professional_id
    and not public._is_admin() then
    raise exception 'acesso negado';
  end if;

  return query
  select
    v_dispute.id, v_dispute.booking_id, v_dispute.opened_by,
    v_dispute.reason, v_dispute.description, v_dispute.status,
    v_dispute.resolution_note, v_dispute.created_at, v_dispute.updated_at,
    s.title as service_title,
    case when auth.uid() = v_booking.client_id then v_booking.professional_id else v_booking.client_id end,
    case when auth.uid() = v_booking.client_id then p_pro.full_name else p_cli.full_name end
  from public.bookings b
  join public.services s on s.id = b.service_id
  join public.profiles p_cli on p_cli.id = b.client_id
  join public.profiles p_pro on p_pro.id = b.professional_id
  where b.id = v_dispute.booking_id;
end;
$$;

create or replace function public.list_dispute_messages(
  p_dispute_id uuid,
  p_limit integer default 100
)
returns setof public.dispute_messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dispute public.disputes;
  v_booking public.bookings;
begin
  if auth.uid() is null then
    raise exception 'não autenticado';
  end if;
  if p_limit not between 1 and 200 then
    raise exception 'limite inválido';
  end if;

  select * into v_dispute from public.disputes where id = p_dispute_id;
  if v_dispute is null then
    raise exception 'disputa não encontrada';
  end if;
  select * into v_booking from public.bookings where id = v_dispute.booking_id;

  if auth.uid() <> v_booking.client_id and auth.uid() <> v_booking.professional_id
    and not public._is_admin() then
    raise exception 'acesso negado';
  end if;

  return query
  select * from public.dispute_messages
  where dispute_id = p_dispute_id
  order by created_at asc
  limit p_limit;
end;
$$;

create or replace function public.list_dispute_evidence(p_dispute_id uuid)
returns setof public.dispute_evidence
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dispute public.disputes;
  v_booking public.bookings;
begin
  if auth.uid() is null then
    raise exception 'não autenticado';
  end if;

  select * into v_dispute from public.disputes where id = p_dispute_id;
  if v_dispute is null then
    raise exception 'disputa não encontrada';
  end if;
  select * into v_booking from public.bookings where id = v_dispute.booking_id;

  if auth.uid() <> v_booking.client_id and auth.uid() <> v_booking.professional_id
    and not public._is_admin() then
    raise exception 'acesso negado';
  end if;

  return query
  select * from public.dispute_evidence
  where dispute_id = p_dispute_id
  order by created_at asc;
end;
$$;

-- ------------------------------------------------------------
-- Grants (ADR-002: revoga tudo, concede só o necessário)
-- ------------------------------------------------------------
revoke all on function public.request_verification() from public;
revoke all on function public.set_verification_status(uuid, text) from public;
revoke all on function public.create_review(uuid, integer, text) from public;
revoke all on function public.respond_review(uuid, text) from public;
revoke all on function public.list_professional_reviews(uuid, integer, timestamptz) from public;
revoke all on function public.professional_rating_summary(uuid) from public;
revoke all on function public.professional_badges(uuid) from public;
revoke all on function public.list_my_reviews() from public;
revoke all on function public.open_dispute(uuid, text, text) from public;
revoke all on function public.add_dispute_message(uuid, text) from public;
revoke all on function public.add_dispute_evidence(uuid, text, text) from public;
revoke all on function public.resolve_dispute(uuid, text, text) from public;
revoke all on function public.list_my_disputes() from public;
revoke all on function public.get_dispute(uuid) from public;
revoke all on function public.list_dispute_messages(uuid, integer) from public;
revoke all on function public.list_dispute_evidence(uuid) from public;

grant execute on function public.request_verification() to authenticated;
grant execute on function public.set_verification_status(uuid, text) to authenticated;
grant execute on function public.create_review(uuid, integer, text) to authenticated;
grant execute on function public.respond_review(uuid, text) to authenticated;
grant execute on function public.list_professional_reviews(uuid, integer, timestamptz) to anon, authenticated;
grant execute on function public.professional_rating_summary(uuid) to anon, authenticated;
grant execute on function public.professional_badges(uuid) to anon, authenticated;
grant execute on function public.list_my_reviews() to authenticated;
grant execute on function public.open_dispute(uuid, text, text) to authenticated;
grant execute on function public.add_dispute_message(uuid, text) to authenticated;
grant execute on function public.add_dispute_evidence(uuid, text, text) to authenticated;
grant execute on function public.resolve_dispute(uuid, text, text) to authenticated;
grant execute on function public.list_my_disputes() to authenticated;
grant execute on function public.get_dispute(uuid) to authenticated;
grant execute on function public.list_dispute_messages(uuid, integer) to authenticated;
grant execute on function public.list_dispute_evidence(uuid) to authenticated;

-- ------------------------------------------------------------
-- Automação (spec §53): serviço concluído → lembrete de avaliação
-- ------------------------------------------------------------
create or replace function public.booking_completed_notify_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'completed' and old.status <> 'completed' then
    perform public._notify(
      new.client_id, 'review', 'Serviço concluído — como foi?',
      'Sua avaliação ajuda outros clientes a escolherem bem. Avalie agora.',
      jsonb_build_object('booking_id', new.id)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists booking_completed_notify_review_trigger on public.bookings;
create trigger booking_completed_notify_review_trigger
  after update on public.bookings
  for each row execute function public.booking_completed_notify_review();
