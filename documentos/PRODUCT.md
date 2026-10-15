# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

TanStack Start (React + Vite + Tailwind CSS) + TypeScript strict + TanStack Query + Zod + React Hook Form. Supabase (PostgreSQL, Auth, RLS, Realtime, Storage) como fonte de verdade. Deploy atual Vercel free (ADR-036/037); Cloudflare/R2 como infraestrutura-alvo futura. Busca em PostgreSQL (`tsvector` + `pg_trgm`) na Fase 1, preparada para evoluir. Sem integração de pagamento no MVP.

## Users

- **Consumidores**: pessoas de Cacoal – RO (mercado inicial) e região, majoritariamente no celular, que buscam **o que precisam** — um produto ou serviço — em comércios locais. Navegam grátis, favoritam, entram em contato (WhatsApp/orçamento), avaliam e comentam. CPF só é exigido em ação de contratação, nunca para navegar (LGPD).
- **Empresas**: comércios e prestadores locais cadastrados pela administração. São entidades próprias do sistema (não usuários). Planos FREE (presença básica) e PRO (assinatura: destaque rotulado, contato exposto, selo, mais mídia, analytics).
- **Admin/Operação**: o Helon. Cadastra e mantém empresas, categorias, produtos, serviços, mídia, avaliações, plano das empresas e métricas. Permissões por least privilege e auditoria.

## Product Purpose

Plataforma de **descoberta comercial local**: permite ao consumidor pensar "preciso de alguma coisa, vou procurar aqui para descobrir onde encontro em Cacoal" e encontrar empresas, produtos e serviços — inclusive por produto ("tinta emborrachada"), não só por nome de empresa. O valor entregue às empresas é descoberta, contato (lead) e visibilidade mensurável. Objetivo: fundação de produto real, segura, econômica e escalável — não uma demonstração visual.

## Positioning

Guia comercial local com **curadoria manual** (empresa inserida pelo admin, sem lixo) e **busca por produto**, diferente de diretórios nacionais e do Google Maps. Monetização por **assinatura de destaque (FREE/PRO)**, sem comissão e sem intermediação financeira no MVP. Destaques/patrocinados sempre identificados; reputação (avaliações) nunca manipulada para vender posição.

## Operating Context

- Mercado inicial confirmado: **Cacoal – Rondônia** (2026-10-06). Cidades/bairros por catálogo canônico (código IBGE) — nunca string livre (ADR-014).
- Público brasileiro; moeda BRL; LGPD aplicável (consentimento, minimização, exportação/exclusão).
- Mobile-first: touch friendly, dados reduzidos, skeletons, estados de UX obrigatórios.
- Sem pagamento no MVP: o dono fecha a mensalidade pessoalmente e o admin marca o plano da empresa manualmente, com auditoria (ADR-044).
- Nome do produto: **Service Guide** (confirmado). Nome de trabalho antigo "SERVICE" e provisório "Guia Cidade" aposentados.

## Capabilities and Constraints

Confirmado na spec Service Guide (`SERVICE-GUIDE-PROMPT-INICIO.md`):

- **Usuário**: cadastro gratuito (nome, telefone, e-mail, senha); pesquisar; ver empresas/produtos/serviços; favoritar; contatar; clicar no WhatsApp; avaliar; comentar. Sem CPF para navegar.
- **Empresa como entidade própria** (`companies`), independente de usuário, cadastrada pelo admin (ADR-042). Endereço estruturado; cidade por IBGE.
- **Produtos e serviços como entidades próprias** (`products`, `services`), ligados à empresa; mesmo produto em várias empresas (ADR-043).
- **Busca por produto/serviço/empresa/categoria** com filtros (categoria, localização, faixa de preço quando houver, plano, avaliação); PostgreSQL `tsvector` + `pg_trgm` na Fase 1, evolutiva.
- **Planos configuráveis** em dados (`plans`, `company_subscriptions`) — proibido `if plan === "pro"` (ADR-044). FREE x PRO com limites e recursos.
- **Contato**: WhatsApp (`wa.me`, mensagem pré-preenchida, evento `whatsapp_click` antes do redirect) + orçamento/conversa interna (`conversations`). **Clique/contato nunca é tratado como venda** (ADR-046).
- **Analytics event-sourced desde o nascimento** (`analytics_events`, append-only): search, company_view, product_view, service_view, favorite, contact_start, whatsapp_click, phone_click, website_click, review_created, share (ADR-045).
- **Favoritos** independentes de avaliação. **Avaliações** 1–5 com comentário + moderação admin (sem avaliação "verificada por compra" no MVP).
- **Painel administrativo**: cadastro/edição de empresa, categoria, produto, serviço, mídia, avaliações, usuários, contatos básicos, métricas básicas, plano da empresa (auditado).
- **Permissões hierárquicas preparadas** (admin → empresa → funcionário) via `company_members`, opcional no MVP (ADR-047).
- **SEO**: páginas públicas indexáveis reais (home, categorias, empresas `/empresas/<cidade>/<slug>`, produtos/serviços quando houver conteúdo); meta/canonical/OG/JSON-LD `LocalBusiness`; nunca gerar páginas vazias em massa.
- **Segurança/abuso**: auth, confirmação de telefone quando aplicável, RLS default deny, rotas admin protegidas, validação, rate limiting, anti-spam, bloqueio de usuário/empresa, auditoria de ações administrativas.
- **Performance/custo**: Core Web Vitals, code splitting, WebP/AVIF, CDN, cache; "Supabase ou Vercel já resolve?" antes de serviço externo (ADR-017).
- **Não construir agora**: checkout, pagamento, comissão, repasse, reembolso, agendamento completo, marketplace financeiro, antifraude avançado, recomendação por IA, painel do comerciante completo.
- Stack e não-stack vinculantes: TanStack Start/React/TS strict/Vite/Tailwind/Query/Zod/RHF + Supabase. Sem Next.js/Convex/Firebase.

## Brand Commitments

- **Nome do produto: Service Guide** (confirmado 2026-10-06).
- **Logo:** `public/service-guide.png` — nova composição horizontal fornecida pelo usuário; "Service" em azul, "Guide" em verde, pin e ícones de categorias. Usar esta versão no cabeçalho e rodapé.
- **Identidade:** azul + verde; visual moderno, confiável, limpo, amigável, profissional, mobile-first.
- **Direção visual aprovada pelo pedido de 15/10/2026:** amplificar a identidade em padrão premium, com escala generosa, fotografia comercial e selo **PREMIUM GUIDE** em dourado champanhe para destaques pagos, conforme ajuste solicitado na prévia. A exposição deriva do recurso `featured` do plano existente; a apresentação não altera preços, quotas, cobrança, autenticação nem reputação.
- **Pendências de asset** (fase futura): peso atual 1,8 MB → WebP/AVIF; variantes (favicon/ícone/horizontal); recorte com transparência. Evitar espalhar o nome comercial pelo código (usar `platform_settings`).

## Evidence on Hand

- Spec-mãe do Service Guide: `SERVICE-GUIDE-PROMPT-INICIO.md` (fonte da verdade de produto).
- Spec-mãe antiga (marketplace de profissionais): `SERVICE-PROMPT-INICIO.md` (superada, histórico).
- ADRs: `DECISIONS.md` — ADR-001 a ADR-040 (modelo antigo) + **ADR-041 a ADR-047 (virada Service Guide)**.
- Mapa de reaproveitamento: `REUSE-MAP.md`.
- Fundação técnica real herdada: Supabase/RLS, auth, design system, busca/SEO, favoritos, reviews, notificações, chat, mídia, admin parcial; 73 testes SQL verdes no banco real (RLS 15, ledger 11, chat 11, reviews 36).
- Logo `public/service-guide.png`. **Nenhum** usuário real, empresa, produto, avaliação ou testemunho. Seeds de desenvolvimento claramente identificados; nunca tratar dado fictício como real.

## Product Principles

1. **Descoberta honesta e verificável** — busca por produto, curadoria manual, analytics real. Destaque é rotulado; reputação não se compra (ADR-044/046).
2. **Empresa e produto são estruturas de primeira classe** — nunca tratados como texto ou como usuário; decisões que seriam caras de corrigir ficam certas desde o início (ADR-042/043).
3. **Escopo disciplinado** — construir agora só o que evita refazer a base; o resto entra como módulo em fase própria, com aval. MVP não é arquitetura descartável.
4. **Segurança e privacidade por construção** — RLS default deny, escrita via RPC/backend, minimização de dados, CPF só quando necessário (ADR-002/LGPD).
5. **Economia radical** — Supabase/Vercel first, custo próximo de zero no início, escalar com receita (ADR-017).
6. **Não inventar** — dado ausente fica ausente; decisão estrutural apresentada com problema/opções/recomendação/impacto/custo/risco e aguardando aval; gate de qualidade antes de marcar pronto.

## Accessibility & Inclusion

- Acessibilidade técnica exigida: semantic HTML, keyboard navigation, contraste, labels, aria quando necessário, foco visível, mensagens de erro acessíveis.
- Público brasileiro, mobile-first; estados de UX obrigatórios em toda tela (loading, success, empty, error, unauthorized, offline quando aplicável); LGPD (consentimento, minimização, exportação/exclusão).
