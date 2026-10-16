# Cloudflare Workers — Service Guide (16/10/2026)

## Autorização e escopo

O usuário autorizou a publicação no Cloudflare se tecnicamente viável.
A migração troca somente o adaptador de hospedagem: TanStack Start e Supabase
permanecem. Repositório oficial: `GarciaCarlos1985/service`, branch `main`.

Destino: Worker `service-guide`, conta verificada pelas credenciais locais,
subdomínio `helon280.workers.dev`. Nenhum plano pago, domínio personalizado,
D1, R2 ou novo banco é necessário para esta publicação.

## Implementação

- `@cloudflare/vite-plugin` + Wrangler substituem Nitro/Vercel.
- `wrangler.jsonc` usa a entrada oficial do TanStack Start, `nodejs_compat`,
  compatibilidade de 16/10/2026 e logs com amostragem de 10%.
- O build gera `dist/client` e `dist/server`; o preview usa o runtime Workers.
- Tipos de runtime gerados por `wrangler types`, sem credenciais inferidas.
- O Worker não necessita de secrets. As duas variáveis `VITE_SUPABASE_*`
  são públicas e incorporadas no build; tokens de administração ficam locais.
- Dependências vulneráveis foram atualizadas dentro dos intervalos compatíveis.

## Validação e publicação

- Publicado em **https://service-guide.helon280.workers.dev**.
- Worker: `service-guide`; versão ativa:
  `28ade995-a0c2-4614-8770-c4b48ac7d851`.
- Upload confirmado pelo Wrangler: 66 assets enviados; Worker 2679,32 KiB
  (573,88 KiB gzip), inicialização informada pela Cloudflare: 14 ms.
- Typecheck passou; lint: zero erros e 37 avisos legados; formatação passou.
- Vitest: **56 testes em 9 arquivos passaram**, incluindo os testes PGlite.
- Build e `wrangler deploy --dry-run` passaram, sem bindings de credenciais.
- Preview em Workers local: home, ajuda, login, privacidade, logo e favicon
  responderam 200; `/previa` e rota inexistente responderam 404.
- Endereço público conferido após o deploy: home, ajuda, login, privacidade,
  logo e favicon responderam 200 pelo Cloudflare; `/previa`, rota inexistente
  e `/.env.local` responderam 404. SHA-256 da logo publicada idêntico ao arquivo
  fornecido em `public/service-guide.png`.
- Conferência no navegador público confirmou a página hidratada, identidade
  preservada e mensagem de catálogo em preparação. Nenhum cadastro ou envio
  de formulário de contato foi realizado como teste.
- Inspeção visual do runtime local: identidade e logo preservadas; catálogo
  apresenta preparação por ausência da fundação comercial. Console sem erros.
- Scanner em streams inspecionou 221 arquivos do build: nenhuma credencial
  privada de `.env.local`, nenhum arquivo `.env`, ZIP ou RAR no artefato.
- `npm audit fix` aplicou atualizações compatíveis; audit final: **0
  vulnerabilidades**. TanStack Start `1.169.2` / core `1.169.43` corrigem
  GHSA-qx66-fv34-fjm8; Vitest `4.1.11` corrige GHSA-82fw-gwwq-j7x9.
- O build ainda informa avisos CSS de `@theme`/`@custom-variant` e sourcemap;
  não impediram o build nem a renderização conferida. Não são prova de
  validação visual de todas as telas legadas.

## Limitação de produto preservada

No momento do deploy, a migração comercial ainda estava pendente. Após nova
autorização do usuário, foi aplicada e testada no Supabase real (ADR-050).
O catálogo público agora responde normalmente, com zero empresas, sem exemplos
fictícios. Ver `ATIVACAO-SUPABASE-2026-10-16.md` para os resultados e as pendências
de configuração operacional. `/previa` permanece exclusiva de desenvolvimento
e responde 404 em produção.
