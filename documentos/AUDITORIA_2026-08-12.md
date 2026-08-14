# AUDITORIA 2026-08-12 — SERVICE (Milestone 0 — Auditoria + Plano)

> Primeira ação da [spec](SERVICE-PROMPT-INICIO.md) §80: auditoria do projeto
> atual e plano do Milestone 0. **Nenhuma mudança estrutural foi executada.**
> Aguardando autorização (spec §80 e §72).

---

## 1. Arquitetura atual

**Inexistente (greenfield).** O repositório não contém aplicação, backend, banco
ou infraestrutura. É um projeto vazio com:

| item | descrição |
|---|---|
| `public/service.png` | logo 1254×1254 PNG (fundo branco, 964 KB) |
| `./SERVICE-PROMPT-INICIO.md` | master build spec (fonte de verdade do produto) |
| `./DECISIONS.md` | registro de ADRs (adaptado 2026-08-12) |
| `PRODUCT.md` | contexto de produto (impeccable init, 2026-08-12) |
| `.claude/`, `.codex/`, `.cursor/`, `.grok/` | configs de harnesses de IA (instaladas pelo `impeccable install`) |

## 2. Tecnologias detectadas

Nenhuma de aplicação. A spec **define** a stack alvo: TanStack Start, React,
TypeScript strict, Vite, Tailwind CSS, TanStack Query, Zod, React Hook Form,
Supabase (PostgreSQL/Auth/RLS/Realtime/Storage), Cloudflare
(Pages/Workers/DNS/CDN/R2/Queues/Cron), Stripe Connect (via abstração
PaymentProvider).

## 3. Funcionalidades já existentes

Nenhuma. Todo o escopo (auth, perfis, serviços, busca, booking, pagamentos,
ledger, cashback, referral, chat, reviews, disputas, admin, SEO, PWA) está por
construir, nas fases do roadmap.

## 4. Banco atual

Nenhum. Nenhum projeto Supabase vinculado a este repositório.

## 5. Problemas encontrados (estado atual)

1. Logo `public/service.png` **não está isolada** (fundo branco, sem
   transparência) e é pesada (964 KB) para uso web — precisa recorte, versão
   SVG/otimizada e variantes (icone, apple-touch, favicon, PWA) num milestone
   de design. Não é bloqueante para o Milestone 0.
2. **Nenhuma ferramenta de projeto ainda** (package.json, lint, CI, migrations)
   — tudo a criar no Milestone 0.
3. Decisão de infraestrutura **não validada**: compatibilidade TanStack Start ×
   Cloudflare (ver item 11). É o único risco técnico pré-scaffold.

## 6. Riscos de segurança (migrados para o desenho, ainda não implementados)

- Chave anônima do Supabase exposta no frontend por design → toda exposição de
  dado pessoal ou escrita depende exclusivamente de RLS correto
  (decisão: ADR-002 — default deny, views `security_invoker`, sem escrita anônima).
- Isolamento de identidade (Cliente A × Cliente B, Profissional A × B, admin ×
  usuário) → ADR-002/016/019 + suíte de teste de intrusão (spec §63).
- Uploads: ownership de chave, MIME, tamanho, plano → spec §4 + ADR-013.
- LGPD: consentimento, minimização, exportação/exclusão → spec §48 + ADR-016.
- Logs com segredos → ADR-020.

## 7. Riscos financeiros

- Pagamentos reais via Stripe Connect: split de comissão, chargeback, disputa →
  ledger imutável e idempotência (ADR-003/005).
- Comissão configurável sem fixar em código → spec §6/§7 (admin + auditoria,
  ADR-019).
- Webhook duplicado/refund duplicado → ADR-005/008/012.
- Custo de infraestrutura: tier grátis é franquia, não teto → ADR-013/017
  (freio de gasto por código; uma conta Cloudflare por projeto).

## 8. Problemas de escalabilidade

Nenhum ainda (greenfield). O desenho já prevê: fases 1–3 da spec §66 (0–1.000,
1.000–10.000, 10.000–100.000+), índices planejados por consulta real (spec §51),
cursor pagination (spec §52), "Supabase ou Cloudflare resolve?" (spec §67).
Risco: introduzir complexidade cedo — mitigado por ADR-017.

## 9. Problemas de SEO

Nenhum código para auditar. O desenho obriga SSR/SSG indexável (TanStack Start,
spec §21), páginas só com conteúdo real, canonical/OG/structured data, URLs
amigáveis, catálogo canônico de cidade/categoria (ADR-014).

## 10. Problemas de performance

Nenhum código para auditar. Requisitos: Core Web Vitals excelentes (LCP/CLS/INP),
JS mínimo, code splitting, WebP/AVIF, CDN/cache, mobile-first (spec §24/§25).
Risco futuro: logo pesada e imagens originais — mitigado por otimização no
milestone de design.

## 11. Compatibilidade Cloudflare — o único bloqueio técnico pré-código

A spec (§3) exige **verificar a compatibilidade do TanStack Start com Cloudflare
antes de implementar**, e não usar APIs exclusivamente Node.js que impeçam deploy
edge.

**Situação em 2026-08-12:** o TanStack Start é baseado em Vite/Node SSR; existe
adapter de deploy para Cloudflare (`@tanstack/react-start` com adapter
`cloudflare-workers` — o ecossistema `vinxi`/`nitro` suporta deploy em
Workers/Pages). **A validação concreta (versão exata, limites do Worker, RPC com
PostgREST, streaming de streaming SSR no edge) é a primeira tarefa do
Milestone 0**, antes de qualquer scaffold. Se a validação reprovar em algum
ponto, o plano B já definido: **Pages estático (SSG) + Workers leves para API**,
que atende todos os requisitos da spec (SEO via SSG continua indexável; as
páginas dinâmicas por profissional/categoria podem ser geradas por build). Essa
alternativa segue o padrão validado no ADR adaptado do projeto de origem
(front estático + worker leve + processamento pesado sob demanda).

## 12. Dependências que podem gerar custo

| dependência | custo base | mitigação |
|---|---|---|
| Supabase | free tier com limites (DB, auth, storage, realtime) | monitorar cotas; plano pago só com receita |
| Cloudflare Pages/Workers/CDN | free tiers generosos | uma conta por projeto; worker leve (ADR-027/017 adaptados) |
| Cloudflare R2 | 10 GB/mês + operações classe A/B | franquia monitorada; guardrails de código (ADR-013) |
| Stripe | taxas por transação | só em produção real; mock em dev separado (spec §73) |
| Email transacional (ex.: Resend) | free tier limitado | começar com notificações in-app; email só quando necessário (spec §28) |
| Dados de cidades (IBGE) | gratuito | catálogo canônico (ADR-014) |

## 13. O que deve ser preservado

- `./SERVICE-PROMPT-INICIO.md` — fonte de verdade do produto.
- `./DECISIONS.md` — 20 ADRs adaptados ao domínio.
- `PRODUCT.md` — contexto de produto (impeccable).
- `public/service.png` — logo (com recorte/otimização futura, não descartar).
- Disciplina de processo da spec §0/§77/§78 (preservar, medir, validar,
  typecheck/lint/test/build antes de marcar pronto).

## 14. O que deve ser corrigido

1. Logo: isolar/recortar, otimizar (SVG + PNG responsivo), gerar variantes
   (favicon, PWA icons) — milestone de design, não bloqueia Milestone 0.
2. Nada mais existe para corrigir (greenfield). Os demais "corrigidos" são
   decisões de desenho já registradas nos ADRs.

## 15. Roadmap recomendado

Seguir os milestones 0–12 da spec §76, com os ADRs como contrato técnico de
cada etapa. Ordem recomendada mantém a da spec:

M0 arquitetura → M1 DB+Auth+RLS → M2 cliente/profissional/serviços → M3 busca+SEO+
perfil público → M4 agendamento+double booking → M5 pagamentos (abstração) →
M6 ledger+cashback+comissão → M7 chat+notificações → M8 reviews+confiança+
disputas → M9 Premium+PRO+referral → M10 admin → M11 Cloudflare+R2+perf+PWA →
M12 security+load+production readiness.

---

# PLANO DO MILESTONE 0 (Arquitetura + Auditoria)

**Estado:** proposta aguardando autorização (spec §80). Escopo de execução:
tudo abaixo, em ordem, com gate de qualidade ao final.

### M0.1 — Validar compatibilidade TanStack Start × Cloudflare
- Verificar versão atual do TanStack Start e adapter oficial para
  Cloudflare Workers/Pages; testar build + deploy de prova (hello world) no
  Cloudflare **antes** de qualquer scaffold de produto.
- Entregar: decisão registrada em ADR (approve ou plano B: SSG estático +
  Worker leve), com a evidência do teste.

### M0.2 — Scaffold do app (base da spec §1)
- TanStack Start + React + TypeScript **strict** + Vite + Tailwind CSS +
  TanStack Query + Zod + React Hook Form.
- Estrutura de pastas por domínio: `client/`, `professional/`, `admin/`,
  `booking/`, `payment/`, `wallet/`, `search/`, `chat/`, `ui/` (design system).
- Config: ESLint + Prettier + scripts `typecheck`, `lint`, `test`, `build`.
- Proibições TS: `any`/`as any`/`@ts-ignore`/`@ts-expect-error` sem justificativa
  documentada (spec §60) — via regra de lint.

### M0.3 — Design system base
- Componentes iniciais (spec §61): Button, Input, Select, Modal, Dialog, Toast,
  Card, Badge, Avatar, Skeleton, Table, Pagination, EmptyState, ErrorState,
  LoadingState — com tokens (cores verde → azul claro da logo, tipografia,
  espaçamento, radii) em Tailwind.

### M0.4 — Supabase: projeto de staging + baseline
- Criar projeto Supabase (staging), conectar via variáveis de ambiente.
- Tooling de migrations local (Supabase CLI) — sem migration destrutiva em
  produção (ADR-010).
- Baseline de RLS (ADR-002): default deny, sem escrita anônima, views com
  `security_invoker` quando nascerem.
- Tabelas do Milestone 1 (profiles, services, service_categories) só no M1 —
  **M0 não cria schema de produto**, apenas a infra de migração.

### M0.5 — CI (spec §77)
- GitHub Actions: typecheck + lint + test + build em todo PR; deploy de prova
  para Cloudflare (ou o que M0.1 validar).

### M0.6 — Documentação base (spec §70)
- ARCHITECTURE.md, SECURITY.md, DATABASE.md, PAYMENTS.md, DEPLOYMENT.md, SEO.md,
  ADMIN.md, DISASTER-RECOVERY.md, ROADMAP.md — iniciadas a partir dos ADRs e da
  spec, evoluindo por milestone.

### M0.7 — Decisões de fundação abertas (aguardando você)
1. **Nome/domínio final** (registrar na logo e em SEO quando houver).
2. **Regiões iniciais de lançamento** (sugerido: começar por 1–3 metrópoles —
   ex.: São Paulo capital, depois expansão Sul/capitais, conforme mercado-alvo).
3. **Contas**: Supabase e Cloudflare dedicadas ao SERVICE (uma conta por
   projeto, ADR-013/017).
4. **Ambiente dev vs produção**: chave de projeto Supabase separada por
   ambiente; variáveis por `wrangler secret put`/env vars, nunca no repo.

### Gate de saída do M0 (spec §78)
- Build passa · typecheck/lint/test passam · deploy de prova no Cloudflare
  funcionando · ADR da decisão Cloudflare registrado · docs base criadas ·
  nenhum secret no repositório.

---

**Próximo passo:** aguardando sua autorização para executar o M0.1–M0.6.
Nenhuma alteração estrutural foi feita (spec §80).

---

# RESULTADO DA EXECUÇÃO DO MILESTONE 0 (2026-08-12, autorizado)

| item | resultado |
|---|---|
| M0.1 Compatibilidade TanStack Start × Cloudflare | **Valido** — Cloudflare é Official Partner do TanStack Start (`@cloudflare/vite-plugin` + `nodejs_compat` + `wrangler deploy`). ADR-034. `wrangler deploy --dry-run` passa: Worker 201 KB + 868 KB assets |
| M0.2 Scaffold | TanStack Start 1.168 + React 19 + Vite 8 + TS 5.9 strict + Tailwind 4 + TanStack Query + Zod 4 + React Hook Form. Estrutura por domínio documentada (`src/modules/README.md`) |
| M0.3 Design system | 15 componentes em `src/modules/ui/` (Button, Input, Select, Modal, Dialog, Toast, Card, Badge, Avatar, Skeleton, Table, Pagination, EmptyState, ErrorState, LoadingState) com tokens da identidade verde → azul claro |
| M0.4 Supabase | CLI + `supabase/migrations/` com regras (ADR-010) + `src/lib/supabase.ts` + `.env.example`. Projeto real pendente de credenciais |
| M0.5 CI | `.github/workflows/ci.yml` — typecheck, lint, format, test, build em todo PR/push |
| M0.6 Docs | ARCHITECTURE, SECURITY, DATABASE, PAYMENTS, DEPLOYMENT, SEO, ADMIN, DISASTER-RECOVERY, ROADMAP |
| M0.7 Decisões | Pendentes: nome/domínio, regiões de lançamento, contas (Supabase/Cloudflare), credenciais |

**Gate de saída (spec §78):** build passa · typecheck/lint/test/format passam
(2 warnings de fast-refresh apenas em arquivos de rota — padrão TanStack) ·
deploy de prova validado via dry-run · ADRs 034/035 registrados · docs criadas ·
zero secrets no repositório.

**Smoke test:** `vite dev` + SSR — HTTP 200 com a landing no `localhost:3000`.

**Pendências para o M1:** criar projeto Supabase e linkar (credenciais do
usuário), deploy real no Cloudflare (conta + `wrangler login`), e as decisões
de fundação do M0.7.
