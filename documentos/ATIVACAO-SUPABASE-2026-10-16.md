# Ativação do Supabase — Service Guide (16/10/2026)

## Autorização e destino

Após a publicação no Cloudflare, o usuário autorizou a ativação pendente:
“faça isso, cuide do GitHub, Supabase e Cloudflare e me entregue o link
compartilhável do site online”. Isso autoriza aplicar e validar a fundação
comercial preparada, preservando o legado e sem publicar exemplos fictícios.

- Site: **https://service-guide.helon280.workers.dev**.
- Supabase: projeto `taabjnmsaaltsiehywbw`.
- Código: `GarciaCarlos1985/service`, branch `main`.
- Migração aplicada: `20261015032437_guide_commercial_foundation.sql`.
- SHA-256 do conteúdo canônico LF:
  `d6048acc50ca3fe12befbc1a0b9fe1fed8fd77864a13040f2df3f9da6f25c4ff`.
  O arquivo CRLF no Windows tem hash de bytes diferente, com conteúdo idêntico.

## Aplicação e preservação

O conector Supabase não permite acesso a esse projeto e a credencial de
gerenciamento da CLI está inválida. A conexão PostgreSQL fornecida em
`.env.local` funciona com TLS e validação do certificado/hostname, usando o
certificado da CA já armazenado pela CLI em `supabase/.temp/pgdelta/`.
Nenhum token, senha ou arquivo privado foi publicado.

A migração e a suíte nova foram primeiro executadas no banco real dentro de
uma transação, com rollback. Após o ensaio aprovado, `supabase db push`
aplicou somente a migração pendente, com `sslmode=verify-full`, sem seeds,
alteração de roles ou configuração de Vault. O histórico remoto tem agora
**10 migrações** e mantém os identificadores dos arquivos locais.

Contagens e fingerprints dos dados foram comparadas antes/depois: os dados
originais das **25 tabelas legadas permanecem iguais**. A tabela `cities`
recebeu somente Cacoal (IBGE 1100049), aumentando de 11 para 12 cidades; as
11 linhas anteriores foram conferidas separadamente. Nenhum usuário real
foi alterado ou excluído durante a ativação.

## Validação medida

- **Suíte SQL real:** `node scripts/sql-tests.mjs supabase/tests/guide-commercial.sql`.
  Verifica 18 tabelas com RLS/privilégios restritos, trigger de perfil/Auth,
  administração por RPC, busca por produto, filtros/paginação, rascunhos,
  proteção de helpers, favoritos por usuário, moderação, contato interno,
  recursos de plano, 13 snapshots administrativos, bloqueio, protocolos de
  ajuda, consentimento e imutabilidade de eventos/auditoria.
- Todas as fixtures dessa suíte são **revertidas por rollback** e não ficam
  visíveis para as outras conexões. As suítes antigas com limpeza ampla não
  foram executadas neste projeto ativo.
- O runner agora valida TLS e sempre envolve o teste em transação com rollback,
  inclusive em erro, sem persistir a limpeza das suítes legadas.
- **API pública:** `guide_search` retorna HTTP 200, `source=supabase`, dois
  planos e `containsExamples=false`; acesso anônimo direto a `companies`
  retorna HTTP 401; CORS permite o endereço público Cloudflare.
- **Auth real pelo SDK:** cadastro, verificação de usuário, login com senha,
  logout e atualização do próprio perfil passaram. Metadados `is_admin` não
  concederam privilégio; a conta de consumidor foi impedida de administrar.
  A conta temporária foi identificada por nonce, deslogada e removida de forma
  restrita; a quantidade original de usuários foi preservada.
- O Auth está com cadastro por e-mail habilitado e `mailer_autoconfirm=true`.
  Esse teste não enviou e-mails. Entrega/retorno de recuperação de senha não
  foi validada sem acesso à configuração de Auth.
- **Navegador público:** a mensagem de preparação desapareceu; a home mostra
  **0 empresas encontradas**, com busca e filtros disponíveis.
- **Gate local:** typecheck, lint sem erros (37 avisos legados), formatação,
  56 testes Vitest em 9 arquivos e build Cloudflare passaram novamente.
  O código de runtime e os assets não mudaram nesta ativação: a versão
  Cloudflare `28ade995-a0c2-4614-8770-c4b48ac7d851` continua servindo o site
  com as RPCs agora disponíveis no Supabase.

## Pendências que dependem do responsável

- Confirmar o e-mail a receber o acesso administrativo: a base tem uma conta
  cadastrada e nenhuma conta administradora. Nenhuma foi promovida por inferência.
- Fornecer acesso de gerenciamento ao projeto para conferir e ajustar URLs de
  retorno do Auth e consultar os advisors do provedor. Não confundir esse acesso
  com a senha PostgreSQL que já permitiu a migração e os testes.
- Cadastrar categorias, bairros e empresas reais pelo painel autorizado.
  O catálogo público não recebeu empresas, avaliações ou contatos fictícios.
  Upload de mídia, chat e cobrança automática continuam fora deste recorte.
