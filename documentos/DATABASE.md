# DATABASE — SERVICE

Fonte de verdade: **Supabase (PostgreSQL)**. Nenhum outro banco (spec §2, §67).

## Convenções (spec §2, §50)

Toda tabela crítica:

- `id uuid primary key default gen_random_uuid()`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz` quando aplicável
- Foreign keys, CHECK e UNIQUE constraints quando apropriado
- **RLS ligada** com políticas mínimas (ADR-002)
- Índices apenas para consultas reais (spec §51) — nunca indiscriminados

## Entidades principais (spec §50) — status de implementação (2026-08-13)

**Implementadas e testadas no banco real:** profiles · cities · service_categories ·
services · professional_availability · availability_exceptions · bookings ·
booking_events · payments · payment_events · webhook_events · wallets ·
wallet_transactions · commission_rules · cashback_rules · conversations ·
messages · conversation_participants · notifications · favorites · reviews ·
review_responses · disputes · dispute_messages · dispute_evidence

**Planejadas (próximos milestones):** subscriptions · referrals ·
referral_events · professional_gallery · admin_audit_logs · feature_flags ·
platform_settings · risk_events

Validação: `node scripts/sql-tests.mjs supabase/tests/*.sql` (73 testes verdes).

## Padrão Medallion (ADR-008)

- **Bronze** — `webhook_events` (provider, event_id, event_type, payload_hash
  SHA-256, received_at, processed_at, status, error, attempts) e eventos crus.
- **Silver** — camadas canônicas após validação/dedup.
- **Gold** — views de serving, `security_invoker = true`; o produto lê só Gold.

## Regras de escrita

- `wallet_transactions` é **append-only** (ADR-003): correções geram transação
  compensatória; nada é editado/excluído.
- Upsert **merge por completude**: nulo nunca sobrescreve dado preenchido;
  campos de estado são exceção declarada (ADR-007).
- **Double booking** garantido por constraint/índice exclusivo no banco, nunca
  "verificar depois inserir" (ADR-009).
- Paginação: cursor pagination quando apropriado em mensagens, bookings,
  notificações, avaliações, transações financeiras (spec §52).

## Migrations (spec §69, ADR-010)

- Versionadas em `supabase/migrations/` (Supabase CLI).
- Nunca destrutivas automaticamente: adicionar → migrar → validar → trocar
  código → remover legado depois.
- Mudanças estruturais passam por staging e revisão (spec §43).

## Catálogo canônico (ADR-014)

Cidade (código IBGE), Bairro, Categoria, Serviço como dimensões; resolução de
alias via tabela compartilhada `alias_canonico` com curadoria. Não-resolvido
fica pendente rotulado — nunca inferido.
