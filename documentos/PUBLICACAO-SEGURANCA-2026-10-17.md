# Publicação das correções de segurança — 17/10/2026

Após receber o PR #2 e o plano de liberação para revisão, o responsável pediu
“continue”. A execução ficou restrita às correções de segurança apresentadas:
merge, duas migrations, mínimo de novas senhas e publicação do Worker. O PR #3
de logotipo/horários permanece separado e em rascunho.

## Estado publicado

| Item | Evidência medida |
| --- | --- |
| Site | https://service-guide.helon280.workers.dev/ |
| Entrada administrativa | https://service-guide.helon280.workers.dev/entrar?redirect=%2Fadmin |
| PR mesclado | https://github.com/GarciaCarlos1985/service/pull/2 |
| Fonte publicada | `91999f44be363ef2bc682c2f4b85b6646c630a97` |
| CI da main | https://github.com/GarciaCarlos1985/service/actions/runs/39074482148 — sucesso |
| Worker | `service-guide` |
| Versão | `f22fa7b6-0046-4a44-b44d-5582ea4f22d4` |
| Implantação | `18949f1d-a3c8-48d1-9008-33aad51faa33`, 100% do tráfego |
| Publicação | 17/10/2026, 19:23:09 em Brasília (`2026-10-17T22:23:09Z`) |
| Supabase | `taabjnmsaaltsiehywbw`, 14 migrations no histórico |

A CLI oficial aplicou somente `20261017130133_guide_internal_rpc_permissions.sql`
e `20261017142019_guide_api_access_boundary.sql`, após dry-run. Sem seeds,
remoção de tabelas ou exclusão de dados legados. A migration
`20261017132355_guide_company_identity_hours.sql` não foi aplicada. Sua inclusão
futura será anterior à última versão do histórico e deve passar pelo dry-run
da CLI com `--include-all`, depois de revisão própria; nunca reparar histórico
para simular uma aplicação.

O script `harden-guide-auth.mjs --apply` elevou o mínimo do Auth de seis para
12 caracteres, com releitura de confirmação e preservação das outras opções.
Nenhuma senha ou autenticador de titular foi redefinido. Acesso ao Gmail não
substitui a senha do Service Guide.

## Resultado confirmado em produção

- 43 de 43 tabelas públicas mantêm RLS ativa. Clientes não têm grants diretos
  nas tabelas/views públicas, nem por coluna.
- Os seis helpers internos perigosos recusam execução por `anon` e
  `authenticated`; proprietário/backend conservam as chamadas internas.
- Funções privilegiadas acessíveis: anônimo **50 → 7**, autenticado **62 → 18**.
  As restantes são as assinaturas explícitas do guia. Administração continua
  condicionada a papel no banco, sessão válida, MFA quando cadastrado e auditoria.
- Novos objetos da aplicação exigem concessão explícita; a suíte comprovou
  recusa por padrão. Sessões banidas, excluídas, não confirmadas, encerradas,
  expiradas ou de outro usuário são recusadas.
- `btree_gist` agora fica em `extensions`; a restrição de sobreposição segue
  funcional. Código, dados e execução interna do marketplace foram preservados.
- `/painel` e filhos redirecionam para `/conta`; perfis antigos de profissionais
  voltam ao guia. `/admin` permanece como painel atual.
- Inventário final: zero empresas, duas contas administrativas válidas e zero
  contas técnicas remanescentes. Conteúdo comercial fictício não foi publicado.

## Validação executada

Typecheck, lint (0 erros/37 avisos herdados), formatação, **89 unitários**, build
normal e CI da main aprovados. No Windows foi necessário normalizar localmente
os finais de linha de três scripts; `git diff` e o índice confirmaram conteúdo
idêntico ao commit publicado. A verificação por streaming conferiu 228 arquivos,
sem credenciais privadas, backend local ou modo laboratório no pacote.

Antes da liberação passaram nove suítes SQL e a integração do cadastro nas duas
ordens de migrations. Após aplicação passaram as **cinco suítes SQL atuais**,
sempre com fixtures e rollback. Os quatro contratos históricos de acesso à API
antiga foram substituídos pelos testes de recusa e preservação interna.

Auth real após as mudanças: três ciclos de login/logout/retorno, JWT de sessão
encerrada recusado, promoção por metadados impedida, TOTP verificado/AAL2 e
recusa administrativa com apenas senha quando há fator cadastrado. A conta
marcada para o teste foi removida; nenhum e-mail foi enviado.

HTTP real: busca pública 200; dados pessoais/auditoria/admin sem login 401;
JWT falsificado 401; schema privado 406. No site publicado: home, admin e
recuperação 200; `/previa` 404; quatro rotas antigas 307 para os destinos atuais;
cadastro informa mínimo de 12. CSP com nonce não controlável pelo solicitante
e `no-store` nas rotas privadas foram conferidos.

Os advisors passaram de **114 para 26 avisos, sem erros**: sete funções
privilegiadas anônimas e dezoito autenticadas intencionalmente expostas, com
autorização interna testada, e um aviso de proteção contra senha vazada.
O aviso genérico de função privilegiada não demonstra, sozinho, uma brecha.

Evidência estruturada sem segredos:
`evidencias/publicacao-seguranca-2026-10-17.json`. O inventário anterior e os
ensaios candidatos continuam em `AUDITORIA-RLS-2026-10-17.md` e sua evidência.
Commits posteriores somente de documentação não alteram a fonte do Worker.

## Pendências operacionais

As duas contas administrativas ainda estão **sem MFA verificado**. Cada titular
deve cadastrar seu autenticador em `/admin?area=security`; o teste descartável
não ativa proteção nas contas reais. Confirmação de novos e-mails continua
automática e não há SMTP próprio com entrega validada. CAPTCHA permanece
desligado; exige integração do desafio antes de ser ativado. A proteção HIBP
permanece desativada e nenhum plano pago foi contratado. Limites e plano dessas
etapas estão no relatório de auditoria.

Esta liberação fecha os acessos encontrados; não constitui investigação forense
de invasões históricas nem garantia de sistema impenetrável ou disponibilidade
permanente. O formulário do PR #3 ainda tem o teste do seletor de arquivos do
Chrome pendente e não foi publicado.
