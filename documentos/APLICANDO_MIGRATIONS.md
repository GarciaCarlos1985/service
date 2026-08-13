# APLICANDO MIGRATIONS NO SUPABASE

> **Status: MIGRATIONS APLICADAS (2026-08-13).** Este documento virou o
> registro de como aplicar as próximas migrations — o procedimento não muda.

## Comandos (CLI logado — token em `~/.supabase/`)

```bash
npx supabase link --project-ref taabjnmsaaltsiehywbw   # pede a senha do banco (1x)
npx supabase db push                                    # aplica migrations pendentes
```

## Teste obrigatório de toda migration nova (ADR-039)

Depois de aplicar, rode as suítes contra o banco real (usam `DATABASE_URL` do
`.env.local` — conexão direta, nunca imprime a senha):

```bash
node scripts/sql-tests.mjs supabase/tests/rls-security.sql   # RLS — 15 testes
node scripts/sql-tests.mjs supabase/tests/ledger-tests.sql   # ledger — 11 testes
node scripts/sql-tests.mjs supabase/tests/chat-tests.sql     # chat+notif — 11 testes
```

Esperado em todas: `TODOS OS TESTES PASSARAM!` e o banco limpo ao final.

## O que está no banco (aplicado em 2026-08-13)

- `profiles` (1:1 auth.users, trigger automático, `user_type` client|professional —
  **não alterável pelo próprio usuário**; RPC `choose_user_type` para o onboarding)
- `cities` (catálogo canônico IBGE, ADR-014) + seed de 11 cidades
- `service_categories` + seed de 12 categorias
- `services` (oferta do profissional, escrita só do dono)
- `professional_availability` + `availability_exceptions` (disponibilidade)
- `bookings` + `booking_events` — máquina de estados (spec §14) e
  **double booking garantido por EXCLUDE USING gist** (ADR-009); transições só
  por RPC (confirmar/iniciar/concluir/cancelar)
- `payments`, `payment_events`, `webhook_events` (Bronze, ADR-008)
- `wallets`, `wallet_transactions` (**append-only**, trigger bloqueia
  UPDATE/DELETE até para postgres), `commission_rules`, `cashback_rules`
- `conversations`, `messages`, `conversation_participants` (chat por booking)
- `notifications` (in-app centralizada)

Regras: RLS `default deny` em tudo (ADR-002); escrita de cliente **sempre via
RPC SECURITY DEFINER**; catálogos públicos só para leitura; coluna `phone` com
grant por coluna (anon não acessa — ADR-016).
