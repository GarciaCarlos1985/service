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
- [ ] Deploy validado na Vercel (aguarda redeploy com o build Nitro)
- [ ] Decisões de fundação: nome/domínio, regiões de lançamento

## M1 — Database + Auth + RLS

Auth (email/password, sessão) · profiles · services · service_categories ·
baseline de RLS (ADR-002) · testes de auth e RLS (spec §64) · catálogo
canônico de cidade IBGE (ADR-014)

## M2 — Cliente + Profissional + Serviços

Dashboards client/professional · cadastro de serviços · estados de UX
obrigatórios (spec §62)

## M3 — Busca + SEO + Perfil público

Busca PostgreSQL indexada + filtros (spec §30) · páginas públicas SSR
(categoria × cidade, profissional) · meta/OG/structured data · favoritos

## M4 — Agendamento + disponibilidade + double booking

`professional_availability` + exceções/folgas/feriados · máquina de estados de
booking (spec §14) · constraint de exclusividade no banco (ADR-009) · teste de
concorrência

## M5 — Pagamentos + Stripe abstraction

Contrato `PaymentProvider` + `MockProvider` (spec §73) · payments/payment_events
· Bronze de webhooks · `StripeProvider` sandbox · testes: webhook/pagamento/
refund duplicados

## M6 — Ledger + cashback + comissão

`wallet_transactions` append-only (ADR-003) · saldo derivado + reconciliação ·
idempotência financeira · cashback pós-conclusão · comissão configurável

## M7 — Chat + notificações

Chat por booking (RLS, paginação, unread, rate limit, denúncia, bloqueio) ·
notificações centralizadas (in-app; email/push preparados)

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
