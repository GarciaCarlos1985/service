# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

TanStack Start (React + Vite + Tailwind CSS) + TypeScript strict + TanStack Query + Zod + React Hook Form. Supabase (PostgreSQL, Auth, RLS, Realtime, Storage) como fonte de verdade. Cloudflare Pages/Workers/DNS/CDN/R2 como infraestrutura-alvo. Camada de abstração de pagamentos `PaymentProvider` (Stripe Connect como provider principal; Appmax futuro). Stack confirmada pelo usuário na entrevista (React + Vite), detalhada na spec.

## Users

- **Clientes**: consumidores brasileiros, majoritariamente no celular, buscando profissionais locais de confiança (diarista, faxina, limpeza pós-obra, pintura, reparos, eletricista, encanador, chaveiro, montagem, manutenção, jardinagem) para agendar, pagar e avaliar o serviço.
- **Profissionais**: prestadores de serviço locais que criam perfil público, definem disponibilidade, recebem clientes, constroem reputação e recebem pagamentos pela plataforma.
- **Admin/Operação**: central operacional com painel poderoso, permissões por least privilege e auditoria.

## Product Purpose

Marketplace brasileiro de serviços locais que conecta clientes a profissionais confiáveis, intermediando agendamento, pagamento e reputação. Objetivo: fundação de produto real, segura, econômica e escalável para milhares de usuários — não uma demonstração visual.

## Positioning

Intermediador de serviços locais com segurança e integridade financeira como diferencial: pagamento processado pela plataforma (cliente paga → SERVICE retém comissão configurável → repasse ao profissional), ledger imutável, idempotência financeira, proteção contra double booking no banco, verificação de profissionais e avaliações apenas de compras reais concluídas.

## Operating Context

- Público brasileiro; moeda BRL; LGPD aplicável (consentimento, privacidade, exportação/exclusão de dados).
- Mobile-first: touch friendly, bottom navigation, dados reduzidos, skeletons.
- **Mercado-alvo (confirmado 2026-08-12):** São Paulo, região Sul e as grandes metrópoles/capitais do Brasil com economias mais fortes. Fundador/operação baseada em Rondônia. Geografia por cidade/bairro/CEP; geolocalização apenas na precisão necessária. Cidades e bairros devem usar catálogo canônico (código IBGE) — nunca strings livres.
- Desenvolvimento: auth sem confirmação de email no início; arquitetura preparada para ativá-la em produção.
- Pagamento mock durante desenvolvimento deve ser claramente separado de produção (nunca misturar; nunca "fake" que pareça real).

## Capabilities and Constraints

Confirmado na spec (master build spec):

- Autenticação (email/password, recuperação de senha, sessão segura), perfis, serviços, categorias, busca por categoria/cidade/bairro/preço/nota/disponibilidade/favoritos.
- Agendamento com disponibilidade, exceções, folgas, bloqueios; double booking garantido no banco; máquina de estados de booking validada no backend (pending → confirmed → in_progress → completed; cancelamentos). **Implementado (M4) e testado no banco real.**
- Fluxo financeiro: pagamento iniciado/confirmado → serviço concluído → avaliação → liberação conforme regra → comissão → repasse → cashback. Nenhuma etapa financeira depende de clique visual. **Core implementado (M6):** `complete_booking` dispara `process_booking_financials` (idempotente).
- Ledger imutável (`wallet_transactions`): credit, debit, cashback, refund, adjustment, platform_fee, payout; saldo derivado ou projeção reconciliável; correções via transação compensatória. **Implementado (M6)** com trigger que bloqueia UPDATE/DELETE até para postgres.
- Idempotency key obrigatória: pagamento, refund, cashback, indicação, payout, ajustes administrativos. **Implementado (M6)** via `idempotency_key` única.
- Cashback e referral com regras configuráveis, tetos, estados (pending/approved/rejected/review), antifraude; recompensa nunca liberada só pelo cadastro. **Cashback implementado (M6)** — percentual configurável + teto mensal; referral fica para M9.
- Chat ligado a booking/cliente/profissional, com paginação, unread, rate limiting, denúncia, bloqueio (não é rede social). Supabase Realtime. **Implementado (M7)** — conversa única por booking, RLS por participação, 10 msg/min, unread/read status, realtime.
- Notificações centralizadas (booking, payment, payout, cashback, review, referral, system, dispute, security) com arquitetura para in-app/email/push. **In-app implementado (M7)**; email/push na arquitetura.
- Reviews apenas de clientes reais do booking concluído; proteção contra duplicadas/falsas/autoavaliação; profissional pode responder.
- Disputas (open/under_review/resolved/rejected), com evidências e decisão administrativa.
- Admin: dashboard, usuários, profissionais, financeiro (sem edição direta de saldo), auditoria (`admin_audit_logs`), permissões por least privilege (super_admin, support, moderator, finance, operations, marketing, analyst), preview/dry run/confirmation/audit/rollback honesto, kill switches, feature flags com rollout gradual.
- SEO: páginas públicas indexáveis reais (categorias, cidades, bairros, profissionais, serviços), meta tags, canonical, Open Graph, structured data (schema.org), URLs amigáveis (`/profissionais/guaruja/maria-silva`); nunca gerar páginas vazias em massa.
- Performance: Core Web Vitals excelentes, HTML rápido, JS mínimo, code splitting, WebP/AVIF, CDN, cache; rate limiting em login/cadastro/chat/busca/booking/pagamento/referral/avaliação/upload/admin.
- Custo: quase zero no início (Supabase/Cloudflare free tiers com limites monitorados), sem Redis/Elasticsearch/VPS prematuros; "Supabase ou Cloudflare já resolve isso?" antes de qualquer serviço externo.
- Deploy: development/staging/production; migrations nunca destrutivas automaticamente em produção; backups/DR com RPO/RTO documentados.
- Banco: UUID, created_at/updated_at, índices apropriados, FKs, constraints, CHECK/UNIQUE, RLS em todas as tabelas críticas; entidades principais listadas na spec (seção 50); cursor pagination em mensagens/bookings/notificações/avaliações/transações.
- Stack e não-stack são vinculantes: TanStack Start, React, TS strict, Vite, Tailwind, TanStack Query, Zod, React Hook Form; NÃO usar Next.js, Convex, Firebase, nem outro banco/backend proprietário como fonte de verdade.

Decisões em aberto (não confirmadas, registrar conforme surgir): nome legal/marca final (nome de trabalho: SERVICE), design final além da identidade verde → azul claro, percentuais exatos de comissão, regiões atendidas iniciais.

## Brand Commitments

- Nome de trabalho: **SERVICE** — marketplace de serviços locais.
- Identidade: **verde → azul claro** (gradiente); visual moderno, confiável, limpo, amigável, profissional.
- **Logo (asset inicial):** `public/service.png` (1254×1254, PNG, fundo branco, sem transparência — ainda não isolada). Paleta medida: azuis `#3580FD`–`#5697FB`, verde claro `#C0E9CF`, fundo branco. Precisa de isolamento/recorte, versões SVG e otimização (964 KB hoje) em trabalho futuro.
- Mobile-first, cards arredondados, microinterações discretas; não sacrificar performance por animações.

## Evidence on Hand

- Master build spec: `documentos/SERVICE-PROMPT-INICIO.md` (fonte da verdade de produto; arquitetura, segurança, monetização, SEO, escalabilidade, milestones 0–12).
- ADRs: `documentos/DECISIONS.md` (ADR-001 a ADR-039, adaptados/registrados até 2026-08-13).
- Validação técnica real: **37 testes SQL aprovados no banco real** (`supabase/tests/`: rls 15, ledger 11, chat 11 — rodar via `node scripts/sql-tests.mjs <arquivo>`).
- Site publicado em produção (Vercel) com fundação M0–M7.
- Nenhum usuário real, dado, avaliação, testemunho ou asset além da logo. Seeds de desenvolvimento são claramente identificados; nunca tratar dados fictícios como reais.

## Product Principles

1. **Segurança e integridade financeira primeiro** — RLS no banco, nunca confiar na interface; ledger imutável, idempotência e auditoria; nenhuma etapa financeira dependente de clique visual.
2. **Economia radical sem sacrificar segurança** — Supabase/Cloudflare first, serverless, cache, custo próximo de zero no início com limites monitorados; escalar gradualmente conforme a receita.
3. **Confiança construída com regras objetivas** — verificação, badges com critério, avaliações só de compras reais, patrocinados identificados, disputas justas; nunca manipular reputação para vender destaque.
4. **Escala progressiva** — simplicidade primeiro (Fase 1); introduzir complexidade (fila, search engine, caching avançado) apenas com necessidade real comprovada.
5. **Não inventar** — decisões ambíguas apresentadas com problema/opções/recomendação/impacto/custo/risco e aguardar autorização para mudanças estruturais; milestones com typecheck, lint, testes e build antes de marcar pronto.

## Accessibility & Inclusion

- Acessibilidade técnica exigida: semantic HTML, keyboard navigation, contraste, labels, aria quando necessário, foco visível, mensagens de erro acessíveis.
- Público brasileiro, mobile-first; estados de UX obrigatórios em toda tela (loading, success, empty, error, unauthorized, offline quando aplicável); LGPD (consentimento, minimização, exportação/exclusão).
