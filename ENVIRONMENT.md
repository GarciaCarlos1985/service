# ENVIRONMENT — Variáveis de ambiente do SERVICE

Tudo o que o projeto precisa de cada serviço e onde encontrar cada chave.

## Regra de segurança (não negociável)

| prefixo                      | uso                            | pode ir para o navegador? |
| ---------------------------- | ------------------------------ | ------------------------- |
| `VITE_`                      | público — vai para o bundle JS | **sim, por design**       |
| qualquer outro (sem `VITE_`) | servidor/backup                | **nunca**                 |

- **NUNCA** coloque `service_role`, tokens de storage, senhas ou secrets em
  variáveis `VITE_*` — elas aparecem no bundle público.
- `.env.local` é ignorado pelo git. **Nunca** renomeie para `.env` e commite.
- A chave anônima do Supabase é **pública por design** (o navegador precisa
  dela). A segurança do acesso **não** depende dela: depende do **RLS** no
  banco (documentos/DECISIONS.md — ADR-002). Sem RLS correto, chave anônima =
  dado exposto.

## Chaves ativas

| chave                    | o que é                     | onde obter                                                      | nível                       |
| ------------------------ | --------------------------- | --------------------------------------------------------------- | --------------------------- |
| `VITE_SUPABASE_URL`      | URL do projeto Supabase     | Dashboard Supabase → **Project Settings → API** → `Project URL` | público                     |
| `VITE_SUPABASE_ANON_KEY` | chave anônima (anon/public) | Dashboard Supabase → **Project Settings → API** → `anon public` | público (protegido por RLS) |

Já preenchido em `.env.local`: `VITE_SUPABASE_URL=https://taabjnmsaaltsiehywbw.supabase.co`
Falta preencher: `VITE_SUPABASE_ANON_KEY` (copiar do painel).

## Onde configurar cada ambiente (deploy Netlify — ADR-036)

| variável                 | dev local    | Netlify (produção)                    |
| ------------------------ | ------------ | ------------------------------------- |
| `VITE_SUPABASE_URL`      | `.env.local` | Site settings → Environment variables |
| `VITE_SUPABASE_ANON_KEY` | `.env.local` | Site settings → Environment variables |

O `.env.local` serve só para desenvolvimento; produção configura as variáveis
no painel do Netlify, nunca no repositório.

## Chaves futuras (quando o milestone chegar — NÃO usar agora)

| chave                                                                       | o que é                                                       | onde obter                                                     | nível       | milestone                                       |
| --------------------------------------------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------- | ----------- | ----------------------------------------------- |
| `SUPABASE_SERVICE_ROLE_KEY`                                                 | chave de servidor (bypass RLS) — **uso exclusivo backend/CI** | Dashboard → Project Settings → API → `service_role`            | **secreto** | M1+ (jobs, webhooks)                            |
| `STRIPE_SECRET_KEY`                                                         | chave secreta Stripe                                          | Stripe Dashboard → Developers → API keys                       | **secreto** | M5                                              |
| `STRIPE_WEBHOOK_SECRET`                                                     | assinatura de webhook Stripe                                  | Stripe Dashboard → Developers → Webhooks                       | **secreto** | M5                                              |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET` | Cloudflare R2 (mídia)                                         | Dashboard Cloudflare → R2 → Manage R2 API Tokens               | **secreto** | M11 (só quando o frontend sair do deploy atual) |
| `CF_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`                                    | deploy Cloudflare Workers                                     | Dashboard Cloudflare → My Profile → API Tokens (escopo mínimo) | **secreto** | quando voltar para Cloudflare                   |

Nenhuma dessas entra em `.env.local` com prefixo `VITE_`. Quando usadas no
backend (TanStack Start server), ficam em variáveis de ambiente do servidor /
GitHub Secrets.

## Segurança adicional

- Rotacione a chave anônima se ela vazar (é pública, mas evite dor de cabeça).
- `service_role` **só** roda fora do navegador e **nunca** em CI de terceiros
  sem segredo restrito.
- Ver `SECURITY.md` e `documentos/DECISIONS.md` (ADR-002, ADR-016) para a
  postura completa.
