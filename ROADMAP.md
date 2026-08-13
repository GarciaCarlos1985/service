# ROADMAP — SERVICE

Milestones da spec §76. **Status atual: Milestone 0 em andamento.**

## M0 — Arquitetura + auditoria (ATUAL)

- [x] Auditoria do projeto (greenfield) — `documentos/AUDITORIA_2026-08-12.md`
- [x] Validação TanStack Start × Cloudflare Workers (ADR-034)
- [x] Scaffold: TanStack Start + React + TS strict + Vite + Tailwind + Query + Zod + RHF
- [x] Design system base (`src/modules/ui/` — 15 componentes)
- [x] Tooling Supabase (migrations) + `.env.example`
- [x] CI: typecheck · lint · test · build
- [x] Documentação base (ARCHITECTURE, SECURITY, DATABASE, PAYMENTS,
      DEPLOYMENT, SEO, ADMIN, DISASTER-RECOVERY)
- [x] Hospedagem atual: Vercel free + Supabase (ADR-036/037); repo GitHub
      `GarciaCarlos1985/service`
- [x] Deploy validado na Vercel (site no ar com M0–M7)
- [ ] Decisões de fundação: nome/domínio, regiões de lançamento

## M1 — Database + Auth + RLS

- [x] Migration init: profiles, cities, service_categories, services + RLS baseline (ADR-002)
- [x] Seed catálogo canônico: 11 cidades (IBGE) + 12 categorias (ADR-014)
- [x] Auth: entrar, cadastro, recuperar senha, onboarding (spec §49)
- [x] Suíte SQL de testes de RLS (spec §63/§64 itens 1-2)
- [x] Fix SSR dos portais (Toast/Modal)
- [x] **Aplicar migrations no Supabase** — ✅ aplicadas em 2026-08-13 (5 correções: `make_interval`→`ends_at` em índice; `unique` parcial→índice)
- [x] Rodar `supabase/tests/rls-security.sql` — ✅ automatizado: `node scripts/sql-tests.mjs` (15/15 verdes)

## M2 — Cliente + Profissional + Serviços

- [x] Onboarding com escolha de tipo de conta (RPC `choose_user_type`, RLS mantém bloqueio direto — spec §63)
- [x] Painel com navegação mobile-first (spec §25): Início, Serviços, Perfil
- [x] CRUD de serviços (criar, editar, pausar/ativar, excluir com confirmação)
- [x] Perfil editável (nome, telefone, cidade) com merge por completude (ADR-007)
- [x] Estados de UX obrigatórios (spec §62): loading/empty/error em todas as telas
- [ ] Dashboards completos (ganhos, avaliações, analytics) — M6/M8/M10

## M3 — Busca + SEO + Perfil público

- [x] Perfil público do profissional `/profissionais/<cidade>/<nome>` com SEO (title/meta/canonical/OG/JSON-LD LocalBusiness) — spec §20/§22/§23
- [x] Páginas categoria × cidade `/<categoria>/<cidade>` indexáveis (spec §21), só com conteúdo real (ADR-014)
- [x] Busca com filtros categoria + cidade (PostgreSQL, spec §30) + landing com categorias e cidades
- [x] Favoritos (spec §29) com RLS por dono
- [x] Contrato público reduzido (ADR-016): anon lê só colunas públicas de profissionais
- [x] Loaders resilientes (estado de erro honesto sem banco — ADR-018)
- [ ] Ranking (proximidade/avaliação/patrocinado) — fases 2/3 (spec §66)

## M4 — Agendamento + disponibilidade + double booking

- [x] Disponibilidade semanal + folgas/bloqueios por data (`professional_availability`, `availability_exceptions`)
- [x] Máquina de estados dos bookings (spec §14) com eventos auditados (`booking_events`) e guarda de transições no banco
- [x] **Double booking bloqueado pelo banco** (EXCLUDE USING gist — ADR-009) + RPC `create_booking` com validação completa
- [x] RPCs seguros de transição (confirmar/iniciar/concluir/cancelar — quem pode cada uma, spec §63)
- [x] RPC `available_slots` (horários livres sem expor dados de terceiros)
- [x] UI: seletor de dia/horário no perfil, agenda no painel (cliente e profissional), editor de disponibilidade
- [ ] Testes SQL de double booking (adição à suíte `supabase/tests/` junto com a aplicação das migrations)

## M5 — Pagamentos + Stripe abstraction

- [x] Contrato `PaymentProvider` + Registry (ADR-001) + `MockProvider` claramente separado (spec §73)
- [x] Migração: `payments`, `payment_events`, `webhook_events` (Bronze, ADR-008) com idempotency_key e `confianca_identidade` (ADR-005)
- [x] Testes do registry/mock (19 testes no total)
- [ ] `StripeProvider` (requer chaves Stripe Connect) — registro no registry quando existir
- [ ] Ledger + comissão (M6) sobre o mesmo contrato
- [ ] Fluxo booking → pagamento → confirmação (spec §15)

## M6 — Ledger + cashback + comissão

- [x] Ledger append-only (ADR-003): wallets + wallet_transactions **imutáveis por trigger** (vale até para postgres)
- [x] Saldo derivado do ledger (spec §11) via `get_wallet_balance`; nenhum saldo vem do frontend
- [x] Idempotência financeira (spec §12): `idempotency_key` única; booking processado 1x só
- [x] Comissão configurável (spec §6): `commission_rules` (categoria/prioridade/período, bps) — default 10%, admin na M10
- [x] Cashback pós-conclusão (spec §16): `cashback_rules` com teto mensal (5%, teto R$200/mês)
- [x] `process_booking_financials` idempotente disparado pelo `complete_booking` (spec §15 — nada de clique manual)
- [x] UI: `/painel/carteira` (saldo + histórico) e cartão de saldo no painel (ambos os papéis)
- [x] **Testes no banco real: 11/11** (valores, idempotência, imutabilidade, teto mensal) + RLS 15/15 sem regressão
- [ ] Saque/payout (profissional) e ajuste admin — M10
- [ ] Reconciliação periódica automatizada — Fase 2 (spec §66)

## M7 — Chat + notificações

- [x] Conversa única por booking (spec §27: nunca rede social); só participantes (testado: terceiro bloqueado)
- [x] Escrita 100% via RPC (ADR-002); rate limit 10 msg/min no banco; unread/read status
- [x] Realtime em mensagens e notificações (publicação supabase_realtime)
- [x] Notificações in-app centralizadas (spec §28) — eventos de negócio geram avisos (booking/cashback)
- [x] UI: lista de conversas, thread com realtime, sino com contadores, página de notificações
- [x] **Testes no banco real: 11/11** (participantes, rate limit, unread, isolamento)
- [ ] Email/push (canais preparados na arquitetura — ativar quando fizer sentido)

## M8 — Reviews + confiança + disputas

Reviews só de bookings concluídos reais (spec §33) · verificação de
profissionais + badges com regra objetiva · disputas com estados e evidências

## M9 — Premium + PRO + Referral

Planos com benefícios e expiração (automação) · referral com antifraude e
estados (pending/approved/rejected/review) · recompensa nunca só pelo cadastro

## M10 — Admin completo

Dashboard · usuários/profissionais · financeiro (sem edição direta de saldo) ·
auditoria · permissões por least privilege · preview/dry run/confirmação ·
kill switches · feature flags com rollout

## M11 — Cloudflare + R2 + performance + PWA

(Retorno ao Cloudflare conforme ADR-036/037 quando houver receita; R2 com
guardrails de custo — ADR-013.) R2 para mídia · otimização de imagens
(WebP/AVIF) · PWA (instalação, ícones, offline sem operações financeiras) ·
Core Web Vitals · logo: isolamento + variantes + otimização

## M12 — Security audit + load/perf + production readiness

Auditoria completa (spec §63) · load test · backups/DR exercitados · revisão
de cotas/custo · checklist spec §78

---

## Princípios de execução (spec §77, §78)

Antes de marcar cada milestone pronto: ler código existente → identificar
dependências → explicar alterações → implementar → typecheck → lint → test →
build → verificar regressões. Funcionalidade só pronta quando funciona, está
tipada, protegida, com estados de erro/loading, RLS quando aplicável, sem
duplicar dados, testada, build passa, sem secrets expostos e documentada.
