-- ============================================================
-- SERVICE — Milestone 5 · Fundação de pagamentos
-- - payments + payment_events (identidade por chave do provider,
--   ADR-005; nunca guarda cartão — spec §8)
-- - webhook_events = camada Bronze (ADR-008): raw versionado,
--   idempotente por event_id, auditável (spec §10)
-- - idempotency_key obrigatória (spec §12, ADR-003)
-- ============================================================

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  idempotency_key text not null unique,
  provider text not null check (provider in ('mock', 'stripe', 'appmax')),
  provider_payment_id text,
  gross_cents integer not null check (gross_cents >= 0),
  platform_fee_cents integer not null default 0 check (platform_fee_cents >= 0),
  processor_fee_cents integer not null default 0 check (processor_fee_cents >= 0),
  professional_net_cents integer not null default 0 check (professional_net_cents >= 0),
  status text not null default 'pending'
    check (status in ('pending', 'requires_action', 'processing', 'succeeded', 'failed', 'refunded', 'cancelled')),
  confidence text not null default 'approximate'
    check (confidence in ('source', 'approximate')),
  payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_payment_id) where (provider_payment_id is not null)
);

comment on table public.payments is
  'Pagamentos. Nunca dados sensíveis de cartão (spec §8). Identidade: chave do provider quando existir (ADR-005).';

create index payments_booking_idx on public.payments (booking_id);
create index payments_idempotency_idx on public.payments (idempotency_key);

create table public.payment_events (
  id bigint generated always as identity primary key,
  payment_id uuid not null references public.payments (id) on delete cascade,
  event_type text not null,
  provider_event_id text,
  payload jsonb,
  created_at timestamptz not null default now(),
  unique (provider_event_id) where (provider_event_id is not null)
);

create index payment_events_payment_idx on public.payment_events (payment_id);

-- Bronze de webhooks (ADR-008): raw versionado, nunca editado depois
create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  event_type text not null,
  payload_hash text not null,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  status text not null default 'pending'
    check (status in ('pending', 'processed', 'failed', 'ignored')),
  error text,
  attempts integer not null default 0 check (attempts >= 0),
  unique (provider, event_id)
);

comment on table public.webhook_events is
  'Bronze de webhooks (ADR-008): idempotente por (provider, event_id) — o mesmo webhook 10x produz o mesmo resultado (spec §10).';

-- ------------------------------------------------------------
-- RLS: ninguém escreve via API; leitura apenas dos participantes
-- (fluxo financeiro via backend/service role — ADR-002)
-- ------------------------------------------------------------
alter table public.payments enable row level security;
alter table public.payment_events enable row level security;
alter table public.webhook_events enable row level security;

create policy "payments_select_participant" on public.payments
  for select to authenticated
  using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (b.client_id = auth.uid() or b.professional_id = auth.uid())
    )
  );

create policy "payment_events_select_participant" on public.payment_events
  for select to authenticated
  using (
    exists (
      select 1 from public.payments p
      join public.bookings b on b.id = p.booking_id
      where p.id = payment_id
        and (b.client_id = auth.uid() or b.professional_id = auth.uid())
    )
  );

-- webhook_events: somente leitura do backend (service role); nenhuma
-- policy para anon/authenticated — default deny (ADR-002).
