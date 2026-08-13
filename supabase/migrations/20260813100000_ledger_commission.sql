-- ============================================================
-- SERVICE — Milestone 6 · Ledger + cashback + comissão (ADR-003)
-- - wallets + wallet_transactions APPEND-ONLY (imutável por trigger)
-- - saldo SEMPRE derivado do ledger (spec §11) — nunca do frontend
-- - idempotência financeira (spec §12): idempotency_key única
-- - comissão configurável (spec §6) por regras (categoria/
--   profissional/plano/período) — sem fixar nada em código
-- - cashback pós-conclusão com teto mensal (spec §16)
-- - process_booking_financials: idempotente por booking
-- ============================================================

-- ------------------------------------------------------------
-- Wallets
-- ------------------------------------------------------------
create table public.wallets (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles (id) on delete cascade,
  is_platform boolean not null default false,
  created_at timestamptz not null default now(),
  check (is_platform = (profile_id is null))
);

comment on table public.wallets is
  'Carteiras. A carteira da plataforma é singleton (is_platform). Saldo nunca é armazenado aqui — é derivado do ledger (ADR-003).';

-- ------------------------------------------------------------
-- Ledger imutável (ADR-003)
-- ------------------------------------------------------------
create table public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references public.wallets (id) on delete cascade,
  type text not null
    check (type in ('credit', 'debit', 'cashback', 'refund', 'adjustment', 'platform_fee', 'payout')),
  amount_cents integer not null check (amount_cents <> 0),
  balance_after_cents integer not null,
  idempotency_key text not null unique,
  reference_type text,
  reference_id uuid,
  description text,
  created_at timestamptz not null default now()
);

comment on table public.wallet_transactions is
  'Ledger append-only. NUNCA editado ou excluído (trigger abaixo): correções geram transação compensatória (ADR-003).';

create index wallet_transactions_wallet_idx
  on public.wallet_transactions (wallet_id, created_at desc);
create index wallet_transactions_reference_idx
  on public.wallet_transactions (reference_type, reference_id);

-- Imutabilidade real (vale até para postgres — ADR-003)
create or replace function public.wallet_transactions_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'ledger é append-only: transações financeiras não podem ser editadas nem excluídas (ADR-003)';
end;
$$;

drop trigger if exists wallet_transactions_immutable on public.wallet_transactions;
create trigger wallet_transactions_immutable
  before update or delete on public.wallet_transactions
  for each row execute function public.wallet_transactions_guard();

-- ------------------------------------------------------------
-- Regras de comissão (spec §6: configurável sem código)
-- ------------------------------------------------------------
create table public.commission_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  category_id bigint references public.service_categories (id) on delete cascade,
  professional_id uuid references public.profiles (id) on delete cascade,
  percent_bps integer not null check (percent_bps between 0 and 10000),
  priority integer not null default 0,
  is_active boolean not null default true,
  valid_from timestamptz,
  valid_to timestamptz,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valid_to is null or valid_from is null or valid_to > valid_from)
);

comment on table public.commission_rules is
  'Comissão configurável por categoria/profissional/plano/período (spec §6). A regra mais específica ativa vence.';

-- ------------------------------------------------------------
-- Regras de cashback (spec §16)
-- ------------------------------------------------------------
create table public.cashback_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  percent_bps integer not null check (percent_bps between 0 and 10000),
  monthly_cap_cents integer check (monthly_cap_cents is null or monthly_cap_cents >= 0),
  min_booking_cents integer check (min_booking_cents is null or min_booking_cents >= 0),
  priority integer not null default 0,
  is_active boolean not null default true,
  valid_from timestamptz,
  valid_to timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valid_to is null or valid_from is null or valid_to > valid_from)
);

comment on table public.cashback_rules is
  'Cashback: percentual, teto mensal, mínimo por booking, campanhas (spec §16). Idempotente e auditável via ledger.';

-- ------------------------------------------------------------
-- RLS — leitura só do dono; escrita SOMENTE via RPC/backend
-- ------------------------------------------------------------
alter table public.wallets enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.commission_rules enable row level security;
alter table public.cashback_rules enable row level security;

create policy "wallets_select_own" on public.wallets
  for select to authenticated
  using (profile_id = auth.uid());

create policy "wallet_transactions_select_own" on public.wallet_transactions
  for select to authenticated
  using (
    exists (
      select 1 from public.wallets w
      where w.id = wallet_id and w.profile_id = auth.uid()
    )
  );

-- commission_rules e cashback_rules: SEM policies — apenas service_role/RPC
-- (admin na M10; default deny — ADR-002)

-- ------------------------------------------------------------
-- Helpers internos (não expostos)
-- ------------------------------------------------------------
create or replace function public._get_or_create_wallet(p_profile_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_wallet uuid;
begin
  select id into v_wallet from public.wallets where profile_id = p_profile_id;
  if v_wallet is null then
    insert into public.wallets (profile_id) values (p_profile_id) returning id into v_wallet;
  end if;
  return v_wallet;
end;
$$;

create or replace function public._get_platform_wallet()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_wallet uuid;
begin
  select id into v_wallet from public.wallets where is_platform limit 1;
  if v_wallet is null then
    insert into public.wallets (is_platform) values (true) returning id into v_wallet;
  end if;
  return v_wallet;
end;
$$;

-- Crédito no ledger com saldo derivado + idempotência
create or replace function public._ledger_credit(
  p_wallet_id uuid,
  p_type text,
  p_amount_cents integer,
  p_idempotency_key text,
  p_reference_type text,
  p_reference_id uuid,
  p_description text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_prev bigint;
  v_id uuid;
begin
  select coalesce(max(balance_after_cents), 0) into v_prev
  from public.wallet_transactions
  where wallet_id = p_wallet_id;

  begin
    insert into public.wallet_transactions (
      wallet_id, type, amount_cents, balance_after_cents,
      idempotency_key, reference_type, reference_id, description
    ) values (
      p_wallet_id, p_type, p_amount_cents, v_prev + p_amount_cents,
      p_idempotency_key, p_reference_type, p_reference_id, p_description
    )
    returning id into v_id;
    return v_id;
  exception
    when unique_violation then
      raise exception 'operação financeira duplicada (idempotency_key já usada) — spec §12';
  end;
end;
$$;

-- ------------------------------------------------------------
-- Resolução de comissão (regra ativa mais específica vence)
-- ------------------------------------------------------------
create or replace function public.resolve_commission(
  p_category_id bigint,
  p_amount_cents integer
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rule public.commission_rules;
  v_pct integer := 1000; -- default 10% (spec §6: 5% a 15%)
begin
  select * into v_rule
  from public.commission_rules
  where is_active
    and (valid_from is null or valid_from <= now())
    and (valid_to is null or valid_to >= now())
    and (category_id is null or category_id = p_category_id)
  order by priority desc, category_id nulls last
  limit 1;

  if v_rule is not null then
    v_pct := v_rule.percent_bps;
  end if;

  return floor(p_amount_cents * v_pct / 10000.0);
end;
$$;

revoke all on function public.resolve_commission(bigint, integer) from public;
grant execute on function public.resolve_commission(bigint, integer) to authenticated;

-- ------------------------------------------------------------
-- Resolução de cashback (com teto mensal — spec §16)
-- ------------------------------------------------------------
create or replace function public._resolve_cashback(
  p_client_id uuid,
  p_amount_cents integer
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rule public.cashback_rules;
  v_calc integer;
  v_monthly integer;
  v_cap integer;
begin
  select * into v_rule
  from public.cashback_rules
  where is_active
    and (valid_from is null or valid_from <= now())
    and (valid_to is null or valid_to >= now())
    and (min_booking_cents is null or p_amount_cents >= min_booking_cents)
  order by priority desc, monthly_cap_cents nulls last
  limit 1;

  if v_rule is null then
    return 0;
  end if;

  v_calc := floor(p_amount_cents * v_rule.percent_bps / 10000.0);
  if v_calc <= 0 then
    return 0;
  end if;

  -- teto mensal do cliente
  v_cap := coalesce(v_rule.monthly_cap_cents, 0);
  if v_cap > 0 then
    select coalesce(sum(t.amount_cents), 0) into v_monthly
    from public.wallet_transactions t
    join public.wallets w on w.id = t.wallet_id
    where w.profile_id = p_client_id
      and t.type = 'cashback'
      and t.created_at >= date_trunc('month', now());
    if v_monthly + v_calc > v_cap then
      return greatest(v_cap - v_monthly, 0);
    end if;
  end if;

  return v_calc;
end;
$$;

-- ------------------------------------------------------------
-- Processamento financeiro do booking (spec §15)
-- Idempotente por booking; disparado pelo complete_booking.
-- ------------------------------------------------------------
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
  -- trava a linha do booking: serializa o processamento financeiro
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

  -- idempotência: booking já processado não gera dinheiro de novo (spec §12)
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

  -- repasse ao profissional (líquido)
  perform public._ledger_credit(
    v_pro_wallet, 'credit', v_net,
    'booking_completion_pro_' || p_booking_id::text,
    'booking_completion', p_booking_id,
    'Serviço concluído — líquido após comissão de ' || (v_commission * 100 / nullif(v_gross, 0))::text || '%'
  );

  -- comissão da plataforma
  perform public._ledger_credit(
    v_platform_wallet, 'platform_fee', v_commission,
    'booking_completion_fee_' || p_booking_id::text,
    'booking_completion', p_booking_id,
    'Comissão do serviço'
  );

  -- cashback do cliente (quando aplicável)
  if v_cashback > 0 then
    perform public._ledger_credit(
      v_client_wallet, 'cashback', v_cashback,
      'booking_completion_cb_' || p_booking_id::text,
      'booking_completion', p_booking_id,
      'Cashback do serviço concluído'
    );
  end if;
end;
$$;

revoke all on function public.process_booking_financials(uuid) from public;
-- sem grant: chamado apenas internamente pelo complete_booking (spec §15:
-- nenhuma etapa financeira depende de clique visual além do fluxo definido)

-- ------------------------------------------------------------
-- complete_booking passa a disparar a liberação financeira
-- ------------------------------------------------------------
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
  perform public.process_booking_financials(p_booking_id);
end;
$$;

revoke all on function public.complete_booking(uuid) from public;
grant execute on function public.complete_booking(uuid) to authenticated;

-- ------------------------------------------------------------
-- Consultas do dono da carteira
-- ------------------------------------------------------------
create or replace function public.get_wallet_balance()
returns table (wallet_id uuid, balance_cents bigint)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'não autenticado';
  end if;

  return query
  select w.id, coalesce(sum(t.amount_cents), 0) as balance_cents
  from public.wallets w
  left join public.wallet_transactions t on t.wallet_id = w.id
  where w.profile_id = auth.uid()
  group by w.id;
end;
$$;

revoke all on function public.get_wallet_balance() from public;
grant execute on function public.get_wallet_balance() to authenticated;

create or replace function public.get_my_transactions(p_limit integer default 50)
returns setof public.wallet_transactions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_wallet uuid;
begin
  if auth.uid() is null then
    raise exception 'não autenticado';
  end if;
  if p_limit not between 1 and 200 then
    raise exception 'limite inválido';
  end if;

  select id into v_wallet from public.wallets where profile_id = auth.uid();
  if v_wallet is null then
    return;
  end if;

  return query
  select * from public.wallet_transactions
  where wallet_id = v_wallet
  order by created_at desc
  limit p_limit;
end;
$$;

revoke all on function public.get_my_transactions(integer) from public;
grant execute on function public.get_my_transactions(integer) to authenticated;

-- ------------------------------------------------------------
-- Seed: regras padrão (configuráveis pelo admin na M10)
-- ------------------------------------------------------------
insert into public.commission_rules (name, percent_bps, priority)
values ('Comissão padrão', 1000, 0)
on conflict do nothing;

insert into public.cashback_rules (name, percent_bps, monthly_cap_cents, priority)
values ('Cashback padrão', 500, 20000, 0)
on conflict do nothing;
