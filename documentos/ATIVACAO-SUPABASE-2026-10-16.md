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

Na aplicação da migração, o conector Supabase não permitia acesso a esse projeto
e a credencial de gerenciamento da CLI estava inválida. A conexão PostgreSQL fornecida em
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
  Esse teste não enviou e-mails. A validação posterior de recuperação está
  registrada abaixo; entrega real de e-mail não foi exercitada.
- **Navegador público:** a mensagem de preparação desapareceu; a home mostra
  **0 empresas encontradas**, com busca e filtros disponíveis.
- **Gate local:** typecheck, lint sem erros (37 avisos legados), formatação,
  56 testes Vitest em 9 arquivos e build Cloudflare passaram novamente.
  O código de runtime e os assets não mudaram naquela etapa: a versão
  Cloudflare `28ade995-a0c2-4614-8770-c4b48ac7d851` serviu o site
  com as RPCs então ativadas no Supabase. A correção posterior de recuperação
  exige nova publicação do app.

## Ativação administrativa após confirmação dos e-mails

Após esclarecimento da divergência entre os e-mails informados, o usuário
confirmou duas contas. Ambas já existiam no Auth do projeto correto, com senha,
e-mail confirmado, perfil associado e sem bloqueio. Foram promovidas por uma
transação restrita aos dois IDs, com dois eventos `admin_bootstrap` em
`admin_audit_logs`. As senhas e os outros perfis foram preservados.

Os eventos identificam a origem como autorização humana explícita, a execução
pelo operador PostgreSQL e o contexto de bootstrap; a referência ao destinatário
não representa uma sessão autenticada desse usuário. Os e-mails/IDs ficam no
banco e no registro local ignorado pelo Git, fora da documentação pública.

Para cada conta, `guide_me` retornou `admin=true` e os snapshots de visão geral
e usuários foram autorizados sob o papel `authenticated` com o respectivo
`auth.uid()`. A suíte SQL comercial passou novamente, incluindo negação de
administração a consumidores. A entrada no navegador com a senha de cada pessoa
fica a cargo dos titulares; nenhuma senha foi solicitada ou redefinida.

Painel: **https://service-guide.helon280.workers.dev/admin**.
Login com retorno ao painel:
**https://service-guide.helon280.workers.dev/entrar?redirect=%2Fadmin**.

## Pendências que dependem do responsável

- Conferir a entrega do e-mail de recuperação na caixa do titular. Nenhuma
  mensagem foi enviada aos usuários durante os testes técnicos.
- Cadastrar categorias, bairros e empresas reais pelo painel autorizado.
  O catálogo público não recebeu empresas, avaliações ou contatos fictícios.
  Upload de mídia, chat e cobrança automática continuam fora deste recorte.

## Configuração de Auth após fornecimento do token de gerenciamento

O `SUPABASE_ACCESS_TOKEN` fornecido localmente foi validado para o projeto
`taabjnmsaaltsiehywbw`, ativo e saudável. O Auth ainda usava
`http://localhost:3000` como endereço principal e não tinha retornos adicionais.
Foram alterados somente `site_url` e `uri_allow_list`; os demais campos foram
comparados e preservados, incluindo cadastro e confirmação automática.

- Endereço principal: `https://service-guide.helon280.workers.dev`.
- Retornos exatos `/conta` e `/recuperar-senha` nesse endereço e em
  `http://localhost:3000` / `http://127.0.0.1:3001`, sem curingas.
- Cadastro informa o retorno à conta e recuperação informa a própria página.
  A página agora inclui a etapa de nova senha, confirmação, validação e estados
  de envio/erro/sucesso, usando os componentes existentes.
- Uma conta temporária recebeu um link gerado pela API administrativa, sem
  envio de e-mail. A verificação retornou ao caminho público correto; a sessão
  de recuperação definiu nova senha, a anterior foi recusada e a nova permitiu
  login. A conta continuou impedida de administrar. A limpeza é restrita ao ID,
  e-mail e nonce da fixture e compara contas/permissões originais após remoção.
- As senhas das duas contas administrativas não foram acessadas ou alteradas.
  Token de gerenciamento, chave de servidor e credenciais de teste permanecem
  fora do código público e do Worker.
- A conta temporária foi removida; fingerprints das contas, senhas e permissões
  originais permaneceram iguais. O gate da correção passou: typecheck, lint sem
  erros (37 avisos herdados), formatação, **60 testes em 9 arquivos** e build.
  A etapa de nova senha e as validações de campos vazios foram conferidas no
  navegador com sessão temporária, em desktop e 390 px, sem overflow horizontal.
  A senha foi alterada somente pelo SDK na fixture técnica; as senhas dos
  titulares não foram usadas na validação de interface. O detector de interface
  retornou zero ocorrências nos dois arquivos de UI alterados. Uma busca pelos
  valores privados locais verificou 231 arquivos de build/código/documentação
  sem encontrar credenciais privadas.

Os advisors de segurança também foram consultados: **0 ERROR, 107 WARN e
26 INFO**. Os grupos incluem funções `SECURITY DEFINER` executáveis por papéis
da API (arquitetura de RPC com autorização interna), tabelas com RLS sem policy
(negação por padrão), dois avisos de `search_path`, extensão no schema público
e proteção contra senhas vazadas desabilitada. A consulta não equivale a resolver
todos os avisos; mudanças no legado e políticas de senha exigem avaliação
própria. Nenhuma configuração paga ou alteração de permissões foi feita para
silenciar o relatório.
