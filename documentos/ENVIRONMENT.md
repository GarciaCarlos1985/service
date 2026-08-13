ˇ# ENVIRONMENT ‚¨ Vari√°veis de ambiente do SERVICE

Tudo o que o projeto precisa de cada servi√ßo e onde encontrar cada chave.

## Regra de seguran√ßa (n√£o negoci√°vel)

| prefixo                      | uso                            | pode ir para o navegador? |
| ---------------------------- | ------------------------------ | ------------------------- |
| `VITE_`                      | p√∫blico ‚¨ vai para o bundle JS | **sim, por design**       |
| qualquer outro (sem `VITE_`) | servidor/backup                | **nunca**                 |

- **NUNCA** coloque `service_role`, tokens de storage, senhas ou secrets em
  vari√°veis `VITE_*` ‚¨ elas aparecem no bundle p√∫blico.
- `.env.local` √© ignorado pelo git. **Nunca** renomeie para `.env` e commite.
- A chave an√¥nima do Supabase √© **p√∫blica por design** (o navegador precisa
  dela). A seguran√ßa do acesso **n√£o** depende dela: depende do **RLS** no
  banco (./DECISIONS.md ‚¨ ADR-002). Sem RLS correto, chave an√¥nima =
  dado exposto.

## Chaves de teste local (nunca para o bundle)

| chave | o que √© | onde obter | n√≠vel |
|---|---|---|---|
| `DATABASE_URL` | conex√£o direta (porta 5432) do Postgres ‚¨ usada apenas pelo runner de testes SQL (`node scripts/sql-tests.mjs`) | Supabase Dashboard ‚  Project Settings ‚  Database ‚  Connection string | **secreto** |

`DATABASE_URL` cont√©m a senha do banco: vive s√≥ no `.env.local` (gitignored),
nunca √© impressa pelo runner e nunca vai para a Vercel ou o reposit√≥rio.

## Chaves ativas

| chave                    | o que √©                     | onde obter                                                      | n√≠vel                       |
| ------------------------ | --------------------------- | --------------------------------------------------------------- | --------------------------- |
| `VITE_SUPABASE_URL`      | URL do projeto Supabase     | Dashboard Supabase ‚  **Project Settings ‚  API** ‚  `Project URL` | p√∫blico                     |
| `VITE_SUPABASE_ANON_KEY` | chave an√¥nima (anon/public) | Dashboard Supabase ‚  **Project Settings ‚  API** ‚  `anon public` | p√∫blico (protegido por RLS) |

J√° preenchido em `.env.local`: `VITE_SUPABASE_URL=https://taabjnmsaaltsiehywbw.supabase.co`
Falta preencher: `VITE_SUPABASE_ANON_KEY` (copiar do painel).

## Onde configurar cada ambiente (deploy Vercel ‚¨ ADR-036/037)

| vari√°vel                 | dev local    | Vercel (produ√ß√£o)                          |
| ------------------------ | ------------ | ------------------------------------------ |
| `VITE_SUPABASE_URL`      | `.env.local` | Project ‚  Settings ‚  Environment Variables |
| `VITE_SUPABASE_ANON_KEY` | `.env.local` | Project ‚  Settings ‚  Environment Variables |

O `.env.local` serve s√≥ para desenvolvimento; produ√ß√£o configura as vari√°veis
no painel da Vercel, nunca no reposit√≥rio. Depois de alterar env vars na
Vercel, √© necess√°rio **redeploy**.

## Chaves futuras (quando o milestone chegar ‚¨ N√íO usar agora)

| chave                                                                       | o que √©                                                       | onde obter                                                     | n√≠vel       | milestone                                       |
| --------------------------------------------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------- | ----------- | ----------------------------------------------- |
| `SUPABASE_SERVICE_ROLE_KEY`                                                 | chave de servidor (bypass RLS) ‚¨ **uso exclusivo backend/CI** | Dashboard ‚  Project Settings ‚  API ‚  `service_role`            | **secreto** | M1+ (jobs, webhooks)                            |
| `STRIPE_SECRET_KEY`                                                         | chave secreta Stripe                                          | Stripe Dashboard ‚  Developers ‚  API keys                       | **secreto** | M5                                              |
| `STRIPE_WEBHOOK_SECRET`                                                     | assinatura de webhook Stripe                                  | Stripe Dashboard ‚  Developers ‚  Webhooks                       | **secreto** | M5                                              |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET` | Cloudflare R2 (m√≠dia)                                         | Dashboard Cloudflare ‚  R2 ‚  Manage R2 API Tokens               | **secreto** | M11 (s√≥ quando o frontend sair do deploy atual) |
| `CF_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`                                    | deploy Cloudflare Workers                                     | Dashboard Cloudflare ‚  My Profile ‚  API Tokens (escopo m√≠nimo) | **secreto** | quando voltar para Cloudflare                   |

Nenhuma dessas entra em `.env.local` com prefixo `VITE_`. Quando usadas no
backend (TanStack Start server), ficam em vari√°veis de ambiente do servidor /
GitHub Secrets.

## Seguran√ßa adicional

- Rotacione a chave an√¥nima se ela vazar (√© p√∫blica, mas evite dor de cabe√ßa).
- `service_role` **s√≥** roda fora do navegador e **nunca** em CI de terceiros
  sem segredo restrito.
- Ver `SECURITY.md` e `./DECISIONS.md` (ADR-002, ADR-016) para a
  postura completa.

