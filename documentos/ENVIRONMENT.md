# ENVIRONMENT — SERVICE GUIDE

## Variáveis públicas e segredos

`VITE_*` entra no JavaScript público. Somente URL e chave anônima/publicável
do Supabase pertencem a esse grupo. RLS e RPCs fazem a autorização no banco.
Nunca use esse prefixo para service role, senha, token Cloudflare ou de CLI.
`.env.local` e `.dev.vars*` são ignorados pelo Git.

| variável | finalidade | destino |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | URL pública do projeto Supabase | build local/CI |
| `VITE_SUPABASE_ANON_KEY` | chave pública do Supabase, protegida por RLS | build local/CI |
| `CLOUDFLARE_API_TOKEN` | autenticação da ferramenta de publicação | processo Wrangler, nunca Worker/browser |
| `CLOUDFLARE_ACCOUNT_ID` | conta Cloudflare de destino | processo Wrangler |
| `DATABASE_URL` | runner SQL local, contém senha | somente `.env.local` / processo de teste autorizado |
| `PGSSLROOTCERT` | caminho local do certificado público da CA do Postgres | runner/CLI local, validação TLS |
| `SUPABASE_SERVICE_ROLE_KEY` | operações privilegiadas autorizadas | somente backend/ferramentas, nunca bundle |
| `SUPABASE_ACCESS_TOKEN` | Management API para configuração de Auth/advisors do projeto | ferramentas autorizadas, nunca Worker/browser |

Copie os nomes de `.env.example` e preencha localmente. A conta e o token de
publicação devem ser verificados antes de enviar o app. O token precisa de
**Workers Scripts Edit** na conta de destino; permissões de leitura permitem
inventariar recursos, mas não publicar. Permissões adicionais devem ser pedidas
somente se o comando retornar uma necessidade concreta.

## Cloudflare Workers (ADR-049)

`npm run build` carrega somente as variáveis públicas através do mecanismo
`VITE_*`. `npm run deploy` recompila e carrega `.env.local` no processo Wrangler
via Node.js. Credenciais nunca são gravadas em `wrangler.jsonc`.

O Worker atual não requer secrets de runtime: comunica-se com as APIs públicas
do Supabase, respeitando RLS. `secrets.required: []` evita inferir segredos locais
nos tipos e a configuração Vite desativa a carga automática de `.env` como
bindings locais do Worker. `worker-configuration.d.ts` é gerado, não versionado.

Em CI, injete apenas as duas variáveis públicas no build. Se no futuro houver
publicação automática autorizada, o token e o account ID ficam em GitHub Secrets
ou no ambiente protegido do provedor. Não versionar `.env.local` nem publicar
esse arquivo como asset. Trocar a URL/chave pública exige recompilar e publicar.

## Serviços futuros

R2, D1, gateway de pagamento e novas automações não são necessários neste deploy.
Não crie credenciais ou serviços antes da autorização e da necessidade concreta.
Para novos secrets de runtime, use o armazenamento de secrets Cloudflare e gere
novamente os tipos; nunca os declare em `vars` ou em variáveis `VITE_*`.
