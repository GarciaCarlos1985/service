# ARCHITECTURE — SERVICE

Marketplace brasileiro de serviços locais. Fonte de verdade de produto:
`documentos/SERVICE-PROMPT-INICIO.md`. Decisões técnicas: `documentos/DECISIONS.md` (ADR-001+).

## Stack (spec §1)

- **TanStack Start** (React 19, Vite 8) — SSR/SSG full-stack com server functions
- **TypeScript strict** — `any`/`as any`/`@ts-ignore` proibidos sem justificativa (spec §60)
- **Tailwind CSS v4** — design system com tokens da identidade verde → azul claro
- **TanStack Query** — estado de dados no cliente
- **Zod** — validação de schemas (compartilhados entre cliente e servidor)
- **React Hook Form** — formulários
- **Supabase** — fonte de verdade: PostgreSQL, Auth, RLS, Realtime, Storage
- **Cloudflare** — Workers (app), DNS/CDN/cache, R2 (mídia), Queues/Cron (automações)
- **Stripe Connect** — pagamentos via abstração `PaymentProvider`

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

## Deploy (ADR-036/037 — Vercel free por enquanto; ADR-034 como plano de retorno)

- **Atual:** app (SSR + assets) na **Vercel (plano grátis)** via Nitro
  (`nitro/vite`, preset `vercel`) — caminho oficial do TanStack Start para
  Vercel; banco em Supabase. Decisão econômica enquanto o site não vende
  (ADR-036/037).
- **Plano de retorno:** Cloudflare Workers (`@cloudflare/vite-plugin` +
  `wrangler deploy`, `nodejs_compat`) — validado no M0 (ADR-034), suporte
  oficial (Official Partner). Uma conta Cloudflare por projeto (ADR-013).
- Ambiente: development / staging / production (spec §43).

## Economia (spec §5, §67, ADR-017)

"Supabase ou Cloudflare já resolve isso?" antes de qualquer serviço externo.
Tier grátis é franquia, não teto → guardrails de custo no código (ADR-013) e
monitoramento de cota.
