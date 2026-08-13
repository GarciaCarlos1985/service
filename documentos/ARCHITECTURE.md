ˇ# ARCHITECTURE ‚¨ SERVICE

Marketplace brasileiro de servi√ßos locais. Fonte de verdade de produto:
`./SERVICE-PROMPT-INICIO.md`. Decis√µes t√©cnicas: `./DECISIONS.md` (ADR-001+).

## Stack (spec ¬ß1)

- **TanStack Start** (React 19, Vite 8) ‚¨ SSR/SSG full-stack com server functions
- **TypeScript strict** ‚¨ `any`/`as any`/`@ts-ignore` proibidos sem justificativa (spec ¬ß60)
- **Tailwind CSS v4** ‚¨ design system com tokens da identidade verde ‚  azul claro
- **TanStack Query** ‚¨ estado de dados no cliente
- **Zod** ‚¨ valida√ß√£o de schemas (compartilhados entre cliente e servidor)
- **React Hook Form** ‚¨ formul√°rios
- **Supabase** ‚¨ fonte de verdade: PostgreSQL, Auth, RLS, Realtime, Storage
- **Cloudflare** ‚¨ Workers (app), DNS/CDN/cache, R2 (m√≠dia), Queues/Cron (automa√ß√µes)
- **Stripe Connect** ‚¨ pagamentos via abstra√ß√£o `PaymentProvider`

## Camadas (ADR-001)

```
Navegador (TanStack Start client)
   ‚  server functions / routes
Valida√ß√£o (Zod) ‚  Regra de neg√≥cio (dom√≠nio) ‚  Persist√™ncia
   ‚  adapters registrados (registry, 1 classe + 1 linha)
PaymentProvider ¬∑ NotificationProvider ¬∑ StorageProvider
   ‚ 
Supabase (PostgreSQL + RLS) ¬∑ Cloudflare R2 ¬∑ Stripe
```

Regra de neg√≥cio **nunca** depende de detalhe de provider (ADR-001).

## Dados: padr√£o Medallion (ADR-008)

- **Bronze:** `webhook_events` e eventos crus (raw versionado, payload_hash SHA-256)
- **Silver:** camadas can√¥nicas (payments, wallet_transactions, bookings) com dedup
- **Gold:** views de serving com `security_invoker = true` ‚¨ o produto l√™ s√≥ a Gold

## Estrutura de pastas

```
src/
  routes/          # rotas TanStack (file-based, SSR index√°vel)
  modules/
    ui/            # design system (ativo no M0)
    auth/ booking/ payment/ wallet/ search/ chat/ review/
    referral/ admin/ client/ professional/   # nascem com cada milestone (ADR-017)
  lib/             # clientes externos (supabase, providers)
  utils/           # utilit√°rios puros (cn, seo, formatadores)
  queryClient.ts   # TanStack Query
  router.tsx       # TanStack Router
supabase/
  migrations/      # SQL versionado (ADR-010)
```

## Deploy (ADR-036/037 ‚¨ Vercel free por enquanto; ADR-034 como plano de retorno)

- **Atual:** app (SSR + assets) na **Vercel (plano gr√°tis)** via Nitro
  (`nitro/vite`, preset `vercel`) ‚¨ caminho oficial do TanStack Start para
  Vercel; banco em Supabase. Decis√£o econ√¥mica enquanto o site n√£o vende
  (ADR-036/037).
- **Plano de retorno:** Cloudflare Workers (`@cloudflare/vite-plugin` +
  `wrangler deploy`, `nodejs_compat`) ‚¨ validado no M0 (ADR-034), suporte
  oficial (Official Partner). Uma conta Cloudflare por projeto (ADR-013).
- Ambiente: development / staging / production (spec ¬ß43).

## Economia (spec ¬ß5, ¬ß67, ADR-017)

"Supabase ou Cloudflare j√° resolve isso?" antes de qualquer servi√ßo externo.
Tier gr√°tis √© franquia, n√£o teto ‚  guardrails de custo no c√≥digo (ADR-013) e
monitoramento de cota.

