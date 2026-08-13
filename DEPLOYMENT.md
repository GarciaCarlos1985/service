# DEPLOYMENT — SERVICE

Ambientes: development · staging · production (spec §43). Nenhuma migration
perigosa direto em produção; mudança estrutural sempre passa por staging e
revisão (ADR-010).

## Decisão de hospedagem atual (ADR-036 + ADR-037 — 2026-08-12)

**Enquanto o site não vende, o frontend roda na Vercel (plano grátis) e o banco
no Supabase.** Retorno ao Cloudflare (Workers + R2) planejado quando a receita
permitir/justificar — o desenho da app não muda, só o deploy.

| camada                           | onde                                                  | como                                                                           |
| -------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------ |
| App (SSR + assets)               | **Vercel** (grátis)                                   | TanStack Start via Nitro (`nitro/vite`, preset `vercel`) — Build Output API v3 |
| Banco + Auth + RLS + Realtime    | Supabase                                              | projeto `taabjnmsaaltsiehywbw`                                                 |
| Mídia (avatar, portfólio, fotos) | Supabase Storage enquanto estiver no grátis           | upload autorizado por backend (spec §4); R2 na volta ao Cloudflare (ADR-013)   |
| Automações leves                 | Vercel Cron/Functions (tier grátis) quando necessário | expirações, lembretes, cashback (spec §53)                                     |

**Plano de retorno Cloudflare (ADR-034):** adicionar de volta
`@cloudflare/vite-plugin` + `wrangler` + `wrangler.jsonc`; `npm run deploy`
vira `wrangler deploy`. Camada de app não muda (ADR-034 registrado).

## Deploy na Vercel

```bash
npm install
npm run build           # gera .vercel/output (auto-detectado pela Vercel)
npx vercel login        # uma vez
npx vercel --prod       # ou npm run deploy
```

O build usa Nitro com preset `vercel` (caminho oficial do TanStack Start para
Vercel): o SSR vira uma serverless function (`__server.func`) e o front é
servido pelo CDN da Vercel.

### Env vars na Vercel

Painel Vercel → **Project → Settings → Environment Variables** (as duas como
`VITE_*`):

- `VITE_SUPABASE_URL=https://taabjnmsaaltsiehywbw.supabase.co`
- `VITE_SUPABASE_ANON_KEY=<anon public do Supabase>`

Regra: `VITE_*` é pública por design; **nunca** service key em variáveis do
build do front. Depois de mudar env vars, a Vercel exige **redeploy**.

## CI (GitHub Actions, spec §77)

`.github/workflows/ci.yml` — em todo push/PR:

1. `npm ci`
2. `npm run typecheck`
3. `npm run lint`
4. `npm run format:check`
5. `npm run test`
6. `npm run build`

Deploy contínuo: conectar o repositório GitHub no painel da Vercel (framework
auto-detectado) — deploys automáticos a cada push na `main`.

## Supabase

```bash
npx supabase link --project-ref taabjnmsaaltsiehywbw   # por ambiente
npx supabase db push                                    # migrations versionadas
```

## Rollback

- App: Vercel → Deployments → ⋯ → **Promote to Production** (versão anterior).
- Banco: migrations compatíveis para frente (ADR-010); **rollback falso
  proibido** — se uma operação não for reversível, informar claramente.
- Plano de retorno de cada mudança estrutural fica registrado no ADR
  correspondente.

## Checklist de produção (spec §78)

- [ ] Build passa em CI
- [ ] Typecheck/lint/test passam
- [ ] Env vars configuradas na Vercel (nunca no repositório)
- [ ] RLS ligada em tabelas críticas (ADR-002)
- [ ] Monitoramento e alertas ativos (ADR-020)
- [ ] Backups configurados (ver DISASTER-RECOVERY.md)
