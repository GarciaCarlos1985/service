# DEPLOYMENT — SERVICE GUIDE

## Hospedagem atual (ADR-049 — 16/10/2026)

O destino de publicação é **Cloudflare Workers**, autorizado pelo usuário.
A aplicação continua em **TanStack Start** e o backend continua no **Supabase**.
O adaptador Nitro/Vercel foi substituído pela integração oficial Cloudflare/Vite.
O resultado medido da publicação está em `CLOUDFLARE-2026-10-16.md`.

| camada | destino |
| --- | --- |
| App SSR + assets | Worker `service-guide` no Cloudflare |
| Banco, Auth, RLS, Realtime | Supabase `taabjnmsaaltsiehywbw`, preservado |
| Mídia | Assets do projeto / URLs HTTPS existentes; nenhum R2 provisionado |
| Código | `https://github.com/GarciaCarlos1985/service`, `main` |

Nenhum plano pago foi contratado. O serviço continua sujeito às cotas da conta.
Staging remoto e integração automática Workers Builds não foram provisionados.

## Preparar e validar

Requisito: Node.js 24 ou superior. Em um checkout limpo:

```bash
npm ci
npm run typecheck
npm run lint
npm run format:check
npm run test
npm run build
npm run preview -- --port 3002
```

`typecheck` gera os tipos a partir de `wrangler.jsonc`. O build produz
`dist/client` (assets) e `dist/server` (SSR/configuração gerada).
`vite preview` executa esse build no runtime local do Workers.
`/previa` continua exclusiva de DEV: em produção deve responder 404.

## Credenciais e publicação

No `.env.local` ignorado pelo Git (ou variáveis do processo no CI):

- `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`: públicas, usadas no build.
- `CLOUDFLARE_API_TOKEN`: token da conta com permissão de publicar Workers.
- `CLOUDFLARE_ACCOUNT_ID`: conta de destino verificada antes da publicação.

```bash
npm run deploy
```

Esse comando recompila e carrega `.env.local` apenas no processo de publicação
Wrangler. O token não é argumento de linha de comando nem binding do Worker.
A configuração impede que credenciais de administração locais virem bindings
no runtime de desenvolvimento; `secrets.required: []` impede inferência de
credenciais nos tipos gerados. Nunca use prefixo `VITE_` em tokens ou senhas.
Alterar variáveis públicas exige novo build e deploy.

O nome do Worker é `service-guide`; o destino público inicial é `workers.dev`.
Não altera DNS ou domínio personalizado. Para novos deploys, siga a regra de
autorização humana do projeto. Não execute `supabase db push` como parte do deploy.

## CI no GitHub

`.github/workflows/ci.yml` executa install, typecheck, lint, format, test e build
em push para `main` e em PRs. O artefato `dist` é preservado por 7 dias.
O CI de qualidade não publica por conta própria e não recebe credenciais de
administração do Supabase. Uma integração antiga na Vercel pode continuar
recebendo eventos do GitHub, mas não é o destino configurado deste build.

## Banco e autenticação

A fundação comercial ainda depende da aplicação revisada da migração
`20261015032437_guide_commercial_foundation.sql` e de testes no Supabase real.
Até lá, o catálogo exibe o estado de preparação. Publicar o app não ativa
cadastros comerciais, conteúdo real ou os fluxos dependentes dessas RPCs.
Confirme as URLs de retorno do Supabase antes de liberar confirmação por e-mail
e recuperação de senha no novo endereço; esses fluxos exigem teste autenticado.

## Rollback

Use o histórico de versões do Worker `service-guide` no painel Cloudflare para
republicar uma versão anterior, após validação humana. Para o primeiro deploy,
não existe versão Cloudflare anterior. Reverter a hospedagem para Vercel exige
restaurar o adaptador/configuração histórica e fazer um novo deploy validado.
O deploy não muda o banco; migrations seguem a política compatível para frente.
