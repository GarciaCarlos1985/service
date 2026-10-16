# ARCHITECTURE — SERVICE GUIDE

Plataforma de descoberta comercial local. Fonte de verdade de produto:
`./SERVICE-GUIDE-PROMPT-INICIO.md`. Decisões técnicas: `./DECISIONS.md`.
Os módulos do marketplace legado permanecem separados, sem expansão financeira.

## Stack (spec §1)

- **TanStack Start** (React 19, Vite 8) — SSR/SSG full-stack com server functions
- **TypeScript strict** — `any`/`as any`/`@ts-ignore` proibidos sem justificativa (spec §60)
- **Tailwind CSS v4** — design system com tokens da identidade verde → azul claro
- **TanStack Query** — estado de dados no cliente
- **Zod** — validação de schemas (compartilhados entre cliente e servidor)
- **React Hook Form** — formulários
- **Supabase** — fonte de verdade: PostgreSQL, Auth, RLS, Realtime, Storage
- **Cloudflare** — Workers (SSR + assets); R2/Queues/Cron não são necessários neste deploy
- **Stripe Connect** — abstração legada `PaymentProvider`, sem gateway no MVP

## Camadas (ADR-001)

```
Navegador (TanStack Start client)
   ↓ server functions / routes
Validação (Zod) → Regra de negócio (domínio) → Persistência
   ↓ adapters registrados (registry, 1 classe + 1 linha)
PaymentProvider · NotificationProvider · StorageProvider
   ↓
Supabase (PostgreSQL + RLS) · Cloudflare R2 · Stripe
```

Regra de negócio **nunca** depende de detalhe de provider (ADR-001).

## Dados: padrão Medallion (ADR-008)

- **Bronze:** `webhook_events` e eventos crus (raw versionado, payload_hash SHA-256)
- **Silver:** camadas canônicas (payments, wallet_transactions, bookings) com dedup
- **Gold:** views de serving com `security_invoker = true` — o produto lê só a Gold

## Estrutura de pastas

```
src/
  routes/          # rotas TanStack (file-based, SSR indexável)
  modules/
    ui/            # design system (ativo no M0)
    auth/ booking/ payment/ wallet/ search/ chat/ review/
    referral/ admin/ client/ professional/   # nascem com cada milestone (ADR-017)
  lib/             # clientes externos (supabase, providers)
  utils/           # utilitários puros (cn, seo, formatadores)
  queryClient.ts   # TanStack Query
  router.tsx       # TanStack Router
supabase/
  migrations/      # SQL versionado (ADR-010)
```

## Deploy (ADR-049 — Cloudflare Workers)

- **App:** TanStack Start com `@cloudflare/vite-plugin`, runtime Workers,
  `nodejs_compat` e assets estáticos. Publicação por Wrangler.
- **Backend:** Supabase preservado; nenhuma cópia em D1 e nenhuma migração SQL
  implícita no deploy. Fundação comercial aplicada e testada no banco real
  por autorização posterior (ADR-050); catálogo aguardando conteúdo real.
- **Ambientes:** desenvolvimento e preview de produção locais; Worker
  `service-guide` como destino publicado. Staging remoto não foi provisionado.
- **Histórico:** Vercel/Nitro (ADR-037) substituído por autorização do usuário
  em 16/10/2026. Uma conta Cloudflare por projeto (ADR-013).

## Economia (spec §5, §67, ADR-017)

"Supabase ou Cloudflare já resolve isso?" antes de qualquer serviço externo.
Tier grátis é franquia, não teto → guardrails de custo no código (ADR-013) e
monitoramento de cota.
